"""
参数展开节点 (Parameter Break)
接收参数包并展开为独立的输出引脚
"""

import time
from typing import Dict, Any, Tuple
from server import PromptServer
from aiohttp import web

# ==================== 通配符类型 ====================

class AnyType(str):
    """通配符类型 - 可以连接到任何输入"""
    def __ne__(self, __value: object) -> bool:
        return False

# 创建通配符类型实例
any_type = AnyType("*")

# ==================== 全局存储 ====================

# 存储每个节点的参数结构配置 {node_id: {"meta": [...], "last_update": timestamp}}
_node_param_structures: Dict[str, Dict] = {}


def get_param_structure(node_id: str) -> Dict:
    """获取节点的参数结构"""
    return _node_param_structures.get(node_id, {"meta": [], "last_update": 0})


def set_param_structure(node_id: str, meta: list):
    """设置节点的参数结构"""
    _node_param_structures[node_id] = {
        "meta": meta,
        "last_update": time.time()
    }
    print(f"[ParameterBreak] 节点 {node_id} 参数结构已更新: {len(meta)} 个参数")


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

    # 动态返回类型 - 会被前端更新
    # 使用AnyType实例作为默认输出类型，可连接到任何输入
    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("output",)
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
            参数值的元组
        """
        if not parameters or not isinstance(parameters, dict):
            print(f"[ParameterBreak] 节点 {unique_id} 接收到无效的参数包")
            return ("",)

        meta = parameters.get("_meta", [])
        values = parameters.get("_values", {})

        if not meta:
            print(f"[ParameterBreak] 节点 {unique_id} 参数包为空")
            return ("",)

        # 更新节点的参数结构（用于前端同步）
        if unique_id:
            set_param_structure(unique_id, meta)

        # 按照元数据顺序返回值
        outputs = []
        for param_meta in meta:
            name = param_meta.get("name")
            value = values.get(name)

            if value is not None:
                outputs.append(value)
            else:
                # 如果值不存在，根据类型返回默认值
                param_type = param_meta.get("type", "*")
                if param_type == "INT":
                    outputs.append(0)
                elif param_type == "FLOAT":
                    outputs.append(0.0)
                elif param_type == "BOOLEAN":
                    outputs.append(False)
                elif param_type == "STRING":
                    outputs.append("")
                else:
                    outputs.append(None)

        print(f"[ParameterBreak] 节点 {unique_id} 展开参数: {len(outputs)} 个输出")
        return tuple(outputs) if outputs else ("",)


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
            print(f"[ParameterBreak API] 获取参数结构错误: {e}")
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
            print(f"[ParameterBreak API] 更新参数结构错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    print("[ParameterBreak] API 路由已注册")

except ImportError as e:
    print(f"[ParameterBreak] 警告: 无法导入 PromptServer，API 端点将不可用: {e}")


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
