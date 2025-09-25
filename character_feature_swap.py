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
    """加载LLM设置，并处理从旧格式到新预设格式的迁移"""
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
        "language": "zh",
        "active_preset_name": "default",
        "presets": [
            {
                "name": "default",
                "features": [
                    "hair style", "hair color", "hair ornament",
                    "eye color", "unique body parts", "body shape", "ear shape"
                ]
            }
        ]
    }

    if not os.path.exists(LLM_SETTINGS_FILE):
        return default_settings

    try:
        with open(LLM_SETTINGS_FILE, 'r', encoding='utf-8') as f:
            settings = json.load(f)

        # --- 迁移逻辑 ---
        migrated = False
        if "presets" not in settings:
            migrated = True
            # 从旧的 target_features 或默认值创建 'default' 预设
            old_features = settings.get("target_features", default_settings["presets"][0]["features"])
            settings["presets"] = [{"name": "default", "features": old_features}]
            settings["active_preset_name"] = "default"
            if "target_features" in settings:
                del settings["target_features"]

        # 确保所有默认键都存在
        for key, value in default_settings.items():
            if key not in settings:
                migrated = True
                settings[key] = value
        
        # 如果迁移过，保存更新后的文件
        if migrated:
            save_llm_settings(settings)

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

@PromptServer.instance.routes.post("/character_swap/test_llm_connection")
async def test_llm_connection(request):
    """测试与LLM API的连接和认证"""
    try:
        data = await request.json()
        api_url = data.get("api_url", "").strip()
        api_key = data.get("api_key", "").strip()

        if not api_url or not api_key:
            return web.json_response({"success": False, "error": "API URL或API Key为空"}, status=400)

        # 使用OpenRouter的models端点作为通用的连接测试
        # 这通常只需要有效的API密钥
        test_url = "https://openrouter.ai/api/v1/models"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
        }
        
        response = requests.get(test_url, headers=headers, timeout=15)
        response.raise_for_status() # 如果状态码不是2xx，则会引发异常

        return web.json_response({"success": True, "message": "成功连接到OpenRouter并验证凭据。"})

    except requests.exceptions.HTTPError as e:
        error_message = f"HTTP错误: {e.response.status_code}"
        try:
            error_details = e.response.json()
            error_message += f" - {error_details.get('error', {}).get('message', '无详细信息')}"
        except:
            pass
        logger.error(f"LLM连接测试失败: {error_message}")
        return web.json_response({"success": False, "error": error_message}, status=400)
    except requests.exceptions.RequestException as e:
        logger.error(f"LLM连接测试失败: {e}")
        return web.json_response({"success": False, "error": f"请求错误: {e}"}, status=500)
    except Exception as e:
        logger.error(f"LLM连接测试时发生未知错误: {e}")
        return web.json_response({"success": False, "error": f"未知错误: {e}"}, status=500)

@PromptServer.instance.routes.post("/character_swap/test_llm_response")
async def test_llm_response(request):
    """测试向指定模型发送消息并获得回复"""
    try:
        data = await request.json()
        api_url = data.get("api_url", "").strip()
        api_key = data.get("api_key", "").strip()
        model = data.get("model", "").strip()

        if not api_url or not api_key or not model:
            return web.json_response({"success": False, "error": "API URL, API Key, 或模型为空"}, status=400)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": "Hello!"}
            ],
            "max_tokens": 10 # 限制回复长度
        }
        
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        reply = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()

        if not reply:
             raise Exception("模型返回了空回复。")

        return web.json_response({"success": True, "message": f"模型回复: '{reply}'"})

    except requests.exceptions.HTTPError as e:
        error_message = f"HTTP错误: {e.response.status_code}"
        try:
            error_details = e.response.json()
            error_message += f" - {error_details.get('error', {}).get('message', '无详细信息')}"
        except:
            pass
        logger.error(f"LLM响应测试失败: {error_message}")
        return web.json_response({"success": False, "error": error_message}, status=400)
    except requests.exceptions.RequestException as e:
        logger.error(f"LLM响应测试失败: {e}")
        return web.json_response({"success": False, "error": f"请求错误: {e}"}, status=500)
    except Exception as e:
        logger.error(f"LLM响应测试时发生未知错误: {e}")
        return web.json_response({"success": False, "error": f"未知错误: {e}"}, status=500)

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
                "target_features": ("STRING", {"default": "hair style, hair color, hair ornament, eye color, unique body parts, body shape, ear shape", "multiline": False}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("new_prompt",)
    FUNCTION = "execute"
    CATEGORY = "Danbooru"

    def execute(self, original_prompt, character_prompt, target_features):
        logger.info(f"[CharacterFeatureSwapNode] Received original_prompt (raw): {original_prompt}")
        original_prompt = _parse_prompt_input(original_prompt)
        logger.info(f"[CharacterFeatureSwapNode] Received original_prompt (parsed): {original_prompt}")
        character_prompt = _parse_prompt_input(character_prompt)

        settings = load_llm_settings()
        api_url = settings.get("api_url")
        api_key = settings.get("api_key")
        model = settings.get("model")
        custom_prompt_template = settings.get("custom_prompt")

        # 从活动的预设中获取特征，如果找不到则使用节点输入作为后备
        active_preset_name = settings.get("active_preset_name", "default")
        active_preset = next((p for p in settings.get("presets", []) if p["name"] == active_preset_name), None)
        
        if active_preset:
            features_list = active_preset.get("features", [])
            final_target_features = ", ".join(features_list)
        else:
            # 如果找不到活动预设，则回退到节点自身的输入值
            final_target_features = target_features

        if not api_key:
            logger.error("LLM API Key未设置。请在设置中配置。")
            return ("ERROR: LLM API Key is not set. Please configure it in the node's settings.",)

        # 构建发送给LLM的提示
        prompt_for_llm = custom_prompt_template.format(
            original_prompt=original_prompt,
            character_prompt=character_prompt,
            target_features=final_target_features
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