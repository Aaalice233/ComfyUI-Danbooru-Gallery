"""
枚举切换节点 (Enum Switch)
根据枚举值从多个输入中选择一个输出
支持动态输入数量和输出类型推断
"""

import time
from typing import Dict, List
from server import PromptServer
from aiohttp import web

from ..utils.logger import get_logger
from ..utils.any_type import any_type, FlexibleOptionalInputType

logger = get_logger(__name__)

# ==================== 全局存储 ====================

# 存储每个节点的枚举配置 {node_id: {"options": [...], "panel_node_id": int, "param_name": str, "selected_value": str}}
_node_enum_configs: Dict[str, Dict] = {}


def get_enum_config(node_id: str) -> Dict:
    """获取节点的枚举配置"""
    node_id = str(node_id)
    return _node_enum_configs.get(node_id, {
        "options": [],
        "panel_node_id": None,
        "param_name": None,
        "selected_value": None
    })


def set_enum_config(node_id: str, options: List[str], panel_node_id: int = None,
                    param_name: str = None, selected_value: str = None):
    """设置节点的枚举配置"""
    node_id = str(node_id)
    _node_enum_configs[node_id] = {
        "options": options,
        "panel_node_id": panel_node_id,
        "param_name": param_name,
        "selected_value": selected_value,
        "last_update": time.time()
    }
    logger.info(f"[EnumSwitch] 节点 {node_id} 枚举配置已更新: {len(options)} 个选项")


def clear_enum_config(node_id: str):
    """清除节点的枚举配置"""
    node_id = str(node_id)
    if node_id in _node_enum_configs:
        del _node_enum_configs[node_id]
        logger.info(f"[EnumSwitch] 节点 {node_id} 枚举配置已清除")


# ==================== 节点类 ====================

class EnumSwitch:
    """
    枚举切换节点 - 根据枚举值从多个输入中选择一个输出

    特性：
    - 输入数量根据枚举选项动态调整
    - 输出类型根据连接的下游节点自动推断
    - 支持与 ParameterControlPanel 的枚举参数联动
    - 使用 lazy evaluation 避免不必要的计算
    """

    # 最大支持的输入数量
    MAX_INPUTS = 20

    @classmethod
    def INPUT_TYPES(cls):
        # 构建动态输入定义
        optional_inputs = {}
        for i in range(cls.MAX_INPUTS):
            optional_inputs[f"input_{i}"] = (any_type, {"lazy": True})

        return {
            "required": {
                "enum_value": ("STRING", {
                    "default": "",
                    "tooltip": "当前选中的枚举值，通常由参数控制面板提供"
                }),
            },
            "optional": optional_inputs,
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    # 使用通配符类型作为输出，实际类型由连接推断
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("output",)
    FUNCTION = "switch"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False

    DESCRIPTION = "根据枚举值从多个输入中选择一个输出。输入数量由枚举选项决定，输出类型根据下游连接自动推断。"

    @classmethod
    def IS_CHANGED(cls, enum_value=None, unique_id=None, **kwargs):
        """检测变化 - 枚举值变化时触发重新执行"""
        # 结合节点配置的更新时间，确保配置变更也能触发更新
        config = get_enum_config(unique_id) if unique_id else {}
        last_update = config.get("last_update", 0)
        return f"{enum_value}_{last_update}"

    def check_lazy_status(self, enum_value, unique_id=None, **kwargs):
        """
        Lazy evaluation 检查：只请求当前选中的输入
        这是关键优化，避免执行未选中的分支
        """
        config = get_enum_config(unique_id) if unique_id else {"options": []}
        options = config.get("options", [])

        if not options or not enum_value:
            # 没有选项或没有选中值，返回第一个输入（如果存在）
            return ["input_0"]

        # 找到当前选中的选项索引
        try:
            selected_index = options.index(enum_value)
            # 只需要对应索引的输入
            return [f"input_{selected_index}"]
        except ValueError:
            # 如果枚举值不在选项中，返回第一个输入
            logger.warning(f"[EnumSwitch] 枚举值 '{enum_value}' 不在选项列表中")
            return ["input_0"]

    def switch(self, enum_value, unique_id=None, **kwargs):
        """
        根据枚举值选择对应的输入返回

        Args:
            enum_value: 当前选中的枚举值
            unique_id: 节点ID
            **kwargs: 动态输入 input_0, input_1, ...

        Returns:
            选中的输入值
        """
        config = get_enum_config(unique_id) if unique_id else {"options": []}
        options = config.get("options", [])

        # 处理空选项列表
        if not options:
            logger.warning(f"[EnumSwitch] 节点 {unique_id} 没有枚举选项配置，尝试从输入获取")
            # 尝试返回第一个非空输入
            for i in range(self.MAX_INPUTS):
                key = f"input_{i}"
                if key in kwargs and kwargs[key] is not None:
                    return (kwargs[key],)
            return (None,)

        # 处理空枚举值
        if not enum_value:
            logger.warning(f"[EnumSwitch] 节点 {unique_id} 枚举值为空，使用第一个选项")
            enum_value = options[0] if options else ""

        # 找到选中的索引
        try:
            selected_index = options.index(enum_value)
        except ValueError:
            logger.warning(f"[EnumSwitch] 枚举值 '{enum_value}' 不在选项列表中，使用索引0")
            selected_index = 0

        # 获取对应的输入
        input_key = f"input_{selected_index}"
        selected_value = kwargs.get(input_key)

        logger.debug(f"[EnumSwitch] 节点 {unique_id} 选择: {enum_value} (index={selected_index})")

        return (selected_value,)


# ==================== API 路由 ====================

try:
    routes = PromptServer.instance.routes

    @routes.post('/danbooru_gallery/enum_switch/update_config')
    async def update_enum_config(request):
        """更新枚举切换节点的配置（由前端调用）"""
        try:
            data = await request.json()
            node_id = data.get('node_id')
            options = data.get('options', [])
            panel_node_id = data.get('panel_node_id')
            param_name = data.get('param_name')
            selected_value = data.get('selected_value')

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id"
                }, status=400)

            set_enum_config(node_id, options, panel_node_id, param_name, selected_value)

            return web.json_response({
                "status": "success",
                "message": f"已更新 {len(options)} 个选项"
            })
        except Exception as e:
            logger.error(f"[EnumSwitch] 更新枚举配置错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.get('/danbooru_gallery/enum_switch/get_config')
    async def get_enum_config_api(request):
        """获取枚举切换节点的配置"""
        try:
            node_id = request.query.get('node_id')

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id"
                }, status=400)

            config = get_enum_config(node_id)

            return web.json_response({
                "status": "success",
                "config": config
            })
        except Exception as e:
            logger.error(f"[EnumSwitch] 获取枚举配置错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/enum_switch/clear_config')
    async def clear_enum_config_api(request):
        """清除枚举切换节点的配置"""
        try:
            data = await request.json()
            node_id = data.get('node_id')

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id"
                }, status=400)

            clear_enum_config(node_id)

            return web.json_response({
                "status": "success",
                "message": "配置已清除"
            })
        except Exception as e:
            logger.error(f"[EnumSwitch] 清除枚举配置错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    logger.info("[EnumSwitch] API 路由已注册")

except Exception as e:
    logger.warning(f"[EnumSwitch] 无法注册 API 路由: {e}")


# ==================== 节点映射 ====================

def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "EnumSwitch": EnumSwitch
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "EnumSwitch": "枚举切换 (Enum Switch)"
    }


NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
