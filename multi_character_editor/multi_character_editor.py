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
TEMPLATES_FILE = os.path.join(PLUGIN_DIR, "templates", "character_templates.json")

# 确保目录存在
os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
os.makedirs(os.path.dirname(TEMPLATES_FILE), exist_ok=True)


class PromptGenerator:
    """提示词生成器"""
    
    def __init__(self, syntax_mode="attention_couple"):
        self.syntax_mode = syntax_mode
    
    def generate(self, base_prompt, config):
        """生成提示词"""
        try:
            characters = config.get('characters', [])
            if not characters:
                return base_prompt
            
            # 过滤启用的角色
            enabled_characters = [char for char in characters if char.get('enabled', True)]
            if not enabled_characters:
                return base_prompt
            
            # 生成蒙版数据
            masks = self._generate_masks(enabled_characters)
            
            if self.syntax_mode == "attention_couple":
                return self._generate_attention_couple(base_prompt, masks)
            elif self.syntax_mode == "regional_prompts":
                return self._generate_regional_prompts(masks)
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
            
            masks.append({
                'prompt': char.get('prompt', ''),
                'weight': char.get('weight', 1.0),
                'x1': mask.get('x', 0.0),
                'y1': mask.get('y', 0.0),
                'x2': mask.get('x', 0.0) + mask.get('width', 0.5),
                'y2': mask.get('y', 0.0) + mask.get('height', 0.5),
                'feather': mask.get('feather', 0),
                'opacity': mask.get('opacity', 100),
                'blend_mode': mask.get('blend_mode', 'normal')
            })
        return masks
    
    def _generate_attention_couple(self, base_prompt, masks):
        """生成Attention Couple语法"""
        if not masks:
            return base_prompt
        
        mask_strings = []
        for mask in masks:
            if not mask['prompt'].strip():
                continue
            
            mask_str = f"COUPLE MASK({mask['x1']:.2f} {mask['x2']:.2f}, {mask['y1']:.2f} {mask['y2']:.2f}) {mask['prompt']}"
            
            # 添加权重
            if mask['weight'] != 1.0:
                mask_str += f":{mask['weight']:.2f}"
            
            # 添加羽化
            if mask['feather'] > 0:
                mask_str += f" FEATHER({mask['feather']})"
            
            mask_strings.append(mask_str)
        
        result = base_prompt.strip()
        if mask_strings:
            result += " " + " ".join(mask_strings)
        
        return result.strip()
    
    def _generate_regional_prompts(self, masks):
        """生成Regional Prompts语法"""
        if not masks:
            return ""
        
        mask_strings = []
        for mask in masks:
            if not mask['prompt'].strip():
                continue
            
            mask_str = f"{mask['prompt']} MASK({mask['x1']:.2f} {mask['x2']:.2f}, {mask['y1']:.2f} {mask['y2']:.2f})"
            
            # 添加权重
            if mask['weight'] != 1.0:
                mask_str += f":{mask['weight']:.2f}"
            
            # 添加羽化
            if mask['feather'] > 0:
                mask_str += f" FEATHER({mask['feather']})"
            
            # 添加混合模式
            if mask['blend_mode'] != 'normal':
                mask_str += f" BLEND({mask['blend_mode']})"
            
            mask_strings.append(mask_str)
        
        return " AND ".join(mask_strings)


class MultiCharacterEditorNode:
    """多人角色提示词编辑器节点"""
    
    @classmethod
    def INPUT_TYPES(cls):
        logger.info("MultiCharacterEditorNode.INPUT_TYPES 被调用")
        input_types = {
            "required": {
                "base_prompt": ("STRING", {"default": ""}),
                "syntax_mode": (["attention_couple", "regional_prompts"], {"default": "attention_couple"}),
            },
            "optional": {
                "canvas_width": ("INT", {"default": 1024, "min": 256, "max": 2048}),
                "canvas_height": ("INT", {"default": 1024, "min": 256, "max": 2048}),
                "config_data": ("STRING", {"default": "{}"}),
            }
        }
        logger.info(f"MultiCharacterEditorNode INPUT_TYPES: {input_types}")
        return input_types
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("generated_prompt",)
    FUNCTION = "generate_prompt"
    CATEGORY = "Danbooru"
    
    def __init__(self):
        logger.info("MultiCharacterEditorNode 实例被创建")
    
    def generate_prompt(self, base_prompt, syntax_mode, config_data, canvas_width=1024, canvas_height=1024):
        """生成提示词"""
        try:
            # 解析配置数据
            config = {}
            try:
                config = json.loads(config_data) if config_data.strip() else {}
            except json.JSONDecodeError as e:
                logger.error(f"解析配置数据失败: {e}")
                config = {}
            
            # 更新画布配置
            if 'canvas' not in config:
                config['canvas'] = {}
            
            # 如果引脚没有传入数值，使用配置中的画布尺寸或默认值
            if canvas_width is not None:
                config['canvas']['width'] = canvas_width
            elif 'width' not in config['canvas']:
                config['canvas']['width'] = 1024
                
            if canvas_height is not None:
                config['canvas']['height'] = canvas_height
            elif 'height' not in config['canvas']:
                config['canvas']['height'] = 1024
                
            config['syntax_mode'] = syntax_mode
            
            # 生成提示词
            generator = PromptGenerator(syntax_mode)
            generated_prompt = generator.generate(base_prompt, config)
            
            # 返回结果
            return (generated_prompt,)
            
        except Exception as e:
            logger.error(f"生成提示词时发生错误: {e}")
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
            logger.info("创建默认设置文件")
        except Exception as e:
            logger.error(f"创建默认设置文件失败: {e}")


# API端点


@PromptServer.instance.routes.post("/multi_character_editor/save_config")
async def save_config(request):
    """保存编辑器配置"""
    try:
        data = await request.json()
        
        # 验证配置数据
        if not isinstance(data, dict):
            return web.json_response({"error": "配置数据格式错误"}, status=400)
        
        # 添加版本信息
        data['version'] = '1.0.0'
        
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info("配置保存成功")
        return web.json_response({"success": True})
        
    except Exception as e:
        logger.error(f"保存配置失败: {e}")
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
            # 如果文件仍然不存在，返回错误
            return web.json_response({"error": "无法创建默认设置文件"}, status=500)
           
    except Exception as e:
        logger.error(f"加载配置失败: {e}")
        return web.json_response({"error": str(e)}, status=500)



@PromptServer.instance.routes.post("/multi_character_editor/generate_preview")
async def generate_preview(request):
    """生成提示词预览"""
    try:
        data = await request.json()
        base_prompt = data.get("base_prompt", "")
        syntax_mode = data.get("syntax_mode", "attention_couple")
        config = data.get("config", {})
        
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
        
        # 根据语法模式进行特定验证
        if syntax_mode == "attention_couple":
            # 检查COUPLE语法
            if "COUPLE" in prompt:
                import re
                couple_matches = re.findall(r'COUPLE\s+MASK\([^)]+\)', prompt)
                if not couple_matches:
                    errors.append("发现COUPLE关键字但缺少有效的MASK语法")
                
                # 检查MASK参数
                for match in couple_matches:
                    mask_params = re.search(r'MASK\(([^)]+)\)', match)
                    if mask_params:
                        params = mask_params.group(1).split()
                        if len(params) < 4:
                            errors.append(f"MASK参数不完整: {match}")
                        else:
                            try:
                                x1, x2, y1, y2 = map(float, params[:4])
                                if x1 < 0 or x2 > 1 or y1 < 0 or y2 > 1:
                                    warnings.append(f"MASK坐标可能超出范围: {match}")
                                if x1 >= x2 or y1 >= y2:
                                    errors.append(f"MASK坐标无效: {match}")
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
                        params = mask_params.group(1).split()
                        if len(params) < 4:
                            errors.append(f"MASK参数不完整: {match}")
                        else:
                            try:
                                x1, x2, y1, y2 = map(float, params[:4])
                                if x1 < 0 or x2 > 1 or y1 < 0 or y2 > 1:
                                    warnings.append(f"MASK坐标可能超出范围: {match}")
                                if x1 >= x2 or y1 >= y2:
                                    errors.append(f"MASK坐标无效: {match}")
                            except ValueError:
                                errors.append(f"MASK坐标格式错误: {match}")
        
        return web.json_response({
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        })
        
    except Exception as e:
        logger.error(f"验证提示词失败: {e}")
        return web.json_response({"error": str(e)}, status=500)


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