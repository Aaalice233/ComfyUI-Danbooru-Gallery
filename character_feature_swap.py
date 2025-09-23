import requests
import json
import os
import folder_paths
from server import PromptServer
from aiohttp import web

# 日志记录
import logging
logger = logging.getLogger("CharacterFeatureSwap")

# 插件目录和设置文件路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
LLM_SETTINGS_FILE = os.path.join(PLUGIN_DIR, "llm_settings.json")

# 默认LLM设置
def load_llm_settings():
    """加载LLM设置"""
    default_settings = {
        "api_url": "https://openrouter.ai/api/v1/chat/completions",
        "api_key": "",
        "model": "gryphe/mythomax-l2-13b",
        "custom_prompt": (
            "You are an AI assistant for Stable Diffusion. Your task is to replace features in a prompt.\n"
            "Your goal is to take the features described in the 'New Character Prompt' and intelligently merge them into the 'Original Prompt'.\n"
            "The 'Features to Replace' list tells you which categories of features (like hair style, eye color, clothing) should be taken from the 'New Character Prompt'.\n"
            "Respond with only the new, modified prompt, without any explanations.\n\n"
            "**Original Prompt:**\n{original_prompt}\n\n"
            "**New Character Prompt:**\n{character_prompt}\n\n"
            "**Features to Replace (guide):**\n{target_features}\n\n"
            "**New Prompt:**"
        )
    }
    if not os.path.exists(LLM_SETTINGS_FILE):
        return default_settings
    try:
        with open(LLM_SETTINGS_FILE, 'r', encoding='utf-8') as f:
            settings = json.load(f)
            # 确保所有默认键都存在
            for key, value in default_settings.items():
                if key not in settings:
                    settings[key] = value
            return settings
    except Exception as e:
        logger.error(f"加载LLM设置失败: {e}")
        return default_settings

def save_llm_settings(settings):
    """保存LLM设置"""
    try:
        with open(LLM_SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"保存LLM设置失败: {e}")
        return False

# 后端API路由
@PromptServer.instance.routes.get("/character_swap/llm_settings")
async def get_llm_settings(request):
    settings = load_llm_settings()
    return web.json_response(settings)

@PromptServer.instance.routes.post("/character_swap/llm_settings")
async def save_llm_settings_route(request):
    try:
        data = await request.json()
        if save_llm_settings(data):
            return web.json_response({"success": True})
        else:
            return web.json_response({"success": False, "error": "无法保存LLM设置"}, status=500)
    except Exception as e:
        logger.error(f"保存LLM设置接口错误: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

# API to get all tags
@PromptServer.instance.routes.get("/character_swap/get_all_tags")
async def get_all_tags(request):
    """提供所有可用的标签给前端"""
    all_tags_file = os.path.join(PLUGIN_DIR, "zh_cn", "all_tags_cn.json")
    if not os.path.exists(all_tags_file):
        return web.json_response({"error": "Tag file not found."}, status=404)
    try:
        with open(all_tags_file, 'r', encoding='utf-8') as f:
            tags_data = json.load(f)
        return web.json_response(tags_data)
    except Exception as e:
        logger.error(f"加载 all_tags_cn.json 失败: {e}")
        return web.json_response({"error": "Failed to load tags."}, status=500)

class CharacterFeatureSwapNode:
    """
    一个使用LLM API替换提示词中人物特征的节点
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "original_prompt": ("STRING", {"forceInput": True}),
                "character_prompt": ("STRING", {"forceInput": True}),
                "target_features": ("STRING", {"default": "hair style, eye color, hair color, clothing, expression", "multiline": False}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("new_prompt",)
    FUNCTION = "execute"
    CATEGORY = "Danbooru"

    def execute(self, original_prompt, character_prompt, target_features):
        settings = load_llm_settings()
        api_url = settings.get("api_url")
        api_key = settings.get("api_key")
        model = settings.get("model")
        custom_prompt_template = settings.get("custom_prompt")

        if not api_key:
            # 返回错误或原始提示词，并记录日志
            logger.error("LLM API Key未设置。请在设置中配置。")
            # 为了让工作流继续，这里只返回原始提示词
            return (original_prompt,)

        # 构建发送给LLM的提示
        prompt_for_llm = custom_prompt_template.format(
            original_prompt=original_prompt,
            character_prompt=character_prompt,
            target_features=target_features
        )
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt_for_llm}
            ]
        }
        
        try:
            response = requests.post(api_url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            new_prompt = result['choices'][0]['message']['content'].strip()
            
            # 简单的后处理，移除多余的引号
            if new_prompt.startswith('"') and new_prompt.endswith('"'):
                new_prompt = new_prompt[1:-1]
            
            return (new_prompt,)
        
        except requests.exceptions.RequestException as e:
            logger.error(f"调用LLM API失败: {e}")
            return (f"API Error: {e}",)
        except Exception as e:
            logger.error(f"处理LLM响应失败: {e}")
            return (f"Processing Error: {e}",)

# 节点映射
NODE_CLASS_MAPPINGS = {
    "CharacterFeatureSwapNode": CharacterFeatureSwapNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterFeatureSwapNode": "人物特征替换 (Character Feature Swap)"
}