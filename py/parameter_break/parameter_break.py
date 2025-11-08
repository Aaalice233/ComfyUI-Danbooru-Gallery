"""
参数展开节点 (Parameter Break)
接收参数包并展开为独立的输出引脚
"""

import time
from typing import Dict, Any, Tuple
from server import PromptServer
from aiohttp import web
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

# ==================== 通配符类型 ====================

class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False

# 创建通配符类型实例
any_typ = AnyType("*")

# ==================== 全局存储 ====================

# 存储每个节点的参数结构配置 {node_id: {"meta": [...], "last_update": timestamp}}
_node_param_structures: Dict[str, Dict] = {}


def get_param_structure(node_id: str) -> Dict:
    """获取节点的参数结构"""
    # 确保 node_id 是字符串类型
    node_id = str(node_id)
    return _node_param_structures.get(node_id, {"meta": [], "last_update": 0})


def set_param_structure(node_id: str, meta: list):
    """设置节点的参数结构"""
    # 确保 node_id 是字符串类型
    node_id = str(node_id)
    _node_param_structures[node_id] = {
        "meta": meta,
        "last_update": time.time()
    }
    logger.info(f" 节点 {node_id} 参数结构已更新: {len(meta)} 个参数")


# ==================== 节点类 ====================

class ParameterBreak:
    """参数展开节点 - 将参数包展开为独立的输出引脚"""

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "parameters": ("DICT", {"tooltip": "来自参数控制面板的参数包"})
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    # 固定最大输出数量以支持动态参数
    # 定义最多20个输出槽，未使用的返回None
    # 使用AnyType实例作为通配符类型，可连接到任何输入
    RETURN_TYPES = tuple([any_typ] * 20)
    RETURN_NAMES = tuple([f"output_{i+1}" for i in range(20)])
    FUNCTION = "break_parameters"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False

    @classmethod
    def IS_CHANGED(cls, parameters=None, **kwargs):
        """检测参数包变化"""
        if parameters and isinstance(parameters, dict):
            meta = parameters.get("_meta", [])
            values = parameters.get("_values", {})
            # 基于参数包内容生成哈希
            hash_input = f"{len(meta)}_{len(values)}_{time.time()}"
            return hash_input
        return str(time.time())

    def break_parameters(self, parameters, unique_id=None):
        """
        展开参数包

        Args:
            parameters: 参数包字典，包含 _meta 和 _values
            unique_id: 节点ID

        Returns:
            参数值的元组（固定20个输出，未使用的为None）
        """
        # 初始化20个None输出
        outputs = [None] * 20

        if not parameters or not isinstance(parameters, dict):
            logger.info(f" 节点 {unique_id} 接收到无效的参数包")
            return tuple(outputs)

        meta = parameters.get("_meta", [])
        values = parameters.get("_values", {})

        if not meta:
            logger.info(f" 节点 {unique_id} 参数包为空")
            return tuple(outputs)

        # 更新节点的参数结构（用于前端同步）
        if unique_id:
            set_param_structure(unique_id, meta)

        # 按照元数据顺序填充输出（最多20个）
        for i, param_meta in enumerate(meta):
            if i >= 20:
                logger.info(f" 警告: 参数数量超过20个，后续参数将被忽略")
                break

            name = param_meta.get("name")
            value = values.get(name)

            if value is not None:
                outputs[i] = value
            else:
                # 如果值不存在，根据类型返回默认值
                param_type = param_meta.get("type", "*")
                if param_type == "INT":
                    outputs[i] = 0
                elif param_type == "FLOAT":
                    outputs[i] = 0.0
                elif param_type == "BOOLEAN":
                    outputs[i] = False
                elif param_type == "STRING":
                    outputs[i] = ""
                else:
                    outputs[i] = None

        logger.info(f" 节点 {unique_id} 展开参数: {len([o for o in outputs if o is not None])} 个有效输出")
        return tuple(outputs)


# ==================== API 路由 ====================

try:
    routes = PromptServer.instance.routes

    @routes.get('/danbooru_gallery/pb/get_structure')
    async def get_structure(request):
        """获取节点的参数结构（用于前端同步）"""
        try:
            node_id = request.query.get('node_id')

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id"
                }, status=400)

            structure = get_param_structure(node_id)

            return web.json_response({
                "status": "success",
                "meta": structure["meta"]
            })
        except Exception as e:
            logger.error(f" 获取参数结构错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/pb/update_structure')
    async def update_structure(request):
        """更新节点的参数结构（用于前端主动同步）"""
        try:
            data = await request.json()
            node_id = data.get('node_id')
            meta = data.get('meta', [])

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id"
                }, status=400)

            set_param_structure(node_id, meta)

            return web.json_response({
                "status": "success",
                "message": f"已更新 {len(meta)} 个参数"
            })
        except Exception as e:
            logger.error(f" 更新参数结构错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    logger.info("API 路由已注册")

except ImportError as e:
    logger.warning(f"无法导入 PromptServer，API 端点将不可用: {e}")


# ==================== 节点映射 ====================

def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "ParameterBreak": ParameterBreak
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "ParameterBreak": "参数展开 (Parameter Break)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
