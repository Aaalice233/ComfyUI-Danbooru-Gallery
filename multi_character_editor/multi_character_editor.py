"""
多人角色提示词编辑器 - 主节点文件
Multi Character Editor - Main Node File
"""

import json
import os
import time
import logging
from server import PromptServer
from aiohttp import web
import traceback

# 日志记录
logger = logging.getLogger("MultiCharacterEditor")

# 插件目录和设置文件路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(PLUGIN_DIR, "settings", "editor_settings.json")

# 确保目录存在
os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)


class PromptGenerator:
    """提示词生成器"""
    
    def __init__(self, syntax_mode="attention_couple"):
        self.syntax_mode = syntax_mode
    
    def generate(self, base_prompt, config):
        """生成提示词"""
        try:
            # 确保base_prompt不为None
            if base_prompt is None:
                base_prompt = ""
                
            characters = config.get('characters', [])
            use_fill = config.get('use_fill', False)
            
            if not characters:
                return base_prompt
            
            # 过滤启用的角色
            enabled_characters = [char for char in characters if char.get('enabled', True)]
            if not enabled_characters:
                return base_prompt
            
            # 生成蒙版数据
            masks = self._generate_masks(enabled_characters)
            
            if self.syntax_mode == "attention_couple":
                return self._generate_attention_couple(base_prompt, masks, use_fill)
            elif self.syntax_mode == "regional_prompts":
                return self._generate_regional_prompts(base_prompt, masks)
            else:
                logger.warning(f"未知的语法模式: {self.syntax_mode}")
                return base_prompt
                
        except Exception as e:
            logger.error(f"生成提示词失败: {e}")
            return base_prompt
    
    def _generate_masks(self, characters):
        """生成蒙版数据"""
        masks = []
        for char in characters:
            mask = char.get('mask')
            if not mask:
                continue
            
            # 确保坐标值有效
            x = max(0.0, min(1.0, mask.get('x', 0.0)))
            y = max(0.0, min(1.0, mask.get('y', 0.0)))
            width = max(0.01, min(1.0 - x, mask.get('width', 0.5)))
            height = max(0.01, min(1.0 - y, mask.get('height', 0.5)))
            
            masks.append({
                'prompt': char.get('prompt', ''),
                'weight': char.get('weight', 1.0),
                'x1': x,
                'y1': y,
                'x2': x + width,
                'y2': y + height,
                'feather': mask.get('feather', 0),
                'blend_mode': mask.get('blend_mode', 'normal'),
                'operation': mask.get('operation', 'multiply')
            })
        return masks
    
    def _generate_attention_couple(self, base_prompt, masks, use_fill=False):
        """生成Attention Couple语法"""
        if not masks:
            return base_prompt
        
        mask_strings = []
        for mask in masks:
            if not mask['prompt'].strip():
                continue
            
            # 根据文档，使用完整的MASK格式：MASK(x1 x2, y1 y2, weight, op)
            # 确保坐标在有效范围内
            x1 = max(0.0, min(1.0, mask['x1']))
            x2 = max(0.0, min(1.0, mask['x2']))
            y1 = max(0.0, min(1.0, mask['y1']))
            y2 = max(0.0, min(1.0, mask['y2']))
            
            # 确保x2 > x1且y2 > y1
            if x2 <= x1:
                x2 = min(1.0, x1 + 0.1)
            if y2 <= y1:
                y2 = min(1.0, y1 + 0.1)
            
            mask_params = f"{x1:.2f} {x2:.2f}, {y1:.2f} {y2:.2f}"
            
            # 添加权重作为MASK的第3个参数
            if mask['weight'] != 1.0:
                mask_params += f", {mask['weight']:.2f}"
            
            # 添加操作模式（如果有）
            if mask.get('operation', 'multiply') != 'multiply':
                mask_params += f", {mask['operation']}"
            
            # 确保MASK和提示词之间有空格
            mask_str = f"COUPLE MASK({mask_params}) {mask['prompt']}"
            
            # 添加羽化 - 使用简化语法（所有边缘相同值）
            if mask['feather'] > 0:
                mask_str += f" FEATHER({mask['feather']})"
            
            mask_strings.append(mask_str)
        
        # 构建结果
        result_parts = []
        
        # 添加基础提示词
        if base_prompt and base_prompt.strip():
            # 如果使用FILL语法，在基础提示词后添加FILL()
            if use_fill and mask_strings:
                result_parts.append(base_prompt.strip() + " FILL()")
            else:
                result_parts.append(base_prompt.strip())
        
        # 添加角色提示词
        if mask_strings:
            result_parts.extend(mask_strings)
        
        return " ".join(result_parts).strip()
    
    def _generate_regional_prompts(self, base_prompt, masks):
        """生成Regional Prompts语法"""
        if not masks:
            return base_prompt
        
        mask_strings = []
        for mask in masks:
            if not mask['prompt'].strip():
                continue
            
            # 根据文档，权重应该是MASK的第3个参数：MASK(x1 x2, y1 y2, weight, op)
            # 确保坐标在有效范围内
            x1 = max(0.0, min(1.0, mask['x1']))
            x2 = max(0.0, min(1.0, mask['x2']))
            y1 = max(0.0, min(1.0, mask['y1']))
            y2 = max(0.0, min(1.0, mask['y2']))
            
            # 确保x2 > x1且y2 > y1
            if x2 <= x1:
                x2 = min(1.0, x1 + 0.1)
            if y2 <= y1:
                y2 = min(1.0, y1 + 0.1)
            
            mask_params = f"{x1:.2f} {x2:.2f}, {y1:.2f} {y2:.2f}"
            
            # 添加权重作为MASK的第3个参数
            if mask['weight'] != 1.0:
                mask_params += f", {mask['weight']:.2f}"
            
            # 添加操作模式（如果有）
            if mask.get('operation', 'multiply') != 'multiply':
                mask_params += f", {mask['operation']}"
            
            mask_str = f"{mask['prompt']} MASK({mask_params})"
            
            # 添加羽化 - 使用简化语法（所有边缘相同值）
            if mask['feather'] > 0:
                mask_str += f" FEATHER({mask['feather']})"
            
            mask_strings.append(mask_str)
        
        # 构建结果
        result_parts = []
        
        # 添加基础提示词（如果有）
        if base_prompt and base_prompt.strip():
            result_parts.append(base_prompt.strip())
        
        # 添加角色提示词
        if mask_strings:
            if result_parts:
                result_parts.append("AND " + " AND ".join(mask_strings))
            else:
                result_parts.append(" AND ".join(mask_strings))
        
        return " ".join(result_parts).strip()


class MultiCharacterEditorNode:
    """多人角色提示词编辑器节点"""
    
    @classmethod
    def INPUT_TYPES(cls):
        logger.info("[MCE] MultiCharacterEditorNode.INPUT_TYPES called")
        input_types = {
            "required": {
                "syntax_mode": (["attention_couple", "regional_prompts"], {"default": "attention_couple"}),
                "use_fill": ("BOOLEAN", {"default": False}),
                "mce_config": ("STRING", {"multiline": True, "default": "{}"}),
            },
            "optional": {
                "base_prompt": ("STRING", {"forceInput": True}),
                "canvas_width": ("INT", {"default": 1024, "min": 256, "max": 2048}),
                "canvas_height": ("INT", {"default": 1024, "min": 256, "max": 2048}),
            }
        }
        logger.info(f"[MCE] MultiCharacterEditorNode INPUT_TYPES defined: {json.dumps(input_types, indent=2)}")
        return input_types
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("generated_prompt",)
    FUNCTION = "generate_prompt"
    CATEGORY = "Danbooru"
    
    def __init__(self):
        logger.info("[MCE] MultiCharacterEditorNode instance created")
    
    def generate_prompt(self, syntax_mode, use_fill, mce_config, base_prompt="", canvas_width=1024, canvas_height=1024):
        """生成提示词"""
        try:
            logger.info(f"[MCE] generate_prompt called with syntax_mode={syntax_mode}, use_fill={use_fill}")
            logger.info(f"[MCE] mce_config (first 200 chars): {mce_config[:200]}...")

            config = {}
            if mce_config and mce_config.strip():
                try:
                    config = json.loads(mce_config)
                except json.JSONDecodeError:
                    logger.error("[MCE] Failed to parse mce_config JSON. Using default config.")
                    config = {}

            # 将即时输入与配置相结合
            config['syntax_mode'] = syntax_mode
            config['use_fill'] = use_fill
            if base_prompt:
                 config['base_prompt'] = base_prompt
            if 'canvas' not in config:
                config['canvas'] = {}
            config['canvas']['width'] = canvas_width if canvas_width is not None else 1024
            config['canvas']['height'] = canvas_height if canvas_height is not None else 1024
            if 'characters' not in config:
                config['characters'] = []

            logger.info(f"[MCE] Using config with {len(config.get('characters', []))} characters for generation.")
            
            # 生成提示词
            generator = PromptGenerator(config.get('syntax_mode', 'attention_couple'))
            generated_prompt = generator.generate(config.get('base_prompt', ''), config)
            
            logger.info(f"[MCE] Generated prompt (first 100 chars): {generated_prompt[:100]}...")
            
            # 返回结果
            return (generated_prompt,)
            
        except Exception as e:
            logger.error(f"[MCE] Error during prompt generation: {e}")
            logger.error(traceback.format_exc())
            return (base_prompt,)



def ensure_default_settings():
    """确保默认设置文件存在"""
    if not os.path.exists(SETTINGS_FILE):
        try:
            default_config = {
                "version": "1.0.0",
                "syntax_mode": "attention_couple",
                "canvas": {
                    "width": 1024,
                    "height": 1024
                },
                "characters": [],
                "settings": {
                    "language": "zh-CN",
                    "theme": {
                        "primaryColor": "#743795",
                        "backgroundColor": "#2a2a2a",
                        "secondaryColor": "#333333"
                    }
                }
            }
            
            with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, ensure_ascii=False, indent=2)
            logger.info("[MCE] Default settings file created at: " + SETTINGS_FILE)
        except Exception as e:
            logger.error(f"[MCE] Failed to create default settings file: {e}")


# API端点


@PromptServer.instance.routes.post("/multi_character_editor/save_config")
async def save_config(request):
    """保存编辑器配置"""
    try:
        logger.info("[API][POST /save_config] Received request to save config.")
        data = await request.json()
        logger.info(f"[API][POST /save_config] Received config data (preview): {json.dumps(data, ensure_ascii=False, indent=2)[:500]}...")
        
        # 验证配置数据
        if not isinstance(data, dict):
            logger.error("[API][POST /save_config] Invalid config data format, expected a dictionary.")
            return web.json_response({"error": "Invalid config data format"}, status=400)
        
        # 添加版本信息
        data['version'] = '1.0.0'
        
        # 确保目录存在
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        
        # 保存到服务器文件（作为备份）
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"[API][POST /save_config] Config successfully saved to: {SETTINGS_FILE}")
        logger.info(f"[API][POST /save_config] Number of characters saved: {len(data.get('characters', []))}")
        return web.json_response({"success": True, "message": "Config saved successfully to server file and node data."})
        
    except Exception as e:
        logger.error(f"[API][POST /save_config] Failed to save config: {e}")
        logger.error(traceback.format_exc())
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.get("/multi_character_editor/load_config")
async def load_config(request):
    """加载编辑器配置"""
    try:
        logger.info("[API][GET /load_config] Received request to load config.")
        # 确保默认设置文件存在
        ensure_default_settings()
        
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            logger.info(f"[API][GET /load_config] Config loaded from file: {SETTINGS_FILE}")
            logger.info(f"[API][GET /load_config] Number of characters loaded: {len(config.get('characters', []))}")
            logger.info(f"[API][GET /load_config] Config content preview: {json.dumps(config, ensure_ascii=False, indent=2)[:300]}...")
            return web.json_response(config)
        else:
            # 如果文件仍然不存在，返回默认配置
            logger.warning(f"[API][GET /load_config] Config file not found, returning default config. Path: {SETTINGS_FILE}")
            default_config = {
                "version": "1.0.0",
                "syntax_mode": "attention_couple",
                "canvas": {
                    "width": 1024,
                    "height": 1024
                },
                "characters": [],
                "settings": {
                    "language": "zh-CN",
                    "theme": {
                        "primaryColor": "#743795",
                        "backgroundColor": "#2a2a2a",
                        "secondaryColor": "#333333"
                    }
                }
            }
            return web.json_response(default_config)
           
    except Exception as e:
        logger.error(f"[API][GET /load_config] Failed to load config: {e}")
        logger.error(traceback.format_exc())
        # 返回默认配置而不是错误
        default_config = {
            "version": "1.0.0",
            "syntax_mode": "attention_couple",
            "canvas": {
                "width": 1024,
                "height": 1024
            },
            "characters": [],
            "settings": {
                "language": "zh-CN",
                "theme": {
                    "primaryColor": "#743795",
                    "backgroundColor": "#2a2a2a",
                    "secondaryColor": "#333333"
                }
            }
        }
        return web.json_response(default_config)



@PromptServer.instance.routes.post("/multi_character_editor/generate_preview")
async def generate_preview(request):
    """生成提示词预览"""
    try:
        data = await request.json()
        base_prompt = data.get("base_prompt", "")
        syntax_mode = data.get("syntax_mode", "attention_couple")
        use_fill = data.get("use_fill", False)
        config = data.get("config", {})
        
        # 确保配置中包含use_fill设置
        config['use_fill'] = use_fill
        
        # 使用提示词生成器生成提示词
        generator = PromptGenerator(syntax_mode)
        generated_prompt = generator.generate(base_prompt, config)
        
        return web.json_response({
            "prompt": generated_prompt
        })
        
    except Exception as e:
        logger.error(f"生成预览失败: {e}")
        logger.error(traceback.format_exc())
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post("/multi_character_editor/validate_prompt")
async def validate_prompt(request):
    """验证提示词语法"""
    try:
        data = await request.json()
        prompt = data.get("prompt", "")
        syntax_mode = data.get("syntax_mode", "attention_couple")
        
        errors = []
        warnings = []
        
        # 基本语法验证
        if not prompt.strip():
            warnings.append("提示词为空")
        
        # 检查是否有base prompt（在Attention Couple模式下检查FILL语法）
        if syntax_mode == "attention_couple" and "FILL()" in prompt:
            # 验证FILL语法位置是否正确
            if not prompt.strip().endswith("FILL()") and "COUPLE" in prompt:
                # 检查FILL()是否在基础提示词的末尾
                parts = prompt.split("COUPLE", 1)
                if len(parts) == 2 and not parts[0].strip().endswith("FILL()"):
                    warnings.append("FILL()应该位于基础提示词的末尾")
        
        # 根据语法模式进行特定验证
        if syntax_mode == "attention_couple":
            # 检查COUPLE语法
            if "COUPLE" in prompt:
                import re
                # 更新正则表达式，确保能正确匹配COUPLE MASK语法
                couple_matches = re.findall(r'COUPLE\s+MASK\([^)]+\)\s+[^\s]+', prompt)
                if not couple_matches:
                    errors.append("发现COUPLE关键字但缺少有效的MASK语法或提示词")
                
                # 检查MASK参数
                for match in couple_matches:
                    mask_params = re.search(r'MASK\(([^)]+)\)', match)
                    if mask_params:
                        # 处理逗号分隔的参数
                        param_str = mask_params.group(1)
                        # 分割x1 x2, y1 y2格式
                        xy_parts = param_str.split(',')
                        if len(xy_parts) < 2:
                            errors.append(f"MASK参数格式错误，需要x1 x2, y1 y2格式: {match}")
                            continue
                        
                        # 处理x部分
                        x_params = xy_parts[0].strip().split()
                        # 处理y部分
                        y_params = xy_parts[1].strip().split()
                        
                        # 合并所有参数
                        params = x_params + y_params
                        
                        # 如果有逗号后的额外参数，添加到params中
                        if len(xy_parts) > 2:
                            for part in xy_parts[2:]:
                                params.extend(part.strip().split())
                        
                        # 使用完整的MASK格式，至少需要4个参数（x1, x2, y1, y2）
                        if len(params) < 4:
                            errors.append(f"MASK参数不完整: {match}")
                        else:
                            try:
                                x1, x2, y1, y2 = map(float, params[:4])
                                if x1 < 0 or x2 > 1 or y1 < 0 or y2 > 1:
                                    warnings.append(f"MASK坐标可能超出范围: {match}")
                                if x1 >= x2 or y1 >= y2:
                                    errors.append(f"MASK坐标无效: {match}")
                                # 检查权重参数（如果有）
                                if len(params) >= 5:
                                    try:
                                        weight = float(params[4])
                                        if weight < 0:
                                            errors.append(f"权重不能为负数: {match}")
                                    except ValueError:
                                        errors.append(f"权重格式错误: {match}")
                            except ValueError:
                                errors.append(f"MASK坐标格式错误: {match}")
        
        elif syntax_mode == "regional_prompts":
            # 检查AND语法
            if "AND" in prompt:
                import re
                mask_matches = re.findall(r'MASK\([^)]+\)', prompt)
                if not mask_matches:
                    errors.append("发现AND关键字但缺少有效的MASK语法")
                
                # 检查MASK参数
                for match in mask_matches:
                    mask_params = re.search(r'MASK\(([^)]+)\)', match)
                    if mask_params:
                        # 处理逗号分隔的参数
                        param_str = mask_params.group(1)
                        # 分割x1 x2, y1 y2格式
                        xy_parts = param_str.split(',')
                        if len(xy_parts) < 2:
                            errors.append(f"MASK参数格式错误，需要x1 x2, y1 y2格式: {match}")
                            continue
                        
                        # 处理x部分
                        x_params = xy_parts[0].strip().split()
                        # 处理y部分
                        y_params = xy_parts[1].strip().split()
                        
                        # 合并所有参数
                        params = x_params + y_params
                        
                        # 如果有逗号后的额外参数，添加到params中
                        if len(xy_parts) > 2:
                            for part in xy_parts[2:]:
                                params.extend(part.strip().split())
                        
                        # 使用完整的MASK格式，至少需要4个参数（x1, x2, y1, y2）
                        if len(params) < 4:
                            errors.append(f"MASK参数不完整: {match}")
                        else:
                            try:
                                x1, x2, y1, y2 = map(float, params[:4])
                                if x1 < 0 or x2 > 1 or y1 < 0 or y2 > 1:
                                    warnings.append(f"MASK坐标可能超出范围: {match}")
                                if x1 >= x2 or y1 >= y2:
                                    errors.append(f"MASK坐标无效: {match}")
                                # 检查权重参数（如果有）
                                if len(params) >= 5:
                                    try:
                                        weight = float(params[4])
                                        if weight < 0:
                                            errors.append(f"权重不能为负数: {match}")
                                    except ValueError:
                                        errors.append(f"权重格式错误: {match}")
                            except ValueError:
                                errors.append(f"MASK坐标格式错误: {match}")
        
        # 检查FEATHER语法
        import re
        feather_matches = re.findall(r'FEATHER\([^)]*\)', prompt)
        for match in feather_matches:
            feather_params = re.search(r'FEATHER\(([^)]*)\)', match)
            if feather_params:
                param_str = feather_params.group(1).strip()
                if param_str:  # 非空参数
                    params = param_str.split()
                    try:
                        # 检查参数数量，可以是1个或4个
                        if len(params) not in [1, 4]:
                            warnings.append(f"FEATHER参数数量应为1个或4个: {match}")
                        else:
                            # 验证参数都是正数
                            for param in params:
                                val = float(param)
                                if val < 0:
                                    errors.append(f"FEATHER值不能为负数: {match}")
                    except ValueError:
                        errors.append(f"FEATHER参数格式错误: {match}")
        
        return web.json_response({
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        })
        
    except Exception as e:
        logger.error(f"验证提示词失败: {e}")
        return web.json_response({"error": str(e)}, status=500)


# 添加文档加载端点
@PromptServer.instance.routes.get("/multi_character_editor/doc/complete_syntax_guide.md")
async def get_syntax_docs_zh(request):
    """获取中文语法文档"""
    try:
        docs_path = os.path.join(PLUGIN_DIR, "doc", "complete_syntax_guide.md")
        if os.path.exists(docs_path):
            with open(docs_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return web.Response(text=content, content_type='text/markdown')
        else:
            return web.Response(text="# 文档未找到\n\n语法文档文件不存在。", status=404, content_type='text/markdown')
    except Exception as e:
        logger.error(f"加载中文语法文档失败: {e}")
        return web.Response(text="# 加载失败\n\n无法加载语法文档。", status=500, content_type='text/markdown')


@PromptServer.instance.routes.get("/multi_character_editor/doc/complete_syntax_guide_en.md")
async def get_syntax_docs_en(request):
    """获取英文语法文档"""
    try:
        docs_path = os.path.join(PLUGIN_DIR, "doc", "complete_syntax_guide_en.md")
        if os.path.exists(docs_path):
            with open(docs_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return web.Response(text=content, content_type='text/markdown')
        else:
            return web.Response(text="# Documentation Not Found\n\nSyntax documentation file does not exist.", status=404, content_type='text/markdown')
    except Exception as e:
        logger.error(f"加载英文语法文档失败: {e}")
        return web.Response(text="# Loading Failed\n\nUnable to load syntax documentation.", status=500, content_type='text/markdown')




# 初始化时确保默认文件存在
try:
    ensure_default_settings()
except Exception as e:
    logger.error(f"初始化默认文件失败: {e}")

# 节点映射
NODE_CLASS_MAPPINGS = {
    "MultiCharacterEditorNode": MultiCharacterEditorNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MultiCharacterEditorNode": "多人角色提示词编辑器 (Multi Character Editor)"
}