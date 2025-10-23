"""
组执行管理器 - ComfyUI节点
基于官方文档的标准格式实现
"""

import json
import time
import uuid
import hashlib
from typing import Dict, Any


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
    print(f"\n[GroupExecutorManager] ✅ 配置已更新: {len(groups)} 个组")
    for i, group in enumerate(groups, 1):
        print(f"   {i}. {group.get('group_name', '未命名')} (延迟: {group.get('delay_seconds', 0)}s)")


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
            print(f"\n{'='*80}")
            print(f"[GroupExecutorManager] 🎯 create_execution_plan 被调用")
            print(f"{'='*80}")
            print(f"\n[GroupExecutorManager] 🎯 开始生成执行计划")
            print(f"[GroupExecutorManager] 📍 节点ID: {unique_id}")

            # ✅ 从全局配置中读取配置
            config_data = get_group_config()
            print(f"[GroupExecutorManager] 📦 从全局配置读取: {len(config_data)} 个组")

            # ✅ 新增：检测配置是否为空，如果为空则返回禁用状态
            if not config_data or len(config_data) == 0:
                print(f"[GroupExecutorManager] ⚠️  配置为空，返回禁用状态")
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
                print(f"[GroupExecutorManager] 🚫 已禁用组执行功能（原因：配置为空）\n")
                return (json.dumps(disabled_data, ensure_ascii=False),)

            # ✅ 有有效配置，继续生成执行计划
            print(f"[GroupExecutorManager] ✅ 使用用户配置的组")

            # 固定配置值（内部使用）
            execution_mode = "sequential"  # 顺序执行: sequential, 并行执行: parallel
            cache_control_mode = "conditional"  # 条件缓存: conditional, 总是允许: always_allow, 等待许可: block_until_allowed
            enable_cache = True
            debug_mode = False

            # ✅ 每次执行都生成新的execution_id
            execution_id = f"exec_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            print(f"[GroupExecutorManager] ✅ 生成新的execution_id: {execution_id}")

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
            print(f"\n[GroupExecutorManager] 📋 生成执行计划详情:")
            print(f"   执行ID: {execution_id}")
            print(f"   组数量: {len(config_data)}")
            print(f"   执行模式: {execution_mode}")
            print(f"   缓存模式: {cache_control_mode}")
            print(f"   ")
            
            for i, group in enumerate(config_data, 1):
                group_name = group.get('group_name', f'未命名组{i}')
                delay = group.get('delay_seconds', 0)
                print(f"   ├─ 组{i}: {group_name} (延迟{delay}s)")

            print(f"\n[GroupExecutorManager] ✅ 执行计划生成完成\n")

            # ✅ 合并为单个execution_data输出
            execution_data = {
                "execution_plan": execution_plan,
                "cache_control_signal": cache_signal
            }
            execution_data_json = json.dumps(execution_data, ensure_ascii=False)

            # 📤 输出日志：显示将要发送给GroupExecutorTrigger的内容
            print(f"[GroupExecutorManager] 📤 输出内容:")
            print(f"   └─ execution_data (STRING):")
            print(f"      {execution_data_json[:200]}...")
            print(f"")

            return (execution_data_json,)

        except Exception as e:
            error_msg = f"GroupExecutorManager 执行错误: {str(e)}"
            print(f"\n[GroupExecutorManager] ❌ {error_msg}\n")
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
            
            print(f"\n[GroupExecutorManager API] 📥 收到配置保存请求")
            print(f"[GroupExecutorManager API] 📦 组数量: {len(groups)}")
            
            # 保存到全局配置
            set_group_config(groups)
            
            # 立即显示保存后的配置
            print(f"[GroupExecutorManager API] ✅ 配置已保存到全局存储")
            for i, group in enumerate(groups, 1):
                print(f"   {i}. {group.get('group_name', '未命名')} (延迟: {group.get('delay_seconds', 0)}s)")
            print("")
            
            return web.json_response({
                "status": "success",
                "message": f"已保存 {len(groups)} 个组的配置"
            })
        except Exception as e:
            error_msg = f"[GroupExecutorManager API] 保存配置错误: {str(e)}"
            print(error_msg)
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
            print(f"\n[GroupExecutorManager API] 📤 返回已保存的配置: {len(groups)} 个组")
            
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
    
except ImportError as e:
    print(f"[GroupExecutorManager] 警告: 无法导入PromptServer或web模块，API端点将不可用: {e}")