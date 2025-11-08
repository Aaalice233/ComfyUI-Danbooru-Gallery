"""
组执行管理器 - ComfyUI节点
基于官方文档的标准格式实现
"""

import json
import time
import uuid
import hashlib
import gc
from typing import Dict, Any, List

# 导入debug配置
from ..utils.debug_config import debug_print

# 导入内存清理相关模块
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    debug_print("group_executor_manager", "[GroupExecutorManager] 警告: torch不可用，显存清理功能将被禁用")

try:
    import comfy.model_management as mm
    COMFY_MM_AVAILABLE = True
except ImportError:
    COMFY_MM_AVAILABLE = False
    debug_print("group_executor_manager", "[GroupExecutorManager] 警告: comfy.model_management不可用，激进模式清理将被禁用")

# 导入采样器识别功能（已从 metadata_collector 迁移到 utils.config）
try:
    from ..utils.config import is_sampler_node
    SAMPLER_CHECK_AVAILABLE = True
except ImportError:
    SAMPLER_CHECK_AVAILABLE = False
    debug_print("group_executor_manager", "[GroupExecutorManager] 警告: utils.config不可用，采样器组检测将被禁用")

    # 提供一个fallback实现
    def is_sampler_node(class_type):
        """Fallback: 简单的采样器节点判断"""
        return "sampler" in class_type.lower() or "ksampler" in class_type.lower()

COMPONENT_NAME = "group_executor_manager"


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
    debug_print(COMPONENT_NAME, f"\n[GroupExecutorManager] ✅ 配置已更新: {len(groups)} 个组")
    for i, group in enumerate(groups, 1):
        debug_print(COMPONENT_NAME, f"   {i}. {group.get('group_name', '未命名')}")


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
            debug_print(COMPONENT_NAME, f"\n{'='*80}")
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager] 🎯 create_execution_plan 被调用")
            debug_print(COMPONENT_NAME, f"{'='*80}")
            debug_print(COMPONENT_NAME, f"\n[GroupExecutorManager] 🎯 开始生成执行计划")
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager] 📍 节点ID: {unique_id}")

            # ✅ 从全局配置中读取配置
            config_data = get_group_config()
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager] 📦 从全局配置读取: {len(config_data)} 个组")

            # 🔍 DEBUG: 详细输出每个组的配置
            for i, group in enumerate(config_data, 1):
                debug_print(COMPONENT_NAME, f"[GroupExecutorManager] 📦 组 {i}: {group.get('group_name', '未命名')}")
                cleanup_cfg = group.get('cleanup_config')
                if cleanup_cfg:
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager]   ✅ cleanup_config存在")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager]     clear_vram: {cleanup_cfg.get('clear_vram')}")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager]     clear_ram: {cleanup_cfg.get('clear_ram')}")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager]     aggressive_mode: {cleanup_cfg.get('aggressive_mode')}")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager]     delay_seconds: {cleanup_cfg.get('delay_seconds')}")
                else:
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager]   ❌ cleanup_config不存在或为None")

            # ✅ 新增：检测配置是否为空，如果为空则返回禁用状态
            if not config_data or len(config_data) == 0:
                debug_print(COMPONENT_NAME, f"[GroupExecutorManager] ⚠️  配置为空，返回禁用状态")
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
                debug_print(COMPONENT_NAME, f"[GroupExecutorManager] 🚫 已禁用组执行功能（原因：配置为空）\n")
                return (json.dumps(disabled_data, ensure_ascii=False),)

            # ✅ 有有效配置，继续生成执行计划
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager] ✅ 使用用户配置的组")

            # 固定配置值（内部使用）
            execution_mode = "sequential"  # 顺序执行: sequential, 并行执行: parallel
            cache_control_mode = "conditional"  # 条件缓存: conditional, 总是允许: always_allow, 等待许可: block_until_allowed
            enable_cache = True
            debug_mode = False

            # ✅ 每次执行都生成新的execution_id
            execution_id = f"exec_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager] ✅ 生成新的execution_id: {execution_id}")

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
            debug_print(COMPONENT_NAME, f"\n[GroupExecutorManager] 📋 生成执行计划详情:")
            debug_print(COMPONENT_NAME, f"   执行ID: {execution_id}")
            debug_print(COMPONENT_NAME, f"   组数量: {len(config_data)}")
            debug_print(COMPONENT_NAME, f"   执行模式: {execution_mode}")
            debug_print(COMPONENT_NAME, f"   缓存模式: {cache_control_mode}")
            debug_print(COMPONENT_NAME, f"   ")

            for i, group in enumerate(config_data, 1):
                group_name = group.get('group_name', f'未命名组{i}')
                debug_print(COMPONENT_NAME, f"   ├─ 组{i}: {group_name}")

            debug_print(COMPONENT_NAME, f"\n[GroupExecutorManager] ✅ 执行计划生成完成\n")

            # ✅ 合并为单个execution_data输出
            execution_data = {
                "execution_plan": execution_plan,
                "cache_control_signal": cache_signal
            }
            execution_data_json = json.dumps(execution_data, ensure_ascii=False)

            # 📤 输出日志：显示将要发送给GroupExecutorTrigger的内容
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager] 📤 输出内容:")
            debug_print(COMPONENT_NAME, f"   └─ execution_data (STRING):")
            debug_print(COMPONENT_NAME, f"      {execution_data_json[:200]}...")
            debug_print(COMPONENT_NAME, f"")

            return (execution_data_json,)

        except Exception as e:
            error_msg = f"GroupExecutorManager 执行错误: {str(e)}"
            debug_print(COMPONENT_NAME, f"\n[GroupExecutorManager] ❌ {error_msg}\n")
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
    
    @routes.post('/danbooru_gallery/group_config/save')
    async def save_group_config(request):
        """保存前端传入的组配置"""
        try:
            data = await request.json()
            groups = data.get('groups', [])

            debug_print(COMPONENT_NAME, f"\n[GroupExecutorManager API] 🔍 ========== 收到配置保存请求 ==========")
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager API] 📦 组数量: {len(groups)}")

            # 🔍 DEBUG: 详细输出每个组的配置
            for i, group in enumerate(groups, 1):
                debug_print(COMPONENT_NAME, f"[GroupExecutorManager API] 📦 组 {i}: {group.get('group_name', '未命名')}")
                cleanup_cfg = group.get('cleanup_config')
                if cleanup_cfg:
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager API]   ✅ cleanup_config存在:")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager API]     clear_vram: {cleanup_cfg.get('clear_vram')}")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager API]     clear_ram: {cleanup_cfg.get('clear_ram')}")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager API]     aggressive_mode: {cleanup_cfg.get('aggressive_mode')}")
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager API]     delay_seconds: {cleanup_cfg.get('delay_seconds')}")
                else:
                    debug_print(COMPONENT_NAME, f"[GroupExecutorManager API]   ❌ cleanup_config不存在或为None")

            # 保存到全局配置
            set_group_config(groups)

            debug_print(COMPONENT_NAME, f"[GroupExecutorManager API] ✅ 配置已保存到全局存储")
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager API] ========================================\n")

            return web.json_response({
                "status": "success",
                "message": f"已保存 {len(groups)} 个组的配置"
            })
        except Exception as e:
            error_msg = f"[GroupExecutorManager API] ❌ 保存配置错误: {str(e)}"
            debug_print(COMPONENT_NAME, error_msg)
            debug_print(COMPONENT_NAME, f"[GroupExecutorManager API] ========================================\n")
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
            debug_print(COMPONENT_NAME, f"\n[GroupExecutorManager API] 📤 返回已保存的配置: {len(groups)} 个组")
            
            return web.json_response({
                "status": "success",
                "groups": groups,
                "last_update": _group_executor_config.get("last_update", 0)
            })
        except Exception as e:
            error_msg = f"[GroupExecutorManager API] 读取配置错误: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/group_executor/cleanup')
    async def perform_cleanup(request):
        """执行内存/显存清理"""
        try:
            # 🔍 强制输出测试（绕过 debug_print）
            print(f"\n[清理 API 测试] ========== API 被调用 ==========", flush=True)

            # 读取请求数据
            data = await request.json()

            group_name = data.get('group_name', 'unknown')
            clear_vram = data.get('clear_vram', False)
            clear_ram = data.get('clear_ram', False)
            aggressive_mode = data.get('aggressive_mode', False)

            # 🔍 强制输出配置（绕过 debug_print）
            print(f"[清理 API 测试] 组名: {group_name}", flush=True)
            print(f"[清理 API 测试] VRAM清理: {clear_vram}, RAM清理: {clear_ram}, 激进模式: {aggressive_mode}", flush=True)

            # 清理开始通知
            debug_print(COMPONENT_NAME, f"\n[清理 API] 🚀 ========== 内存清理开始 ==========")
            debug_print(COMPONENT_NAME, f"[清理 API] 📍 组名: {group_name}")
            debug_print(COMPONENT_NAME, f"[清理 API] 📦 清理配置:")
            debug_print(COMPONENT_NAME, f"[清理 API]   - VRAM清理: {'✅ 启用' if clear_vram else '❌ 禁用'}")
            debug_print(COMPONENT_NAME, f"[清理 API]   - RAM清理: {'✅ 启用' if clear_ram else '❌ 禁用'}")
            debug_print(COMPONENT_NAME, f"[清理 API]   - 激进模式: {'✅ 启用' if aggressive_mode else '❌ 禁用'}")

            # 检查是否实际需要清理
            if not clear_vram and not clear_ram:
                debug_print(COMPONENT_NAME, f"[清理 API] ⏭️ 跳过清理：所有选项均已禁用")
                debug_print(COMPONENT_NAME, f"[清理 API] ========================================\n")
                return web.json_response({
                    "status": "skipped",
                    "message": "跳过清理：未启用任何选项",
                    "results": {
                        "group_name": group_name,
                        "vram_cleaned": False,
                        "ram_cleaned": False,
                        "aggressive_used": False
                    }
                })

            results = {
                "group_name": group_name,
                "vram_cleaned": False,
                "ram_cleaned": False,
                "aggressive_used": False
            }

            # 执行VRAM清理
            if clear_vram:
                debug_print(COMPONENT_NAME, f"[清理 API] 🔧 正在执行 VRAM 清理...")
                cleanup_vram()
                results["vram_cleaned"] = True
                debug_print(COMPONENT_NAME, f"[清理 API] ✅ VRAM 清理完成")

            # 执行RAM清理
            if clear_ram:
                mode_text = "激进模式" if aggressive_mode else "普通模式"
                debug_print(COMPONENT_NAME, f"[清理 API] 🔧 正在执行 RAM 清理（{mode_text}）...")
                cleanup_ram(aggressive=aggressive_mode)
                results["ram_cleaned"] = True
                results["aggressive_used"] = aggressive_mode
                debug_print(COMPONENT_NAME, f"[清理 API] ✅ RAM 清理完成（{mode_text}）")

            # 清理总结
            debug_print(COMPONENT_NAME, f"[清理 API] 📊 清理总结:")
            debug_print(COMPONENT_NAME, f"[清理 API]   - VRAM: {'✅ 已清理' if results['vram_cleaned'] else '⏭️ 跳过'}")
            debug_print(COMPONENT_NAME, f"[清理 API]   - RAM: {'✅ 已清理' if results['ram_cleaned'] else '⏭️ 跳过'}")
            if results['ram_cleaned']:
                debug_print(COMPONENT_NAME, f"[清理 API]   - 模式: {'激进模式' if results['aggressive_used'] else '普通模式'}")
            debug_print(COMPONENT_NAME, f"[清理 API] ========================================\n")

            return web.json_response({
                "status": "success",
                "results": results
            })

        except Exception as e:
            error_msg = f"[清理 API] ❌ 异常: {str(e)}"
            debug_print(COMPONENT_NAME, error_msg)
            debug_print(COMPONENT_NAME, f"[清理 API] ========================================\n")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

except ImportError as e:
    print(f"[GroupExecutorManager] 警告: 无法导入PromptServer或web模块，API端点将不可用: {e}")


# ==================== 内存显存清理功能 ====================

def cleanup_vram():
    """清理显存（GPU VRAM）"""
    print("[VRAM清理 测试] cleanup_vram 函数被调用", flush=True)

    if not TORCH_AVAILABLE:
        debug_print(COMPONENT_NAME, "[VRAM清理] ⚠️ 跳过：torch 模块不可用")
        return

    try:
        if torch.cuda.is_available():
            print("[VRAM清理 测试] 正在执行 torch.cuda.empty_cache()", flush=True)
            debug_print(COMPONENT_NAME, "[VRAM清理] 🔧 执行 torch.cuda.empty_cache()")
            torch.cuda.empty_cache()
            debug_print(COMPONENT_NAME, "[VRAM清理] 🔧 执行 torch.cuda.ipc_collect()")
            torch.cuda.ipc_collect()
            debug_print(COMPONENT_NAME, "[VRAM清理] ✅ 显存清理成功")
            print("[VRAM清理 测试] 显存清理完成", flush=True)
        else:
            debug_print(COMPONENT_NAME, "[VRAM清理] ⚠️ 跳过：CUDA 不可用")
    except Exception as e:
        debug_print(COMPONENT_NAME, f"[VRAM清理] ❌ 清理失败: {e}")


def cleanup_ram(aggressive=False):
    """
    清理系统内存（RAM）

    Args:
        aggressive: 是否启用激进模式（卸载所有模型）
    """
    print(f"[RAM清理 测试] cleanup_ram 函数被调用，aggressive={aggressive}", flush=True)

    try:
        # 基础垃圾回收
        debug_print(COMPONENT_NAME, "[RAM清理] 🔧 执行垃圾回收 gc.collect()")
        gc.collect()

        if aggressive and COMFY_MM_AVAILABLE:
            # 激进模式：卸载所有模型
            print("[RAM清理 测试] 激进模式：卸载模型", flush=True)
            debug_print(COMPONENT_NAME, "[RAM清理] 🚀 激进模式：卸载所有模型")
            debug_print(COMPONENT_NAME, "[RAM清理] 🔧 执行 mm.unload_all_models()")
            mm.unload_all_models()
            debug_print(COMPONENT_NAME, "[RAM清理] 🔧 执行 mm.soft_empty_cache()")
            mm.soft_empty_cache()
            debug_print(COMPONENT_NAME, "[RAM清理] ✅ 内存清理完成（激进模式）")
            print("[RAM清理 测试] 激进模式完成", flush=True)
        elif aggressive and not COMFY_MM_AVAILABLE:
            debug_print(COMPONENT_NAME, "[RAM清理] ⚠️ 激进模式不可用（comfy.model_management 不可用），使用普通模式")
            debug_print(COMPONENT_NAME, "[RAM清理] ✅ 内存清理完成（普通模式）")
        else:
            debug_print(COMPONENT_NAME, "[RAM清理] ✅ 内存清理完成（普通模式）")

    except Exception as e:
        debug_print(COMPONENT_NAME, f"[RAM清理] ❌ 清理失败: {e}")


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
        debug_print(COMPONENT_NAME, "[条件评估] 跳过采样器组检测：metadata_collector不可用")
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
                    debug_print(COMPONENT_NAME, f"[条件评估] 检测到后续采样器组: {group_name} (节点: {node_id}, 类型: {class_type})")
                    return True

        debug_print(COMPONENT_NAME, "[条件评估] 后续无采样器组")
        return False

    except Exception as e:
        debug_print(COMPONENT_NAME, f"[条件评估] 采样器组检测失败: {e}")
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
                        debug_print(COMPONENT_NAME, f"[条件评估] 获取PCP参数值: {node_id}.{param_name} = {value}")
                        return value

        debug_print(COMPONENT_NAME, f"[条件评估] 获取PCP参数值失败: {node_id}.{param_name}")
        return None

    except Exception as e:
        debug_print(COMPONENT_NAME, f"[条件评估] 获取PCP参数值异常: {e}")
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
            debug_print(COMPONENT_NAME, f"[条件评估] has_next_sampler_group: {actual_value} == {expected_value} => {result}")
            return result

        elif condition_type == "pcp_param":
            # 检测参数控制面板的参数值
            node_id = condition.get("node_id")
            param_name = condition.get("param_name")

            if not node_id or not param_name:
                debug_print(COMPONENT_NAME, f"[条件评估] pcp_param条件缺少node_id或param_name")
                return False

            actual_value = await get_pcp_param_value(node_id, param_name)
            result = actual_value == expected_value
            debug_print(COMPONENT_NAME, f"[条件评估] pcp_param: {node_id}.{param_name} = {actual_value} == {expected_value} => {result}")
            return result

        else:
            debug_print(COMPONENT_NAME, f"[条件评估] 未知的条件类型: {condition_type}")
            return False

    except Exception as e:
        debug_print(COMPONENT_NAME, f"[条件评估] 条件评估异常: {e}")
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
        debug_print(COMPONENT_NAME, "[条件评估] 无激进模式条件，默认不启用激进模式")
        return False

    try:
        debug_print(COMPONENT_NAME, f"[条件评估] 开始评估 {len(conditions)} 个激进模式条件")

        # 评估所有条件（AND逻辑）
        for i, condition in enumerate(conditions):
            result = await evaluate_condition(condition, current_index, groups, workflow)
            debug_print(COMPONENT_NAME, f"[条件评估] 条件 {i+1}/{len(conditions)}: {result}")

            if not result:
                debug_print(COMPONENT_NAME, f"[条件评估] ❌ 条件 {i+1} 不满足，激进模式不启用")
                return False

        debug_print(COMPONENT_NAME, "[条件评估] ✅ 所有条件都满足，启用激进模式")
        return True

    except Exception as e:
        debug_print(COMPONENT_NAME, f"[条件评估] 条件检查异常: {e}")
        return False