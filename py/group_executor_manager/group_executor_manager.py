"""
组执行管理器 - ComfyUI节点
基于官方文档的标准格式实现
"""

import json
import time
import uuid
import hashlib
import gc
import os
from typing import Dict, Any, List

# 导入日志系统
from ..utils.logger import get_logger

# 导入全局执行协调器
from .execution_coordinator import get_coordinator

# 初始化logger
logger = get_logger(__name__)

# 导入内存清理相关模块
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("torch不可用，显存清理功能将被禁用")

# 导入内存信息获取模块
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logger.warning("psutil不可用，系统内存信息功能将被禁用")

try:
    import comfy.model_management as mm
    COMFY_MM_AVAILABLE = True
except ImportError:
    COMFY_MM_AVAILABLE = False
    logger.warning("comfy.model_management不可用，激进模式清理将被禁用")

# 导入采样器识别功能（已从 metadata_collector 迁移到 utils.config）
try:
    from ..utils.config import is_sampler_node
    SAMPLER_CHECK_AVAILABLE = True
except ImportError:
    SAMPLER_CHECK_AVAILABLE = False
    logger.warning("utils.config不可用，采样器组检测将被禁用")

    # 提供一个fallback实现
    def is_sampler_node(class_type):
        """Fallback: 简单的采样器节点判断"""
        return "sampler" in class_type.lower() or "ksampler" in class_type.lower()


class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回False（不相等）"""
    def __ne__(self, __value: object) -> bool:
        return False


any_typ = AnyType("*")


# ✅ 全局配置存储（前后端交互的枢纽）
_group_executor_config = {
    "groups": [],
    "last_update": 0,
    "last_workflow_groups": []  # 追踪工作流中的groups
}

def get_group_config():
    """获取当前保存的组配置"""
    return _group_executor_config.get("groups", [])

def set_group_config(groups):
    """保存组配置"""
    global _group_executor_config
    _group_executor_config["groups"] = groups
    _group_executor_config["last_update"] = time.time()
    logger.info(f"\n[GroupExecutorManager] ✅ 配置已更新: {len(groups)} 个组")
    for i, group in enumerate(groups, 1):
        logger.debug(f"   {i}. {group.get('group_name', '未命名')}")


class GroupExecutorManager:
    """Basic Group Executor Manager"""

    @classmethod
    def INPUT_TYPES(cls):
        """定义输入参数类型 - 纯自定义UI版本"""
        return {
            "required": {},
            "optional": {},
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("execution_data",)
    FUNCTION = "create_execution_plan"
    CATEGORY = "danbooru"
    DESCRIPTION = "组执行管理器，用于管理和控制节点组的执行顺序和缓存策略"
    OUTPUT_IS_LIST = (False,)
    OUTPUT_NODE = True

    @classmethod
    def VALIDATE_INPUTS(cls, input_types):
        """跳过wildcard类型的后端验证"""
        return True

    @classmethod
    def IS_CHANGED(cls, **kwargs) -> str:
        """
        基于配置内容检测 - 只有配置改变时才重新执行

        关键修复：
        1. 使用配置内容的哈希而非时间戳，避免清空依赖节点（如checkpoint加载器）的缓存
        2. 只有当用户修改组配置时，IS_CHANGED才返回不同的值
        3. 这样可以保持checkpoint加载器等节点的缓存，避免每次执行都重新加载模型（8秒）
        """
        # 获取当前配置
        config_data = get_group_config()

        # 基于配置内容生成哈希
        # 将配置序列化为稳定的字符串（sorted确保顺序一致）
        config_str = json.dumps(config_data, sort_keys=True, ensure_ascii=False)
        config_hash = hashlib.md5(config_str.encode()).hexdigest()

        return config_hash

    def create_execution_plan(self, unique_id=None):
        """
        创建执行计划

        Args:
            unique_id: 节点的唯一ID

        Returns:
            tuple: (execution_data,) - 包含执行计划和缓存控制信号的JSON字符串
        """
        try:
            logger.debug(f"\n{'='*80}")
            logger.debug(f"🎯 create_execution_plan 被调用")
            logger.debug(f"{'='*80}")
            logger.debug(f"\n[GroupExecutorManager] 🎯 开始生成执行计划")
            logger.debug(f"📍 节点ID: {unique_id}")

            # ✅ 从全局配置中读取配置
            config_data = get_group_config()
            logger.debug(f"[GroupExecutorManager] 📦 从全局配置读取: {len(config_data)} 个组")

            # 🔍 DEBUG: 详细输出每个组的配置
            for i, group in enumerate(config_data, 1):
                logger.debug(f"📦 组 {i}: {group.get('group_name', '未命名')}")
                cleanup_cfg = group.get('cleanup_config')
                if cleanup_cfg:
                    logger.debug(f"  - clear_vram: {cleanup_cfg.get('clear_vram')}")
                    logger.debug(f"  - clear_ram: {cleanup_cfg.get('clear_ram')}")
                    logger.debug(f"  - aggressive_mode: {cleanup_cfg.get('aggressive_mode')}")
                    logger.debug(f"  - delay_seconds: {cleanup_cfg.get('delay_seconds')}")

            # ✅ 新增：检测配置是否为空，如果为空则返回禁用状态
            if not config_data or len(config_data) == 0:
                logger.warning(f"⚠️  配置为空，返回禁用状态")
                disabled_data = {
                    "execution_plan": {
                        "disabled": True,
                        "disabled_reason": "empty_groups",
                        "message": "组执行管理器配置为空，已自动禁用",
                        "groups": [],
                        "execution_id": f"disabled_{int(time.time())}_{uuid.uuid4().hex[:8]}",
                        "execution_mode": "sequential",
                        "cache_control_mode": "conditional",
                        "client_id": None,
                        "cache_enabled": False,
                        "debug_mode": False
                    },
                    "cache_control_signal": {
                        "execution_id": f"disabled_{int(time.time())}_{uuid.uuid4().hex[:8]}",
                        "enabled": False,
                        "timestamp": time.time(),
                        "enable_cache": False,
                        "cache_key": "disabled",
                        "clear_cache": False,
                        "cache_control_mode": "conditional",
                        "disabled": True,
                        "disabled_reason": "empty_groups"
                    }
                }
                logger.info(f"🚫 已禁用组执行功能（原因：配置为空）\n")
                return (json.dumps(disabled_data, ensure_ascii=False),)

            # ✅ 有有效配置，继续生成执行计划
            logger.info(f"✅ 使用用户配置的组")

            # 固定配置值（内部使用）
            execution_mode = "sequential"  # 顺序执行: sequential, 并行执行: parallel
            cache_control_mode = "conditional"  # 条件缓存: conditional, 总是允许: always_allow, 等待许可: block_until_allowed
            enable_cache = True
            debug_mode = False

            # ✅ 使用GlobalExecutionCoordinator生成稳定的execution_id
            coordinator = get_coordinator()
            execution_id, config_hash = coordinator.generate_stable_execution_id(config_data)
            logger.info(f"✅ 生成稳定execution_id: {execution_id}")
            logger.info(f"✅ 配置哈希: {config_hash[:16]}...")
            
            # ✅ 检测重复请求
            is_duplicate, reason = coordinator.is_duplicate_request(config_hash, execution_id)
            if is_duplicate:
                logger.warning(f"🚫 检测到重复请求，拒绝执行")
                logger.warning(f"   原因: {reason}")
                
                # 返回拒绝执行的响应
                rejected_data = {
                    "execution_plan": {
                        "disabled": True,
                        "disabled_reason": "duplicate_request",
                        "message": f"重复请求已被拒绝: {reason}",
                        "groups": [],
                        "execution_id": execution_id,
                        "execution_mode": "sequential",
                        "cache_control_mode": "conditional",
                        "client_id": None,
                        "cache_enabled": False,
                        "debug_mode": False
                    },
                    "cache_control_signal": {
                        "execution_id": execution_id,
                        "enabled": False,
                        "timestamp": time.time(),
                        "enable_cache": False,
                        "cache_key": "rejected",
                        "clear_cache": False,
                        "cache_control_mode": "conditional",
                        "disabled": True,
                        "disabled_reason": "duplicate_request"
                    }
                }
                return (json.dumps(rejected_data, ensure_ascii=False),)
            
            # ✅ 尝试获取执行权限
            if not coordinator.acquire_execution_permission(execution_id, config_hash):
                logger.warning(f"🚫 无法获取执行权限")
                
                # 返回无权限的响应
                no_permission_data = {
                    "execution_plan": {
                        "disabled": True,
                        "disabled_reason": "no_permission",
                        "message": "无法获取执行权限，可能有其他执行正在进行",
                        "groups": [],
                        "execution_id": execution_id,
                        "execution_mode": "sequential",
                        "cache_control_mode": "conditional",
                        "client_id": None,
                        "cache_enabled": False,
                        "debug_mode": False
                    },
                    "cache_control_signal": {
                        "execution_id": execution_id,
                        "enabled": False,
                        "timestamp": time.time(),
                        "enable_cache": False,
                        "cache_key": "no_permission",
                        "clear_cache": False,
                        "cache_control_mode": "conditional",
                        "disabled": True,
                        "disabled_reason": "no_permission"
                    }
                }
                return (json.dumps(no_permission_data, ensure_ascii=False),)

            # 创建执行计划 - 包含验证器需要的所有字段
            execution_plan = {
                "groups": config_data,
                "execution_mode": execution_mode,  # ✅ 修复：改为 execution_mode
                "cache_control_mode": cache_control_mode,  # ✅ 修复：添加 cache_control_mode
                "execution_id": execution_id,  # ✅ 修复：生成唯一ID
                "client_id": None,  # ✅ 修复：由GroupExecutorTrigger后端填充真实值
                "cache_enabled": enable_cache,
                "debug_mode": debug_mode
            }

            # 创建缓存控制信号
            cache_signal = {
                "execution_id": execution_id,  # ✅ 添加execution_id用于匹配验证
                "enabled": True,  # ✅ 权限检查需要此字段，表示允许执行
                "timestamp": time.time(),  # ✅ 添加时间戳，防止超时检查失败
                "enable_cache": enable_cache,
                "cache_key": f"group_executor_{execution_mode}_{hash(str(config_data))}",
                "clear_cache": not enable_cache,
                "cache_control_mode": cache_control_mode  # ✅ 添加缓存控制模式
            }

            # 📋 详细调试日志：显示生成的执行计划
            logger.debug(f"\n[GroupExecutorManager] 📋 生成执行计划详情:")
            logger.debug(f"   执行ID: {execution_id}")
            logger.debug(f"   组数量: {len(config_data)}")
            logger.debug(f"   执行模式: {execution_mode}")
            logger.debug(f"   缓存模式: {cache_control_mode}")
            logger.debug(f"   ")

            for i, group in enumerate(config_data, 1):
                group_name = group.get('group_name', f'未命名组{i}')
                logger.debug(f"   ├─ 组{i}: {group_name}")

            logger.info(f"\n[GroupExecutorManager] ✅ 执行计划生成完成\n")

            # ✅ 合并为单个execution_data输出
            execution_data = {
                "execution_plan": execution_plan,
                "cache_control_signal": cache_signal
            }
            execution_data_json = json.dumps(execution_data, ensure_ascii=False)

            # 📤 输出日志：显示将要发送给GroupExecutorTrigger的内容
            logger.debug(f"📤 输出内容:")
            logger.debug(f"   └─ execution_data (STRING):")
            logger.debug(f"      {execution_data_json[:200]}...")
            logger.debug(f"")

            return (execution_data_json,)

        except Exception as e:
            error_msg = f"GroupExecutorManager 执行错误: {str(e)}"
            logger.error(f"\n[GroupExecutorManager] ❌ {error_msg}\n")
            import traceback
            traceback.print_exc()

            # 返回错误信息
            error_data = {
                "execution_plan": {"error": error_msg, "execution_id": "error", "groups": []},
                "cache_control_signal": {"clear_cache": True, "error": True}
            }

            return (json.dumps(error_data, ensure_ascii=False),)

# 节点映射 - 用于ComfyUI注册
NODE_CLASS_MAPPINGS = {
    "GroupExecutorManager": GroupExecutorManager,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupExecutorManager": "组执行管理器 (Group Executor Manager)",
}

# ✅ 添加API端点 - 用于前后端配置同步
try:
    from server import PromptServer
    from aiohttp import web
    
    routes = PromptServer.instance.routes
    
    # ✅ 新增：释放执行权限的API端点
    @routes.post('/danbooru_gallery/group_executor/release_permission')
    async def release_execution_permission(request):
        """释放执行权限"""
        try:
            data = await request.json()
            execution_id = data.get('execution_id')
            status = data.get('status', 'completed')
            
            if not execution_id:
                return web.json_response({
                    "status": "error",
                    "message": "execution_id is required"
                }, status=400)
            
            # 释放执行权限
            coordinator = get_coordinator()
            coordinator.release_execution_permission(execution_id, status)
            
            logger.info(f"[API] ✅ 释放执行权限: {execution_id} (状态: {status})")
            
            return web.json_response({
                "status": "success",
                "execution_id": execution_id
            })
        except Exception as e:
            logger.error(f"[API] ❌ 释放执行权限失败: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    # ✅ 新增：统计信息的API端点
    @routes.get('/danbooru_gallery/group_executor/stats')
    async def get_execution_stats(request):
        """获取执行统计信息"""
        try:
            coordinator = get_coordinator()
            stats = coordinator.get_stats()
            
            # 添加额外的运行时信息
            import time
            current_execution = None
            if stats.get('current_execution'):
                exec_id = stats['current_execution']
                exec_status = coordinator.get_execution_status(exec_id)
                if exec_status:
                    # 获取执行历史信息
                    with coordinator.history_lock:
                        entry = coordinator.execution_history.get(exec_id)
                        if entry:
                            current_execution = {
                                "execution_id": exec_id,
                                "status": entry.status,
                                "started_at": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(entry.timestamp)),
                                "elapsed_seconds": int(time.time() - entry.timestamp)
                            }
            
            result = {
                "status": "success",
                "stats": {
                    "total_executions": stats.get('total_executions', 0),
                    "current_execution_id": stats.get('current_execution'),
                    "status_counts": stats.get('status_counts', {}),
                    "uptime_seconds": int(time.time() - _group_executor_config.get('last_update', time.time()))
                },
                "current_execution": current_execution
            }
            
            logger.debug(f"[API] 📊 统计信息: {result['stats']}")
            
            return web.json_response(result)
        except Exception as e:
            logger.error(f"[API] ❌ 获取统计信息失败: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    # ✅ 新增：强制释放所有锁的API端点
    @routes.post('/danbooru_gallery/group_executor/force_release_all')
    async def force_release_all_locks(request):
        """强制释放所有锁（紧急恢复）"""
        try:
            coordinator = get_coordinator()
            coordinator.force_release_all()
            
            logger.warning(f"[API] ⚠️ 强制释放所有锁")
            
            return web.json_response({
                "status": "success",
                "message": "已强制释放所有锁"
            })
        except Exception as e:
            logger.error(f"[API] ❌ 强制释放失败: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    @routes.post('/danbooru_gallery/group_config/save')
    async def save_group_config(request):
        """保存前端传入的组配置"""
        try:
            data = await request.json()
            groups = data.get('groups', [])

            logger.debug(f"\n[GroupExecutorManager API] 🔍 ========== 收到配置保存请求 ==========")
            logger.debug(f"[GroupExecutorManager API] 📦 组数量: {len(groups)}")

            # 🔍 DEBUG: 详细输出每个组的配置
            for i, group in enumerate(groups, 1):
                logger.debug(f"📦 组 {i}: {group.get('group_name', '未命名')}")
                cleanup_cfg = group.get('cleanup_config')
                if cleanup_cfg:
                    logger.debug(f"  - clear_vram: {cleanup_cfg.get('clear_vram')}")
                    logger.debug(f"  - clear_ram: {cleanup_cfg.get('clear_ram')}")
                    logger.debug(f"  - aggressive_mode: {cleanup_cfg.get('aggressive_mode')}")
                    logger.debug(f"  - delay_seconds: {cleanup_cfg.get('delay_seconds')}")

            # 保存到全局配置
            set_group_config(groups)

            logger.info(f"✅ 配置已保存到全局存储")
            logger.debug(f"========================================\n")

            return web.json_response({
                "status": "success",
                "message": f"已保存 {len(groups)} 个组的配置"
            })
        except Exception as e:
            error_msg = f"[GroupExecutorManager API] ❌ 保存配置错误: {str(e)}"
            logger.debug(error_msg)
            logger.debug(f"========================================\n")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    @routes.get('/danbooru_gallery/group_config/load')
    async def load_group_config(request):
        """获取已保存的组配置"""
        try:
            groups = get_group_config()
            logger.info(f"\n[GroupExecutorManager API] 📤 返回已保存的配置: {len(groups)} 个组")
            
            return web.json_response({
                "status": "success",
                "groups": groups,
                "last_update": _group_executor_config.get("last_update", 0)
            })
        except Exception as e:
            error_msg = f"[GroupExecutorManager API] 读取配置错误: {str(e)}"
            logger.error(error_msg)
            import traceback
            logger.debug(traceback.format_exc())
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/group_executor/cleanup')
    async def perform_cleanup(request):
        """执行内存/显存清理"""
        try:
            # 读取请求数据
            data = await request.json()

            group_name = data.get('group_name', 'unknown')
            clear_vram = data.get('clear_vram', False)
            clear_ram = data.get('clear_ram', False)
            unload_models = data.get('unload_models', False)
            retry_times = data.get('retry_times', 1)  # ✅ 新增：重试次数配置（默认1次，不重试）

            # 限制重试次数范围
            retry_times = max(1, min(retry_times, 5))  # 最少1次，最多5次

            # 检查是否实际需要清理
            if not clear_vram and not clear_ram and not unload_models:
                logger.error(f"⏭️ 跳过清理（组: {group_name}）：所有选项均已禁用")
                return web.json_response({
                    "status": "skipped",
                    "message": "跳过清理：未启用任何选项",
                    "results": {
                        "group_name": group_name,
                        "vram_cleaned": False,
                        "ram_cleaned": False,
                        "models_unloaded": False
                    }
                })

            # ✅ 记录开始时间（用于计算总用时）
            import time
            import asyncio
            start_time = time.time()

            results = {
                "group_name": group_name,
                "vram_cleaned": False,
                "ram_cleaned": False,
                "models_unloaded": False
            }

            # ✅ 新增：重试机制
            last_error = None
            for attempt in range(retry_times):
                try:
                    if retry_times > 1:
                        logger.debug(f"[清理 API] 🔄 第 {attempt + 1}/{retry_times} 次尝试清理...")

                    # ====== 步骤1：执行清理 ======
                    # 执行VRAM清理和模型卸载
                    if clear_vram or unload_models:
                        logger.debug(f"🔧 正在执行显存清理...")
                        cleanup_vram(clear_cache=clear_vram, unload_models=unload_models)
                        results["vram_cleaned"] = clear_vram
                        results["models_unloaded"] = unload_models

                    # 执行RAM清理
                    # ⚠️ 重要：如果卸载了模型，即使没勾选"清理内存"也要执行激进垃圾回收
                    # 这样确保模型对象从Python内存中完全释放
                    if clear_ram or unload_models:
                        logger.debug(f"🔧 正在执行内存清理...")
                        # ✅ 智能启用激进清理：当同时清理内存和卸载模型时，启用系统级清理
                        aggressive_cleanup = clear_ram and unload_models
                        cleanup_ram(aggressive_cleanup=aggressive_cleanup, unload_models=unload_models)
                        # 只有明确勾选了清理内存才标记为已清理
                        if clear_ram:
                            results["ram_cleaned"] = True

                    # ====== 步骤2：等待清理完全结束 ======
                    logger.debug(f"⏳ 等待清理完全结束...")
                    wait_for_cleanup_complete(max_wait_seconds=5.0, required_stable_count=3)

                    # ✅ 成功完成，跳出重试循环
                    if retry_times > 1:
                        logger.debug(f"[清理 API] ✅ 第 {attempt + 1} 次尝试成功")
                    break

                except Exception as e:
                    last_error = e
                    if attempt < retry_times - 1:
                        logger.warning(f"[清理 API] ⚠️ 第 {attempt + 1} 次清理失败，1秒后重试: {e}")
                        await asyncio.sleep(1)
                    else:
                        logger.error(f"[清理 API] ❌ 所有 {retry_times} 次重试均失败: {e}")
                        raise

            # ====== 步骤3：延迟等待（实现前端配置） ======
            delay_seconds = data.get('delay_seconds', 0)
            if delay_seconds > 0:
                logger.error(f"⏳ 延迟 {delay_seconds} 秒，确保完全清理...")
                await asyncio.sleep(delay_seconds)
                logger.error(f"✅ 延迟结束，可以执行下一组")

            # ====== 步骤4：总结清理结果 ======
            elapsed_time = time.time() - start_time

            # ✅ 简化的清理摘要（只显示操作列表和总用时，释放量已在底层函数显示）
            operations = []
            if results['vram_cleaned']:
                operations.append("清理显存缓存")
            if results['ram_cleaned']:
                operations.append("清理内存")
            if results['models_unloaded']:
                operations.append("卸载模型")

            logger.error(f"🧹 内存清理完成 - 组: {group_name}")
            logger.error(f"  📋 执行操作: {' | '.join(operations) if operations else '无'}")
            logger.error(f"  ⏱️ 总用时: {elapsed_time:.2f}s")

            return web.json_response({
                "status": "success",
                "results": results
            })

        except Exception as e:
            error_msg = f"[清理 API] ❌ 异常: {str(e)}"
            logger.error(error_msg)
            logger.debug(f"========================================\n")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

except ImportError as e:
    logger.warning(f"无法导入PromptServer或web模块，API端点将不可用: {e}")


# ==================== 内存显存清理功能 ====================

def get_memory_info():
    """
    获取当前内存和显存使用情况

    Returns:
        dict: 包含内存和显存信息的字典
    """
    info = {
        "vram": {},
        "ram": {}
    }

    # 获取显存信息
    if TORCH_AVAILABLE and torch.cuda.is_available():
        try:
            # 获取所有GPU的信息
            for i in range(torch.cuda.device_count()):
                device = f"cuda:{i}"
                allocated = torch.cuda.memory_allocated(i)
                reserved = torch.cuda.memory_reserved(i)
                total = torch.cuda.get_device_properties(i).total_memory

                info["vram"][device] = {
                    "allocated": allocated,
                    "allocated_mb": allocated / (1024 ** 2),
                    "reserved": reserved,
                    "reserved_mb": reserved / (1024 ** 2),
                    "total": total,
                    "total_mb": total / (1024 ** 2),
                    "free_mb": (total - reserved) / (1024 ** 2)
                }
        except Exception as e:
            logger.debug(f"获取显存信息失败: {e}")
            info["vram"]["error"] = str(e)
    else:
        info["vram"]["available"] = False

    # 获取系统内存信息
    if PSUTIL_AVAILABLE:
        try:
            # 系统总内存
            vm = psutil.virtual_memory()
            info["ram"]["system"] = {
                "total": vm.total,
                "total_mb": vm.total / (1024 ** 2),
                "available": vm.available,
                "available_mb": vm.available / (1024 ** 2),
                "used": vm.used,
                "used_mb": vm.used / (1024 ** 2),
                "percent": vm.percent
            }

            # 当前进程内存
            process = psutil.Process(os.getpid())
            mem_info = process.memory_info()
            info["ram"]["process"] = {
                "rss": mem_info.rss,
                "rss_mb": mem_info.rss / (1024 ** 2),
                "vms": mem_info.vms,
                "vms_mb": mem_info.vms / (1024 ** 2)
            }
        except Exception as e:
            logger.debug(f"获取内存信息失败: {e}")
            info["ram"]["error"] = str(e)
    else:
        info["ram"]["available"] = False

    return info


def format_memory_comparison(before, after, label="内存"):
    """
    格式化内存对比信息

    Args:
        before: 清理前的信息
        after: 清理后的信息
        label: 标签（内存/显存）

    Returns:
        str: 格式化的对比字符串
    """
    lines = []

    if not before or not after:
        return f"{label}: 无对比数据"

    # 计算差异
    if "mb" in before and "mb" in after:
        before_mb = before["mb"]
        after_mb = after["mb"]
        diff_mb = before_mb - after_mb
        diff_percent = (diff_mb / before_mb * 100) if before_mb > 0 else 0

        lines.append(f"{label}:")
        lines.append(f"  清理前: {before_mb:.2f} MB")
        lines.append(f"  清理后: {after_mb:.2f} MB")
        lines.append(f"  释放量: {diff_mb:.2f} MB ({diff_percent:.1f}%)")

    return "\n".join(lines)


def cleanup_vram(clear_cache=True, unload_models=False):
    """
    清理显存（GPU VRAM）

    Args:
        clear_cache: 是否清理显存缓存
        unload_models: 是否卸载所有模型
    """
    if not TORCH_AVAILABLE:
        logger.warning("⚠️ 跳过：torch 模块不可用")
        return

    try:
        if torch.cuda.is_available():
            # ✅ 新增：同步 CUDA 操作（确保异步操作完成）
            logger.debug("[VRAM清理] 🔧 执行 torch.cuda.synchronize()")
            torch.cuda.synchronize()
            logger.debug("[VRAM清理] ✅ CUDA 操作已同步")

            # 收集清理前的显存使用情况
            initial_memory = torch.cuda.memory_allocated()
            initial_memory_mb = initial_memory / (1024 ** 2)

            # 卸载模型（如果启用）
            if unload_models and COMFY_MM_AVAILABLE:
                logger.debug("[VRAM清理] 🔧 执行 mm.unload_all_models()")
                mm.unload_all_models()
                logger.error("[VRAM清理] ✅ 模型已卸载")
                logger.debug("[VRAM清理] 🔧 执行 mm.soft_empty_cache()")
                mm.soft_empty_cache()
            elif unload_models and not COMFY_MM_AVAILABLE:
                logger.warning("[VRAM清理] ⚠️ 模型卸载不可用（comfy.model_management 不可用）")

            # 清理显存缓存（如果启用）
            if clear_cache:
                if COMFY_MM_AVAILABLE:
                    logger.debug("[VRAM清理] 🔧 执行 mm.soft_empty_cache()")
                    mm.soft_empty_cache()

                logger.debug("[VRAM清理] 🔧 执行 torch.cuda.empty_cache()")
                torch.cuda.empty_cache()
                logger.debug("[VRAM清理] 🔧 执行 torch.cuda.ipc_collect()")
                torch.cuda.ipc_collect()
                logger.error("[VRAM清理] ✅ 显存缓存已清理")

            # 收集清理后的显存使用情况
            final_memory = torch.cuda.memory_allocated()
            final_memory_mb = final_memory / (1024 ** 2)
            memory_freed = initial_memory - final_memory
            memory_freed_mb = memory_freed / (1024 ** 2)

            # 打印简洁的统计
            logger.error(f"[VRAM清理] 📊 清理完成: {initial_memory_mb:.2f} MB → {final_memory_mb:.2f} MB (释放 {memory_freed_mb:.2f} MB)")
        else:
            logger.warning("⚠️ 跳过：CUDA 不可用")
    except Exception as e:
        logger.error(f"❌ 显存清理失败: {e}")


def cleanup_ram(aggressive_cleanup=False, unload_models=False):
    """
    清理系统内存（RAM）

    Args:
        aggressive_cleanup: 是否启用激进清理（系统级清理）
        unload_models: 是否卸载了模型（需要更激进的垃圾回收）
    """
    import os
    import time

    try:
        # 收集清理前的内存使用情况
        initial_memory = None
        if PSUTIL_AVAILABLE:
            initial_memory = psutil.virtual_memory().percent
            logger.debug(f"[RAM清理] 初始内存使用: {initial_memory:.2f}%")

        # 第一阶段：垃圾回收
        # 如果卸载了模型，执行更激进的垃圾回收（多轮回收确保模型对象被释放）
        if unload_models:
            logger.debug("[RAM清理] ♻️  执行激进垃圾回收（卸载模型后）...")
            total_collected = 0
            # 执行3轮垃圾回收，确保循环引用的模型对象被完全释放
            for i in range(3):
                collected = gc.collect(generation=2)  # 完整的垃圾回收
                total_collected += collected
                logger.debug(f"[RAM清理] 第{i+1}轮回收: {collected} 个对象")
            logger.error(f"[RAM清理] ✅ 激进垃圾回收完成（共回收 {total_collected} 个对象，确保模型从内存释放）")
        else:
            logger.debug("[RAM清理] ♻️  执行垃圾回收...")
            collected = gc.collect()
            logger.error(f"[RAM清理] ✅ 垃圾回收完成（回收了 {collected} 个对象）")

        # 第二阶段：激进清理的系统级操作
        if aggressive_cleanup:
            logger.debug("[RAM清理] 🚀 执行系统级清理")

            if os.name == 'nt':  # Windows
                try:
                    import ctypes
                    from ctypes import wintypes

                    # ✅ 步骤1：清理系统文件缓存（Memory_Cleanup 技术）
                    try:
                        logger.debug("[RAM清理] 🧹 清理系统文件缓存...")
                        ctypes.windll.kernel32.SetSystemFileCacheSize(
                            wintypes.ULONG(-1),  # MinimumFileCacheSize
                            wintypes.ULONG(-1),  # MaximumFileCacheSize
                            wintypes.ULONG(0)    # Flags
                        )
                        logger.debug("[RAM清理] ✅ 系统文件缓存已清理")
                    except Exception as e:
                        logger.warning(f"[RAM清理] ⚠️ 系统文件缓存清理失败: {e}")

                    # ✅ 步骤2：清理DLL（Memory_Cleanup 技术）
                    try:
                        logger.debug("[RAM清理] 🧹 清理未使用的DLL...")
                        ctypes.windll.kernel32.SetProcessWorkingSetSize(
                            wintypes.HANDLE(-1),  # hProcess (当前进程)
                            wintypes.ULONG(-1),   # dwMinimumWorkingSetSize
                            wintypes.ULONG(-1)    # dwMaximumWorkingSetSize
                        )
                        logger.debug("[RAM清理] ✅ DLL已清理")
                    except Exception as e:
                        logger.warning(f"[RAM清理] ⚠️ DLL清理失败: {e}")

                    # ✅ 步骤3：清理当前进程工作集（原有功能）
                    try:
                        logger.debug("[RAM清理] 🧹 清理进程工作集...")
                        ctypes.windll.psapi.EmptyWorkingSet(
                            ctypes.windll.kernel32.GetCurrentProcess()
                        )
                        logger.debug("[RAM清理] ✅ 工作集已清理")
                    except Exception as e:
                        logger.warning(f"[RAM清理] ⚠️ 工作集清理失败: {e}")

                    logger.error("[RAM清理] 🎉 Windows 系统级清理完成（文件缓存 + DLL + 工作集）")

                except Exception as e:
                    logger.warning(f"[RAM清理] ⚠️ Windows 系统级清理失败: {e}")

            elif os.name == 'posix':  # Linux/Unix
                try:
                    logger.debug("[RAM清理] Linux系统缓存清理...")
                    # 同步文件系统缓冲区
                    os.system('sync')
                    # 清除页缓存、目录项和inode（需要root权限）
                    with open('/proc/sys/vm/drop_caches', 'w') as f:
                        f.write('3')
                    logger.debug("[RAM清理] 系统缓存已清理")
                except PermissionError:
                    logger.warning("[RAM清理] ⚠️ Linux 缓存清理需要 root 权限")
                except Exception as e:
                    logger.warning(f"[RAM清理] ⚠️ Linux 系统缓存清理失败: {e}")
            else:
                logger.debug(f"[RAM清理] ⚠️ 不支持的操作系统: {os.name}")

        # 收集清理后的内存使用情况
        final_memory = None
        if PSUTIL_AVAILABLE:
            final_memory = psutil.virtual_memory().percent
            logger.debug(f"[RAM清理] 最终内存使用: {final_memory:.2f}%")

            if initial_memory is not None:
                memory_freed_percent = initial_memory - final_memory
                logger.error(f"[RAM清理] 📊 清理完成: {initial_memory:.2f}% → {final_memory:.2f}% (释放 {memory_freed_percent:.2f}%)")
        else:
            # 打印完成信息（无统计）
            mode_text = "激进清理" if aggressive_cleanup else "普通清理"
            logger.error(f"[RAM清理] ✅ 清理完成（{mode_text}）")

    except Exception as e:
        logger.error(f"❌ 内存清理失败: {e}")


def wait_for_cleanup_complete(max_wait_seconds=5.0, required_stable_count=3):
    """
    等待并验证清理完全完成（循环检测直到稳定）

    Args:
        max_wait_seconds: 最大等待时间（秒）
        required_stable_count: 需要连续稳定的次数

    Returns:
        bool: 检测到稳定状态返回True，超时返回False
    """
    import time

    logger.debug(f"⏳ [等待验证] 开始等待清理完全完成...")

    try:
        stable_count = 0
        last_vram = None
        last_ram = None
        threshold_vram = 1024 * 1024  # 1MB
        threshold_ram = 10 * 1024 * 1024  # 10MB

        start_time = time.time()
        check_interval = 0.2  # 每次检测间隔

        while time.time() - start_time < max_wait_seconds:
            # 收集当前内存信息
            current_vram = 0
            current_ram = 0

            # 检查显存
            if TORCH_AVAILABLE and torch.cuda.is_available():
                current_vram = torch.cuda.memory_allocated()

            # 检查系统内存
            if PSUTIL_AVAILABLE:
                current_ram = psutil.virtual_memory().used

            # 如果不是第一次检查，比较稳定性
            if last_vram is not None and last_ram is not None:
                vram_diff = abs(current_vram - last_vram)
                ram_diff = abs(current_ram - last_ram)

                # 判断是否稳定
                vram_stable = vram_diff < threshold_vram
                ram_stable = ram_diff < threshold_ram

                if vram_stable and ram_stable:
                    stable_count += 1
                    if stable_count >= required_stable_count:
                        logger.debug(f"✅ [等待验证] 内存已稳定（连续 {stable_count} 次检测稳定）")
                        return True
                else:
                    stable_count = 0  # 重置计数器
                    logger.debug(f"[等待验证] 内存仍在变化（VRAM: {vram_diff/(1024*1024):.2f}MB, RAM: {ram_diff/(1024*1024):.2f}MB）")

            # 保存当前值作为下次比较基准
            last_vram = current_vram
            last_ram = current_ram

            time.sleep(check_interval)

        # 超时未达到稳定状态
        logger.debug(f"⚠️ [等待验证] 超时未达到稳定状态（{max_wait_seconds}s），继续执行")
        return False

    except Exception as e:
        logger.warning(f"⚠️ [等待验证] 异常: {e}")
        return False  # 出错也允许继续


def has_next_sampler_group(current_index: int, groups: List[Dict], workflow: Dict) -> bool:
    """
    检测后续是否有包含采样器的组

    Args:
        current_index: 当前组的索引
        groups: 所有组的列表
        workflow: 工作流数据

    Returns:
        bool: 如果后续有采样器组返回True，否则返回False
    """
    if not SAMPLER_CHECK_AVAILABLE:
        logger.debug("跳过采样器组检测：metadata_collector不可用")
        return False

    try:
        # 遍历后续的组
        for i in range(current_index + 1, len(groups)):
            group = groups[i]
            group_name = group.get("group_name")

            if not group_name:
                continue

            # 获取工作流中该组的所有节点
            if "nodes" not in workflow:
                continue

            for node_id, node_data in workflow["nodes"].items():
                # 检查节点是否在该组中
                if node_data.get("group") != group_name:
                    continue

                # 检查是否是采样器节点
                class_type = node_data.get("class_type", "")
                if is_sampler_node(class_type):
                    logger.debug(f"[条件评估] 检测到后续采样器组: {group_name} (节点: {node_id}, 类型: {class_type})")
                    return True

        logger.debug("后续无采样器组")
        return False

    except Exception as e:
        logger.error(f"采样器组检测失败: {e}")
        return False


async def get_pcp_param_value(node_id: str, param_name: str) -> Any:
    """
    从参数控制面板获取参数值

    Args:
        node_id: 参数节点ID
        param_name: 参数名称

    Returns:
        参数值，如果获取失败返回None
    """
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            url = f"http://127.0.0.1:8188/danbooru_gallery/pcp/get_param_value"
            params = {"node_id": node_id, "param_name": param_name}

            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "success":
                        value = data.get("value")
                        logger.debug(f"获取PCP参数值: {node_id}.{param_name} = {value}")
                        return value

        logger.error(f"获取PCP参数值失败: {node_id}.{param_name}")
        return None

    except Exception as e:
        logger.debug(f"获取PCP参数值异常: {e}")
        return None


async def evaluate_condition(condition: Dict, current_index: int, groups: List[Dict], workflow: Dict) -> bool:
    """
    评估单个条件

    Args:
        condition: 条件配置字典
        current_index: 当前组索引
        groups: 所有组列表
        workflow: 工作流数据

    Returns:
        bool: 条件是否满足
    """
    try:
        condition_type = condition.get("type")
        expected_value = condition.get("value")

        if condition_type == "has_next_sampler_group":
            # 检测是否有下一个采样器组
            actual_value = has_next_sampler_group(current_index, groups, workflow)
            result = actual_value == expected_value
            logger.debug(f"has_next_sampler_group: {actual_value} == {expected_value} => {result}")
            return result

        elif condition_type == "pcp_param":
            # 检测参数控制面板的参数值
            node_id = condition.get("node_id")
            param_name = condition.get("param_name")

            if not node_id or not param_name:
                logger.debug(f"pcp_param条件缺少node_id或param_name")
                return False

            actual_value = await get_pcp_param_value(node_id, param_name)
            result = actual_value == expected_value
            logger.debug(f"pcp_param: {node_id}.{param_name} = {actual_value} == {expected_value} => {result}")
            return result

        else:
            logger.debug(f"未知的条件类型: {condition_type}")
            return False

    except Exception as e:
        logger.debug(f"条件评估异常: {e}")
        return False


async def check_aggressive_conditions(conditions: List[Dict], current_index: int, groups: List[Dict], workflow: Dict) -> bool:
    """
    检查激进模式条件（AND逻辑）

    Args:
        conditions: 条件列表
        current_index: 当前组索引
        groups: 所有组列表
        workflow: 工作流数据

    Returns:
        bool: 所有条件都满足返回True，否则返回False
    """
    if not conditions:
        logger.debug("无激进模式条件，默认不启用激进模式")
        return False

    try:
        logger.debug(f"[条件评估] 开始评估 {len(conditions)} 个激进模式条件")

        # 评估所有条件（AND逻辑）
        for i, condition in enumerate(conditions):
            result = await evaluate_condition(condition, current_index, groups, workflow)
            logger.debug(f"[条件评估] 条件 {i+1}/{len(conditions)}: {result}")

            if not result:
                logger.error(f"❌ 条件 {i+1} 不满足，激进模式不启用")
                return False

        logger.error("✅ 所有条件都满足，启用激进模式")
        return True

    except Exception as e:
        logger.debug(f"条件检查异常: {e}")
        return False