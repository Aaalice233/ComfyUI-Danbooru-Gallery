"""
多人角色提示词编辑器 - 主节点文件
Multi Character Editor - Main Node File
"""

import json
import os
import time
from server import PromptServer
from aiohttp import web
import traceback
from ..utils.logger import get_logger

logger = get_logger(__name__)

# 插件目录和设置文件路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(PLUGIN_DIR, "settings", "editor_settings.json")
PRESETS_FILE = os.path.join(PLUGIN_DIR, "settings", "presets.json")
PRESET_IMAGES_DIR = os.path.join(PLUGIN_DIR, "settings", "preset_images")

# 确保目录存在
os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
os.makedirs(PRESET_IMAGES_DIR, exist_ok=True)


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
            
            # 获取全局提示词
            global_prompt = config.get('global_prompt', '')
                
            characters = config.get('characters', [])
            use_fill = config.get('use_fill', False)
            
            if not characters:
                # 如果没有角色，返回合并后的提示词
                return self._merge_prompts(base_prompt, global_prompt)
            
            # 过滤启用的角色
            enabled_characters = [char for char in characters if char.get('enabled', True)]
            if not enabled_characters:
                # 如果没有启用的角色，返回合并后的提示词
                return self._merge_prompts(base_prompt, global_prompt)
            
            # 生成蒙版数据
            masks = self._generate_masks(enabled_characters)
            
            if self.syntax_mode == "attention_couple":
                return self._generate_attention_couple(base_prompt, masks, use_fill, global_prompt)
            elif self.syntax_mode == "regional_prompts":
                return self._generate_regional_prompts(base_prompt, masks, global_prompt)
            else:
                logger.warning(f"未知的语法模式: {self.syntax_mode}")
                return self._merge_prompts(base_prompt, global_prompt)
                
        except Exception as e:
            logger.error(f"生成提示词失败: {e}")
            return base_prompt
    
    def _merge_prompts(self, base_prompt, global_prompt):
        """合并基础提示词和全局提示词"""
        final_prompt = ''
        
        if base_prompt and base_prompt.strip():
            final_prompt = base_prompt.strip()
        
        if global_prompt and global_prompt.strip():
            if final_prompt:
                final_prompt = final_prompt + ' ' + global_prompt.strip()
            else:
                final_prompt = global_prompt.strip()
        
        return final_prompt
    
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
            
            # 获取羽化值，优先从角色对象读取，然后从mask读取
            feather = char.get('feather', mask.get('feather', 0))
            
            masks.append({
                'prompt': char.get('prompt', ''),
                'weight': char.get('weight', 1.0),
                'x1': x,
                'y1': y,
                'x2': x + width,
                'y2': y + height,
                'feather': feather,
                'blend_mode': mask.get('blend_mode', 'normal'),
                'use_fill': char.get('use_fill', False)  # 添加角色的FILL状态
            })
        return masks
    
    def _generate_attention_couple(self, base_prompt, masks, use_fill=False, global_prompt=''):
        """生成Attention Couple语法"""
        if not masks:
            # 合并 base_prompt 和 global_prompt
            final_base_prompt = self._merge_prompts(base_prompt, global_prompt)
            # 🔧 修复：如果全局开启了FILL，无条件添加FILL()
            if use_fill:
                if final_base_prompt:
                    final_base_prompt += ' FILL()'
                else:
                    final_base_prompt = 'FILL()'
            return final_base_prompt
        
        mask_strings = []
        for mask in masks:
            if not mask['prompt'].strip():
                continue
            
            # 使用完整的MASK格式：MASK(x1 x2, y1 y2, weight)
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
            
            # 始终包含权重参数，确保语法完整
            weight = mask.get('weight', 1.0)
            mask_params = f"{x1:.2f} {x2:.2f}, {y1:.2f} {y2:.2f}, {weight:.2f}"
            
            # 确保MASK和提示词之间有空格
            mask_str = f"COUPLE MASK({mask_params}) {mask['prompt']}"
            
            # 🔧 如果该角色开启了FILL，在该角色提示词后添加FILL()
            if mask.get('use_fill', False):
                mask_str += ' FILL()'
            
            # 添加羽化 - 使用简化语法（所有边缘相同值）
            # 羽化值为像素值，0表示不使用羽化
            feather_value = int(mask.get('feather', 0))
            if feather_value > 0:
                mask_str += f" FEATHER({feather_value})"
            
            mask_strings.append(mask_str)
        
        # 合并基础提示词和全局提示词
        final_base_prompt = self._merge_prompts(base_prompt, global_prompt)
        
        # 构建结果
        result_parts = []
        
        # 🔧 添加基础提示词，如果全局开启了FILL则添加FILL()
        if final_base_prompt:
            if use_fill:
                result_parts.append(final_base_prompt + " FILL()")
            else:
                result_parts.append(final_base_prompt)
        elif use_fill:
            # 🔧 修复：即使没有基础提示词，如果全局开启了FILL也要添加
            result_parts.append("FILL()")
        
        # 添加角色提示词
        if mask_strings:
            result_parts.extend(mask_strings)
        
        return " ".join(result_parts).strip()
    
    def _generate_regional_prompts(self, base_prompt, masks, global_prompt=''):
        """生成Regional Prompts语法"""
        if not masks:
            # 合并 base_prompt 和 global_prompt
            final_base_prompt = self._merge_prompts(base_prompt, global_prompt)
            return final_base_prompt
        
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
            
            # 使用完整的MASK格式：MASK(x1 x2, y1 y2, weight)
            # 始终包含权重参数，确保语法完整
            weight = mask.get('weight', 1.0)
            mask_params = f"{x1:.2f} {x2:.2f}, {y1:.2f} {y2:.2f}, {weight:.2f}"
            
            mask_str = f"{mask['prompt']} MASK({mask_params})"
            
            # 添加羽化 - 使用简化语法（所有边缘相同值）
            # 羽化值为像素值，0表示不使用羽化
            feather_value = int(mask.get('feather', 0))
            if feather_value > 0:
                mask_str += f" FEATHER({feather_value})"
            
            mask_strings.append(mask_str)
        
        # 合并基础提示词和全局提示词
        final_base_prompt = self._merge_prompts(base_prompt, global_prompt)
        
        # 构建结果
        result_parts = []
        
        # 添加合并后的基础提示词（如果有）
        if final_base_prompt:
            result_parts.append(final_base_prompt)
        
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
        return input_types
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("generated_prompt",)
    FUNCTION = "generate_prompt"
    CATEGORY = "danbooru"
    
    def __init__(self):
        pass
    
    def generate_prompt(self, syntax_mode, use_fill, mce_config, base_prompt="", canvas_width=1024, canvas_height=1024):
        """生成提示词"""
        try:
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
            
            # 生成提示词
            generator = PromptGenerator(config.get('syntax_mode', 'attention_couple'))
            generated_prompt = generator.generate(config.get('base_prompt', ''), config)
            
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
        except Exception as e:
            logger.error(f"[MCE] Failed to create default settings file: {e}")


# API端点


@PromptServer.instance.routes.post("/multi_character_editor/save_config")
async def save_config(request):
    """保存编辑器配置"""
    try:
        data = await request.json()
        
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
        
        return web.json_response({"success": True, "message": "Config saved successfully to server file and node data."})
        
    except Exception as e:
        logger.error(f"[API][POST /save_config] Failed to save config: {e}")
        logger.error(traceback.format_exc())
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.get("/multi_character_editor/load_config")
async def load_config(request):
    """加载编辑器配置"""
    try:
        # 确保默认设置文件存在
        ensure_default_settings()
        
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
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


# 预设管理API端点

def load_presets():
    """加载预设列表"""
    try:
        if os.path.exists(PRESETS_FILE):
            with open(PRESETS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"加载预设失败: {e}")
        return []


def save_presets(presets):
    """保存预设列表"""
    try:
        with open(PRESETS_FILE, 'w', encoding='utf-8') as f:
            json.dump(presets, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"保存预设失败: {e}")
        return False


@PromptServer.instance.routes.get("/multi_character_editor/presets/list")
async def get_presets_list(request):
    """获取预设列表"""
    try:
        presets = load_presets()
        return web.json_response({"success": True, "presets": presets})
    except Exception as e:
        logger.error(f"获取预设列表失败: {e}")
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post("/multi_character_editor/presets/save")
async def save_preset(request):
    """保存新预设或更新现有预设"""
    try:
        data = await request.json()
        preset_id = data.get('id')
        preset_name = data.get('name')
        characters = data.get('characters', [])
        global_prompt = data.get('global_prompt', '')
        global_use_fill = data.get('global_use_fill', False)  # 🔧 添加全局FILL状态
        syntax_mode = data.get('syntax_mode', 'attention_couple')  # 🔧 添加语法模式
        global_note = ''  # 清空备注
        preview_image = data.get('preview_image')  # base64编码的图片
        
        if not preset_name:
            return web.json_response({"error": "预设名称不能为空"}, status=400)
        
        # 加载现有预设
        presets = load_presets()
        
        # 如果有预设ID，则更新现有预设；否则创建新预设
        if preset_id:
            # 更新现有预设
            preset_found = False
            for preset in presets:
                if preset.get('id') == preset_id:
                    preset['name'] = preset_name
                    preset['characters'] = characters
                    preset['global_prompt'] = global_prompt
                    preset['global_use_fill'] = global_use_fill  # 🔧 保存全局FILL状态
                    preset['syntax_mode'] = syntax_mode  # 🔧 保存语法模式
                    preset['global_note'] = ''  # 清空备注
                    preset['updated_at'] = time.time()

                    # 保存预览图
                    if preview_image:
                        image_path = os.path.join(PRESET_IMAGES_DIR, f"{preset_id}.png")
                        try:
                            import base64
                            # 移除data URI前缀
                            if ',' in preview_image:
                                preview_image = preview_image.split(',', 1)[1]
                            image_data = base64.b64decode(preview_image)
                            with open(image_path, 'wb') as f:
                                f.write(image_data)
                            preset['preview_image'] = f"/multi_character_editor/presets/image/{preset_id}"
                        except Exception as e:
                            logger.error(f"保存预览图失败: {e}")

                    preset_found = True
                    break
            
            if not preset_found:
                return web.json_response({"error": "预设不存在"}, status=404)
        else:
            # 创建新预设
            import uuid
            preset_id = str(uuid.uuid4())
            
            new_preset = {
                'id': preset_id,
                'name': preset_name,
                'characters': characters,
                'global_prompt': global_prompt,
                'global_use_fill': global_use_fill,  # 🔧 保存全局FILL状态
                'syntax_mode': syntax_mode,  # 🔧 保存语法模式
                'global_note': '',  # 清空备注
                'created_at': time.time(),
                'updated_at': time.time()
            }
            
            # 保存预览图
            if preview_image:
                image_path = os.path.join(PRESET_IMAGES_DIR, f"{preset_id}.png")
                try:
                    import base64
                    # 移除data URI前缀
                    if ',' in preview_image:
                        preview_image = preview_image.split(',', 1)[1]
                    image_data = base64.b64decode(preview_image)
                    with open(image_path, 'wb') as f:
                        f.write(image_data)
                    new_preset['preview_image'] = f"/multi_character_editor/presets/image/{preset_id}"
                except Exception as e:
                    logger.error(f"保存预览图失败: {e}")
            
            presets.append(new_preset)
        
        # 保存预设列表
        if save_presets(presets):
            return web.json_response({"success": True, "id": preset_id, "message": "预设保存成功"})
        else:
            return web.json_response({"error": "保存预设失败"}, status=500)
            
    except Exception as e:
        logger.error(f"保存预设失败: {e}")
        logger.error(traceback.format_exc())
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.delete("/multi_character_editor/presets/delete")
async def delete_preset(request):
    """删除预设"""
    try:
        data = await request.json()
        preset_id = data.get('id')
        
        if not preset_id:
            return web.json_response({"error": "预设ID不能为空"}, status=400)
        
        # 加载现有预设
        presets = load_presets()
        
        # 查找并删除预设
        preset_found = False
        for i, preset in enumerate(presets):
            if preset.get('id') == preset_id:
                presets.pop(i)
                preset_found = True
                
                # 删除预览图
                image_path = os.path.join(PRESET_IMAGES_DIR, f"{preset_id}.png")
                if os.path.exists(image_path):
                    try:
                        os.remove(image_path)
                    except Exception as e:
                        logger.error(f"删除预览图失败: {e}")
                
                break
        
        if not preset_found:
            return web.json_response({"error": "预设不存在"}, status=404)
        
        # 保存预设列表
        if save_presets(presets):
            return web.json_response({"success": True, "message": "预设删除成功"})
        else:
            return web.json_response({"error": "删除预设失败"}, status=500)
            
    except Exception as e:
        logger.error(f"删除预设失败: {e}")
        logger.error(traceback.format_exc())
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.get("/multi_character_editor/presets/image/{preset_id}")
async def get_preset_image(request):
    """获取预设预览图"""
    try:
        preset_id = request.match_info.get('preset_id')
        image_path = os.path.join(PRESET_IMAGES_DIR, f"{preset_id}.png")
        
        if os.path.exists(image_path):
            return web.FileResponse(image_path)
        else:
            return web.Response(status=404)
            
    except Exception as e:
        logger.error(f"获取预设预览图失败: {e}")
        return web.Response(status=500)




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
    "MultiCharacterEditorNode": "多角色编辑器 (Multi Character Editor)"
}