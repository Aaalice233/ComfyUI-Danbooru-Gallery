"""
参数控制面板 (Parameter Control Panel)
支持滑条、开关、下拉菜单、分隔符、图像等多种参数类型
动态输出引脚，预设管理，拖拽排序
"""

import os
import json
import time
import numpy as np
import torch
from PIL import Image, ImageOps, ImageSequence
from typing import Dict, List, Any, Tuple
from server import PromptServer
from aiohttp import web
from ..utils import debug_config

# 导入ComfyUI的辅助模块
try:
    import folder_paths
    import node_helpers
except ImportError:
    print("[ParameterControlPanel] 警告: 无法导入 folder_paths 或 node_helpers")
    folder_paths = None
    node_helpers = None

# ==================== 全局配置存储 ====================

# 存储每个节点的参数配置 {node_id: {"parameters": [...], "last_update": timestamp}}
_node_configs: Dict[str, Dict] = {}

# 存储预设配置（全局共享）
# 结构: {preset_name: {"parameters": [...], "created_at": timestamp}}
_presets: Dict[str, Dict] = {}

# 设置文件路径
SETTINGS_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "settings.json")


def load_presets():
    """从文件加载全局预设配置，并处理旧格式数据迁移"""
    global _presets
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                loaded_data = json.load(f)

            # 检查数据格式并迁移旧格式（从按节点分组迁移到全局共享）
            migrated = False
            for preset_name, preset_data in list(loaded_data.items()):
                # 旧格式（按节点分组）: {"node_groups": {node_title: {"parameters": [...], "created_at": ...}}}
                # 新格式（全局共享）: {"parameters": [...], "created_at": ...}
                if "node_groups" in preset_data:
                    # 从旧格式迁移：取第一个节点组的数据
                    node_groups = preset_data["node_groups"]
                    if node_groups:
                        first_group = next(iter(node_groups.values()))
                        loaded_data[preset_name] = {
                            "parameters": first_group.get("parameters", []),
                            "created_at": first_group.get("created_at", time.time())
                        }
                        migrated = True
                        debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 迁移预设 '{preset_name}' 从分组格式到全局格式")

            _presets = loaded_data

            if migrated:
                debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 已迁移旧格式预设数据到新格式（全局共享）")
                save_presets()  # 保存迁移后的数据

            debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 加载了 {len(_presets)} 个预设")
        else:
            _presets = {}
    except Exception as e:
        print(f"[ParameterControlPanel] 加载预设失败: {e}")
        _presets = {}


def save_presets():
    """保存预设配置到文件"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(_presets, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[ParameterControlPanel] 保存预设失败: {e}")
        return False


# 启动时加载预设
load_presets()


# ==================== 工具函数 ====================

def get_node_config(node_id: str) -> Dict:
    """获取节点配置"""
    # 确保 node_id 是字符串类型
    node_id = str(node_id)
    return _node_configs.get(node_id, {"parameters": [], "last_update": 0})


def set_node_config(node_id: str, parameters: List[Dict]):
    """设置节点配置"""
    # 确保 node_id 是字符串类型
    node_id = str(node_id)
    _node_configs[node_id] = {
        "parameters": parameters,
        "last_update": time.time()
    }
    debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 节点 {node_id} 配置已更新: {len(parameters)} 个参数")


def get_output_type(param_type: str, config: Dict = None) -> str:
    """根据参数类型返回ComfyUI输出类型"""
    if param_type == "slider":
        # 根据step判断是INT还是FLOAT
        if config and config.get("step", 1) == 1:
            return "INT"
        return "FLOAT"
    elif param_type == "switch":
        return "BOOLEAN"
    elif param_type == "dropdown":
        return "STRING"
    elif param_type == "string":
        return "STRING"
    elif param_type == "image":
        return "IMAGE"
    return "*"  # 未知类型返回通配符


# ==================== 节点类 ====================

class ParameterControlPanel:
    """参数控制面板节点"""

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {},
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("DICT",)  # 返回参数包字典
    RETURN_NAMES = ("parameters",)
    FUNCTION = "execute"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        """检测配置变化"""
        node_id = kwargs.get("unique_id")
        if node_id:
            # 确保 node_id 是字符串类型
            node_id = str(node_id)
            if node_id in _node_configs:
                return str(_node_configs[node_id]["last_update"])
        return str(time.time())

    def execute(self, unique_id=None):
        """执行节点，返回参数包字典"""
        # 确保 unique_id 是字符串类型
        if unique_id is not None:
            unique_id = str(unique_id)

        if not unique_id or unique_id not in _node_configs:
            debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 节点 {unique_id} 无配置，返回空参数包")
            return ({"_meta": [], "_values": {}},)

        config = _node_configs[unique_id]
        parameters = config["parameters"]

        # 构建参数包
        params_pack = {
            "_meta": [],   # 参数元数据列表
            "_values": {}  # 参数值字典
        }

        # 收集所有非分隔符参数的元数据和值
        order = 0
        for param in parameters:
            if param.get("type") != "separator":
                name = param.get("name")
                value = param.get("value")
                param_type = param.get("type")
                param_config = param.get("config", {})

                # 类型转换
                if param_type == "slider":
                    if param_config.get("step", 1) == 1:
                        value = int(value)  # INT
                        output_type = "INT"
                    else:
                        value = float(value)  # FLOAT
                        output_type = "FLOAT"
                elif param_type == "switch":
                    value = bool(value)
                    output_type = "BOOLEAN"
                elif param_type == "dropdown":
                    value = str(value)
                    output_type = "STRING"
                elif param_type == "string":
                    value = str(value)
                    output_type = "STRING"
                elif param_type == "image":
                    # 处理图像参数
                    output_type = "IMAGE"
                    if value and folder_paths and node_helpers:
                        try:
                            # 获取图像路径
                            image_path = folder_paths.get_annotated_filepath(value)

                            # 加载图像
                            img = node_helpers.pillow(Image.open, image_path)

                            # 处理图像序列（如GIF）
                            output_images = []
                            for i in ImageSequence.Iterator(img):
                                i = node_helpers.pillow(ImageOps.exif_transpose, i)

                                if i.mode == 'I':
                                    i = i.point(lambda i: i * (1 / 255))
                                image = i.convert("RGB")

                                # 转换为张量
                                image = np.array(image).astype(np.float32) / 255.0
                                image = torch.from_numpy(image)[None,]
                                output_images.append(image)

                            # 合并所有图像
                            if len(output_images) > 1:
                                value = torch.cat(output_images, dim=0)
                            elif len(output_images) == 1:
                                value = output_images[0]
                            else:
                                # 如果加载失败，创建1024x1024白色图像
                                value = torch.ones((1, 1024, 1024, 3), dtype=torch.float32)

                            debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 加载图像 '{name}': {value.shape}")
                        except Exception as e:
                            print(f"[ParameterControlPanel] 加载图像失败 '{name}': {e}")
                            # 创建1024x1024白色图像作为默认值
                            value = torch.ones((1, 1024, 1024, 3), dtype=torch.float32)
                    else:
                        # 如果没有图像文件，创建1024x1024白色图像
                        value = torch.ones((1, 1024, 1024, 3), dtype=torch.float32)
                else:
                    output_type = "*"

                # 添加元数据
                params_pack["_meta"].append({
                    "name": name,
                    "type": output_type,
                    "order": order,
                    "param_type": param_type
                })

                # 添加值
                params_pack["_values"][name] = value
                order += 1

        debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 节点 {unique_id} 输出参数包: {len(params_pack['_meta'])} 个参数")
        return (params_pack,)


# ==================== API 路由 ====================

try:
    routes = PromptServer.instance.routes

    @routes.post('/danbooru_gallery/pcp/save_config')
    async def save_config(request):
        """保存节点配置"""
        try:
            data = await request.json()
            node_id = data.get('node_id')
            parameters = data.get('parameters', [])

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id"
                }, status=400)

            set_node_config(node_id, parameters)

            return web.json_response({
                "status": "success",
                "message": f"已保存 {len(parameters)} 个参数"
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 保存配置错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.get('/danbooru_gallery/pcp/load_config')
    async def load_config(request):
        """加载节点配置"""
        try:
            node_id = request.query.get('node_id')

            if not node_id:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id"
                }, status=400)

            config = get_node_config(node_id)

            return web.json_response({
                "status": "success",
                "parameters": config["parameters"]
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 加载配置错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.get('/danbooru_gallery/pcp/list_presets')
    async def list_presets(request):
        """列出所有全局预设"""
        try:
            # 返回所有预设名称
            preset_names = list(_presets.keys())

            return web.json_response({
                "status": "success",
                "presets": preset_names
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 列出预设错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/pcp/save_preset')
    async def save_preset(request):
        """保存全局预设"""
        try:
            data = await request.json()
            preset_name = data.get('preset_name')
            parameters = data.get('parameters', [])

            if not preset_name:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 preset_name"
                }, status=400)

            # 保存预设
            _presets[preset_name] = {
                "parameters": parameters,
                "created_at": time.time()
            }

            # 保存到文件
            save_presets()

            return web.json_response({
                "status": "success",
                "message": f"预设 '{preset_name}' 已保存"
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 保存预设错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/pcp/load_preset')
    async def load_preset(request):
        """加载全局预设"""
        try:
            data = await request.json()
            preset_name = data.get('preset_name')

            if not preset_name:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 preset_name"
                }, status=400)

            # 检查预设是否存在
            if preset_name not in _presets:
                return web.json_response({
                    "status": "error",
                    "message": f"预设 '{preset_name}' 不存在"
                }, status=404)

            preset_data = _presets[preset_name]

            return web.json_response({
                "status": "success",
                "parameters": preset_data["parameters"]
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 加载预设错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/pcp/delete_preset')
    async def delete_preset(request):
        """删除全局预设"""
        try:
            data = await request.json()
            preset_name = data.get('preset_name')

            if not preset_name:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 preset_name"
                }, status=400)

            # 检查预设是否存在
            if preset_name not in _presets:
                return web.json_response({
                    "status": "error",
                    "message": f"预设 '{preset_name}' 不存在"
                }, status=404)

            # 删除预设
            del _presets[preset_name]

            # 保存到文件
            save_presets()

            return web.json_response({
                "status": "success",
                "message": f"预设 '{preset_name}' 已删除"
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 删除预设错误: {e}")
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.get('/danbooru_gallery/pcp/get_data_source')
    async def get_data_source(request):
        """获取动态数据源（checkpoint/lora等）"""
        try:
            source_type = request.query.get('type')

            if not source_type:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 type 参数"
                }, status=400)

            options = []

            if source_type == "checkpoint":
                # 扫描 models/checkpoints 目录
                import folder_paths
                checkpoints = folder_paths.get_filename_list("checkpoints")
                options = checkpoints

            elif source_type == "lora":
                # 扫描 models/loras 目录
                import folder_paths
                loras = folder_paths.get_filename_list("loras")
                options = loras

            elif source_type == "custom":
                # 自定义选项，由前端提供
                options = []

            return web.json_response({
                "status": "success",
                "options": options
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 获取数据源错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/pcp/sync_dropdown_options')
    async def sync_dropdown_options(request):
        """同步下拉菜单选项（从Break节点反向同步）"""
        try:
            data = await request.json()
            node_id = data.get('node_id')
            param_name = data.get('param_name')
            options = data.get('options', [])

            if not node_id or not param_name:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id 或 param_name"
                }, status=400)

            # 获取节点配置
            config = get_node_config(node_id)
            parameters = config["parameters"]

            # 查找对应的参数
            param_found = False
            for param in parameters:
                if param.get("name") == param_name and param.get("type") == "dropdown":
                    # 检查数据源是否为 from_connection
                    if param.get("config", {}).get("data_source") == "from_connection":
                        # 更新选项
                        if "config" not in param:
                            param["config"] = {}
                        param["config"]["options"] = options
                        param_found = True
                        debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 参数 '{param_name}' 选项已同步: {len(options)} 个")
                        break

            if not param_found:
                return web.json_response({
                    "status": "error",
                    "message": f"未找到参数 '{param_name}' 或其数据源不是 'from_connection'"
                }, status=404)

            # 更新节点配置
            set_node_config(node_id, parameters)

            return web.json_response({
                "status": "success",
                "message": f"已同步 {len(options)} 个选项到参数 '{param_name}'"
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 同步下拉菜单选项错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.post('/danbooru_gallery/pcp/upload_image')
    async def upload_image(request):
        """上传图像文件"""
        try:
            if not folder_paths:
                return web.json_response({
                    "status": "error",
                    "message": "folder_paths 模块不可用"
                }, status=500)

            # 读取multipart数据
            reader = await request.multipart()
            field = await reader.next()

            if field is None:
                return web.json_response({
                    "status": "error",
                    "message": "未找到上传的文件"
                }, status=400)

            # 获取文件名和内容
            filename = field.filename
            if not filename:
                return web.json_response({
                    "status": "error",
                    "message": "文件名为空"
                }, status=400)

            # 读取文件内容
            file_data = await field.read()

            # 获取ComfyUI的input目录
            input_dir = folder_paths.get_input_directory()

            # 生成唯一文件名（添加时间戳避免覆盖）
            name_parts = os.path.splitext(filename)
            timestamp = int(time.time() * 1000)
            unique_filename = f"{name_parts[0]}_{timestamp}{name_parts[1]}"

            # 保存文件
            file_path = os.path.join(input_dir, unique_filename)
            with open(file_path, 'wb') as f:
                f.write(file_data)

            debug_config.debug_print("parameter_control_panel", f"[ParameterControlPanel] 图像已上传: {unique_filename}")

            return web.json_response({
                "status": "success",
                "filename": unique_filename,
                "message": f"图像已上传: {unique_filename}"
            })

        except Exception as e:
            print(f"[ParameterControlPanel API] 上传图像错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.get('/danbooru_gallery/pcp/get_accessible_params')
    async def get_accessible_params(request):
        """获取所有可被组执行管理器访问的布尔参数列表"""
        try:
            accessible_params = []

            # 遍历所有节点配置
            for node_id, config in _node_configs.items():
                parameters = config.get("parameters", [])

                # 查找 accessible_to_group_executor=True 的 switch 类型参数
                for param in parameters:
                    if param.get("type") == "switch" and param.get("accessible_to_group_executor", False):
                        accessible_params.append({
                            "node_id": node_id,
                            "param_name": param.get("name"),
                            "current_value": param.get("value", False)
                        })

            return web.json_response({
                "status": "success",
                "accessible_params": accessible_params
            })
        except Exception as e:
            print(f"[ParameterControlPanel API] 获取可访问参数错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    @routes.get('/danbooru_gallery/pcp/get_param_value')
    async def get_param_value(request):
        """获取指定参数的当前值"""
        try:
            node_id = request.query.get('node_id')
            param_name = request.query.get('param_name')

            if not node_id or not param_name:
                return web.json_response({
                    "status": "error",
                    "message": "缺少 node_id 或 param_name"
                }, status=400)

            # 获取节点配置
            config = get_node_config(node_id)
            parameters = config.get("parameters", [])

            # 查找指定参数
            for param in parameters:
                if param.get("name") == param_name:
                    return web.json_response({
                        "status": "success",
                        "value": param.get("value"),
                        "type": param.get("type")
                    })

            # 参数不存在
            return web.json_response({
                "status": "error",
                "message": f"参数 '{param_name}' 不存在于节点 '{node_id}'"
            }, status=404)

        except Exception as e:
            print(f"[ParameterControlPanel API] 获取参数值错误: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    debug_config.debug_print("parameter_control_panel", "[ParameterControlPanel] API 路由已注册")

except ImportError as e:
    print(f"[ParameterControlPanel] 警告: 无法导入 PromptServer，API 端点将不可用: {e}")


# ==================== 节点映射 ====================

def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "ParameterControlPanel": ParameterControlPanel
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "ParameterControlPanel": "参数控制面板 (Parameter Control Panel)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
