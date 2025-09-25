import requests
import json
import os
import folder_paths
from server import PromptServer
from aiohttp import web

# 日志记录
import logging
logger = logging.getLogger("CharacterFeatureSwap")

def _parse_prompt_input(prompt_input):
    """
    尝试解析各种类型的输入:
    1. 如果是包含'prompt'键的JSON字符串，则提取'prompt'字段。
    2. 如果是元组或列表，则取第一个元素。
    3. 其他情况按原样返回。
    """
    # 检查是否为元组或列表，并至少有一个元素
    if isinstance(prompt_input, (list, tuple)) and prompt_input:
        # 递归处理第一个元素，以处理嵌套情况
        return _parse_prompt_input(prompt_input[0])
    
    # 检查是否为字符串
    if isinstance(prompt_input, str):
        try:
            # 尝试解析为JSON
            data = json.loads(prompt_input)
            if isinstance(data, dict) and 'prompt' in data:
                # 递归处理提取出的值
                return _parse_prompt_input(data['prompt'])
        except json.JSONDecodeError:
            # 如果不是有效的JSON，则按原样返回字符串
            return prompt_input
            
    # 对于所有其他情况（包括非字符串、非列表/元组），直接返回
    return prompt_input
# 插件目录和设置文件路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
LLM_SETTINGS_FILE = os.path.join(PLUGIN_DIR, "llm_settings.json")
PROMPT_CACHE_FILE = os.path.join(PLUGIN_DIR, "prompt_cache.json")

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
        ),
        "target_features": []
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

@PromptServer.instance.routes.get("/character_swap/llm_models")
async def get_llm_models(request):
    """从OpenRouter获取可用的LLM模型列表"""
    try:
        response = requests.get("https://openrouter.ai/api/v1/models", timeout=15)
        response.raise_for_status()
        models_data = response.json().get("data", [])
        # 我们可以只返回模型的ID和名称，或者整个对象
        # 这里我们返回ID，因为API调用需要它
        model_ids = sorted([model["id"] for model in models_data])
        return web.json_response(model_ids)
    except requests.exceptions.RequestException as e:
        logger.error(f"从OpenRouter获取模型列表失败: {e}")
        return web.json_response({"error": str(e)}, status=500)
    except Exception as e:
        logger.error(f"处理模型列表时出错: {e}")
        return web.json_response({"error": "处理模型数据时出错"}, status=500)

@PromptServer.instance.routes.post("/character_swap/debug_prompt")
async def debug_llm_prompt(request):
    """构建并返回将发送给LLM的最终提示"""
    try:
        data = await request.json()
        original_prompt = data.get("original_prompt", "")
        character_prompt = data.get("character_prompt", "")
        target_features = data.get("target_features", [])

        logger.info(f"[Debug Prompt] Received data: original_prompt='{original_prompt}', character_prompt='{character_prompt}'")

        settings = load_llm_settings()
        custom_prompt_template = settings.get("custom_prompt", "")

        # 格式化最终的提示
        # For the debug view, we don't need complex parsing, the JS sends clean strings.
        character_prompt_text = character_prompt or "[... features from character prompt ...]"
        original_prompt_text = original_prompt or "[... features from original prompt ...]"
        target_features_text = ", ".join(target_features) or "[... no features selected ...]"

        final_prompt = custom_prompt_template.format(
            original_prompt=original_prompt_text,
            character_prompt=character_prompt_text,
            target_features=target_features_text
        )

        logger.info(f"[Debug Prompt] Final prompt being sent to frontend: {final_prompt}")

        return web.json_response({"final_prompt": final_prompt})

    except Exception as e:
        logger.error(f"构建调试提示时出错: {e}")
        return web.json_response({"error": str(e)}, status=500)

# API to get cached prompts
@PromptServer.instance.routes.get("/character_swap/cached_prompts")
async def get_cached_prompts(request):
    if not os.path.exists(PROMPT_CACHE_FILE):
        return web.json_response({"original_prompt": "", "character_prompt": ""})
    try:
        with open(PROMPT_CACHE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return web.json_response(data)
    except Exception as e:
        logger.error(f"读取提示词缓存失败: {e}")
        return web.json_response({"error": str(e)}, status=500)

# API to get all tags
@PromptServer.instance.routes.get("/character_swap/get_all_tags")
async def get_all_tags(request):
    """提供所有可用的标签给前端，优先使用JSON，失败则回退到CSV"""
    zh_cn_dir = os.path.join(PLUGIN_DIR, "zh_cn")
    json_file = os.path.join(zh_cn_dir, "all_tags_cn.json")
    csv_file = os.path.join(zh_cn_dir, "danbooru.csv")
    
    tags_data = {}

    # 1. 尝试加载 JSON 文件
    if os.path.exists(json_file):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                tags_data = json.load(f)
            if isinstance(tags_data, dict) and tags_data:
                return web.json_response(tags_data)
        except Exception as e:
            logger.warning(f"加载 all_tags_cn.json 失败: {e}。尝试回退到 CSV。")
            tags_data = {} # 重置以确保从CSV加载

    # 2. 如果JSON加载失败或文件不存在，尝试加载 CSV 文件
    if not tags_data and os.path.exists(csv_file):
        try:
            import csv
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                # 假设CSV格式是: 英文标签,中文翻译
                for row in reader:
                    if len(row) >= 2:
                        tags_data[row[0]] = row[1]
            if tags_data:
                return web.json_response(tags_data)
        except Exception as e:
            logger.error(f"加载 danbooru.csv 也失败了: {e}")

    # 3. 如果两者都失败
    if not tags_data:
        return web.json_response({"error": "Tag files not found or are invalid."}, status=404)
    
    return web.json_response({"error": "An unknown error occurred while loading tags."}, status=500)

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
        logger.info(f"[CharacterFeatureSwapNode] Received original_prompt (raw): {original_prompt}")
        # 解析输入，以防它们是JSON字符串
        original_prompt = _parse_prompt_input(original_prompt)
        logger.info(f"[CharacterFeatureSwapNode] Received original_prompt (parsed): {original_prompt}")
        character_prompt = _parse_prompt_input(character_prompt)

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

        # 缓存本次成功执行的提示词
        try:
            with open(PROMPT_CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    "original_prompt": original_prompt,
                    "character_prompt": character_prompt
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"写入提示词缓存失败: {e}")
        
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