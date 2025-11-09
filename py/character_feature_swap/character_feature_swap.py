import json
import os
import folder_paths
from server import PromptServer
from comfy import model_management
import aiohttp
from aiohttp import web
import traceback
import asyncio
from ..utils.logger import get_logger

logger = get_logger(__name__)

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
# 插件目录和设置文件路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
LLM_SETTINGS_FILE = os.path.join(PLUGIN_DIR, "llm_settings.json")
PROMPT_CACHE_FILE = os.path.join(PLUGIN_DIR, "cache", "prompt_cache.json")

# 默认LLM设置
def load_llm_settings():
    """加载LLM设置，并处理从旧格式到新预设格式的迁移"""
    default_settings = {
        "api_channel": "openrouter",
        "api_url": "https://openrouter.ai/api/v1/chat/completions", # 将被弃用
        "api_key": "", # 将被弃用
        "model": "gryphe/mythomax-l2-13b", # 将被弃用
        "channel_models": {},
        "channels_config": { # 新增: 存储每个渠道的独立配置
            "openrouter": {"api_url": "https://openrouter.ai/api/v1", "api_key": ""},
            "gemini_api": {"api_url": "https://generativelanguage.googleapis.com/v1beta", "api_key": ""},
            "gemini_cli": {"api_url": "gemini_cli_mode", "api_key": ""},
            "deepseek": {"api_url": "https://api.deepseek.com/v1", "api_key": ""},
            "openai_compatible": {"api_url": "", "api_key": ""}
        },
        "timeout": 30,
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

        migrated = False
        # --- 迁移逻辑: 确保所有默认键都存在 ---
        for key, value in default_settings.items():
            if key not in settings:
                migrated = True
                settings[key] = value
        
        # --- 迁移逻辑: 从旧的顶层 api_url/api_key 到新的 channels_config ---
        if "channels_config" not in settings or not isinstance(settings["channels_config"], dict):
             settings["channels_config"] = default_settings["channels_config"]
             migrated = True

        # 检查旧的顶层字段是否存在且有值
        old_api_url = settings.get("api_url")
        old_api_key = settings.get("api_key")
        old_channel = settings.get("api_channel", "openrouter")

        if old_api_url and old_api_key:
            # 如果新结构中对应的渠道没有key，则迁移旧的key
            if old_channel in settings["channels_config"] and not settings["channels_config"][old_channel].get("api_key"):
                logger.info(f"正在迁移渠道 '{old_channel}' 的旧 API Key...")
                settings["channels_config"][old_channel]["api_key"] = old_api_key
                # 对于 'openai_compatible'，也迁移URL
                if old_channel == "openai_compatible":
                    settings["channels_config"][old_channel]["api_url"] = old_api_url
                migrated = True

        # --- 迁移逻辑: 预设 ---
        if "presets" not in settings:
            migrated = True
            old_features = settings.get("target_features", default_settings["presets"][0]["features"])
            settings["presets"] = [{"name": "default", "features": old_features}]
            settings["active_preset_name"] = "default"
            if "target_features" in settings:
                del settings["target_features"]

        # 如果迁移过，保存更新后的文件
        if migrated:
            # 清理掉已经迁移的顶层废弃字段
            if "api_url" in settings: del settings["api_url"]
            if "api_key" in settings: del settings["api_key"]
            if "model" in settings: del settings["model"]
            save_llm_settings(settings)

        return settings
    except Exception as e:
        logger.error(f"加载LLM设置失败: {e}")
        return default_settings

def save_llm_settings(settings):
    """保存LLM设置"""
    try:
        # 为了向后兼容，执行时仍然依赖顶层的api_url, api_key, model
        # 所以在保存时，根据当前渠道，将分渠道的配置同步到顶层
        active_channel = settings.get("api_channel", "openrouter")
        
        if "channels_config" in settings and active_channel in settings["channels_config"]:
            channel_conf = settings["channels_config"][active_channel]
            settings["api_url"] = channel_conf.get("api_url", "")
            settings["api_key"] = channel_conf.get("api_key", "")

        if "channel_models" in settings and active_channel in settings["channel_models"]:
            settings["model"] = settings["channel_models"][active_channel]

        # 创建一个副本用于保存，移除废弃的顶层键
        settings_to_save = settings.copy()
        if "api_url" in settings_to_save: del settings_to_save["api_url"]
        if "api_key" in settings_to_save: del settings_to_save["api_key"]
        if "model" in settings_to_save: del settings_to_save["model"]

        with open(LLM_SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings_to_save, f, ensure_ascii=False, indent=2)
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

import sys
import shutil
import subprocess

def _get_gemini_executable_path():
    """
    Tries to find the full path to the gemini executable, as the npm global bin
    directory may not be in the PATH for the Python process started by ComfyUI.
    """
    # On Windows, the npm global path is usually in AppData.
    # This path might not be in the PATH for the ComfyUI environment.
    if sys.platform == "win32":
        # We get the npm global prefix and add it to the PATH.
        try:
            # We can't rely on `npm` being in the path, so let's try to construct the path manually.
            npm_global_path = os.path.join(os.environ.get("APPDATA", ""), "npm")
            if os.path.exists(npm_global_path):
                logger.info(f"Adding npm global path to environment: {npm_global_path}")
                os.environ["PATH"] = npm_global_path + os.pathsep + os.environ["PATH"]
        except Exception as e:
            logger.error(f"Failed to add npm global path to PATH: {e}")

    # Now, shutil.which should be able to find 'gemini.cmd' if it was installed globally.
    gemini_executable = shutil.which("gemini")

    if gemini_executable:
        logger.info(f"Found Gemini CLI executable at: {gemini_executable}")
        return gemini_executable
    else:
        logger.error("Could not find 'gemini' executable. Please ensure it is installed globally ('npm install -g @google/gemini-cli') and that the npm global bin directory is in your system's PATH.")
        # Fallback to just "gemini" and let the subprocess call fail, which will be caught and reported to the user.
        return "gemini"

@PromptServer.instance.routes.post("/character_swap/llm_models")
async def get_llm_models(request):
    """根据提供的API凭据获取LLM模型列表"""
    try:
        data = await request.json()
        api_channel = data.get("api_channel")
        if not api_channel:
            return web.json_response({"error": "未提供渠道(api_channel)"}, status=400)

        settings = load_llm_settings()
        channels_config = settings.get("channels_config", {})
        channel_conf = channels_config.get(api_channel, {})
        
        api_url = channel_conf.get("api_url", "").strip()
        api_key = channel_conf.get("api_key", "").strip()
        timeout = settings.get("timeout", 15)

        logger.info(f"[get_llm_models] Channel: '{api_channel}', URL: '{api_url}'")

        if api_channel == "gemini_cli":
            return web.json_response(sorted([
                "gemini-1.5-flash-002",
                "gemini-1.5-flash-8b-exp-0827",
                "gemini-1.5-flash-exp-0827",
                "gemini-1.5-flash-latest",
                "gemini-1.5-pro-002",
                "gemini-1.5-pro-exp-0827",
                "gemini-1.5-pro-latest",
                "gemini-2.0-flash-001",
                "gemini-2.0-flash-exp",
                "gemini-2.0-flash-thinking-exp-01-21",
                "gemini-2.0-flash-thinking-exp-1219",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "gemini-exp-1206",
                "gemini-pro",
            ]))

        if not api_url:
            return web.json_response({"error": "当前渠道的 API URL 为空"}, status=400)

        async with aiohttp.ClientSession() as session:
            # --- Gemini API 特殊处理 ---
            if api_channel == 'gemini_api':
                if not api_key:
                    return web.json_response({"error": "Gemini API Key为空"}, status=400)
                
                models_url = f"{api_url.rstrip('/')}/models?key={api_key}"
                async with session.get(models_url, timeout=timeout, ssl=False) as response:
                    response.raise_for_status()
                    models_data = (await response.json()).get("models", [])
                    model_ids = sorted([
                        model["name"].split('/')[-1] for model in models_data
                        if "generateContent" in model.get("supportedGenerationMethods", [])
                    ])
                    return web.json_response(model_ids)

            # --- 其他 OpenAI 兼容 API 的通用处理 ---
            headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
            models_url = f"{api_url.rstrip('/')}/models"
            logger.info(f"[get_llm_models] Attempting to get models from: {models_url}")
            
            async with session.get(models_url, headers=headers, timeout=timeout, ssl=False) as response:
                response.raise_for_status()
                models_data = (await response.json()).get("data", [])
                model_ids = sorted([model["id"] for model in models_data])
                return web.json_response(model_ids)
            
    except aiohttp.ClientResponseError as e:
        error_message = f"HTTP错误: {e.status} - {e.message}"
        logger.error(f"获取LLM模型列表失败: {error_message}")
        # API调用失败时，返回一个硬编码的列表作为回退
        fallback_models = {
            "openrouter": ["gryphe/mythomax-l2-13b", "google/gemini-flash-1.5", "anthropic/claude-3-haiku"],
            "gemini_api": [
                "gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-pro",
                "gemini-2.5-flash", "gemini-2.5-pro"
            ],
            "deepseek": ["deepseek-chat", "deepseek-coder"],
            "openai_compatible": ["default-model-1", "default-model-2"]
        }
        models = fallback_models.get(api_channel, [])
        logger.info(f"API call failed, returning fallback models for channel '{api_channel}': {models}")
        return web.json_response(models)
    except asyncio.TimeoutError:
        logger.error(f"获取LLM模型列表超时")
        return web.json_response({"error": f"请求超时: {timeout}s"}, status=500)
    except Exception as e:
        logger.error(f"处理模型列表时出错: {e}")
        return web.json_response({"error": f"未知错误: {e}"}, status=500)

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
        api_channel = data.get("api_channel")
        api_url = data.get("api_url", "").strip()
        api_key = data.get("api_key", "").strip()
        timeout = data.get("timeout", 15)

        if not api_channel:
            return web.json_response({"success": False, "error": "未提供渠道(api_channel)"}, status=400)

        if api_channel == 'gemini_cli':
            # 简单地检查可执行文件是否存在
            gemini_executable = _get_gemini_executable_path()
            if gemini_executable and shutil.which(gemini_executable):
                 return web.json_response({"success": True, "message": "Gemini CLI 可访问。"})
            else:
                 return web.json_response({"success": False, "error": "找不到 Gemini CLI。请全局安装并确保在PATH中。"}, status=400)

        if not api_url or not api_key:
            return web.json_response({"success": False, "error": "当前渠道的 API URL 或 API Key 为空"}, status=400)

        async with aiohttp.ClientSession() as session:
            # --- Gemini API 特殊处理 ---
            if api_channel == 'gemini_api':
                test_url = f"{api_url.rstrip('/')}/models?key={api_key}"
                async with session.get(test_url, timeout=timeout, ssl=False) as response:
                    response.raise_for_status()
                    if "models" in await response.json():
                        return web.json_response({"success": True, "message": "成功连接到 Gemini API。"})
                    else:
                        raise Exception("Gemini API 响应格式不正确。")

            # --- 默认/OpenAI 兼容 API 处理 ---
            test_url = f"{api_url.rstrip('/')}/models"
            headers = {"Authorization": f"Bearer {api_key}"}
            
            async with session.get(test_url, headers=headers, timeout=timeout, ssl=False) as response:
                response.raise_for_status()
                if "data" in await response.json():
                    return web.json_response({"success": True, "message": "成功连接到 API。"})
                else:
                    raise Exception("API 响应格式不正确。")

    except aiohttp.ClientResponseError as e:
        error_message = f"HTTP错误: {e.status} - {e.message}"
        logger.error(f"LLM连接测试失败: {error_message}")
        return web.json_response({"success": False, "error": error_message}, status=400)
    except asyncio.TimeoutError:
        logger.error(f"LLM连接测试超时")
        return web.json_response({"success": False, "error": f"请求超时: {timeout}s"}, status=500)
    except Exception as e:
        logger.error(f"LLM连接测试时发生未知错误: {e}")
        return web.json_response({"success": False, "error": f"未知错误: {e}"}, status=500)

@PromptServer.instance.routes.post("/character_swap/test_llm_response")
async def test_llm_response(request):
    """测试向指定模型发送消息并获得回复"""
    try:
        data = await request.json()
        api_channel = data.get("api_channel")
        api_url = data.get("api_url", "").strip()
        api_key = data.get("api_key", "").strip()
        model = data.get("model")
        timeout = data.get("timeout", 30)
        
        if not api_channel:
            return web.json_response({"success": False, "error": "未提供渠道(api_channel)"}, status=400)

        if not model:
            return web.json_response({"success": False, "error": "当前渠道未选择模型"}, status=400)

        if api_channel == "gemini_cli":
            try:
                gemini_executable = _get_gemini_executable_path()
                command = [gemini_executable, "-m", model]
                
                process = await asyncio.create_subprocess_exec(
                    *command,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(input=b"Hello!"),
                    timeout=timeout
                )
                
                if process.returncode != 0:
                    raise subprocess.CalledProcessError(process.returncode, command, output=stdout, stderr=stderr)
                    
                reply = stdout.decode('utf-8').strip()
                if not reply:
                    raise Exception("Gemini CLI returned an empty response.")
                
                return web.json_response({"success": True, "message": f"模型回复: '{reply}'"})

            except FileNotFoundError:
                return web.json_response({"success": False, "error": "找不到 Gemini CLI。"}, status=500)
            except asyncio.TimeoutError:
                return web.json_response({"success": False, "error": f"Gemini CLI 命令超时 ({timeout}s)。"}, status=500)
            except subprocess.CalledProcessError as e:
                error_output = e.stderr.decode('utf-8').strip()
                return web.json_response({"success": False, "error": f"Gemini CLI 错误: {error_output}"}, status=500)
            except Exception as e:
                return web.json_response({"success": False, "error": f"未知的 Gemini CLI 错误: {e}"}, status=500)

        if not api_url or not api_key:
            return web.json_response({"success": False, "error": "当前渠道的 API URL 或 API Key 为空"}, status=400)

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        
        async with aiohttp.ClientSession() as session:
            if api_channel == 'gemini_api':
                payload = { "contents": [{ "parts": [{ "text": "Hello!" }] }] }
                api_endpoint = f"{api_url.rstrip('/')}/models/{model}:generateContent?key={api_key}"
                headers = {"Content-Type": "application/json"}
                async with session.post(api_endpoint, headers=headers, json=payload, timeout=timeout, ssl=False) as response:
                    response.raise_for_status()
                    result = await response.json()
                    reply = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '').strip()
            else: # OpenAI-compatible
                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": "Hello!"}],
                    "max_tokens": 15
                }
                api_endpoint = f"{api_url.rstrip('/')}/chat/completions"
                async with session.post(api_endpoint, headers=headers, json=payload, timeout=timeout, ssl=False) as response:
                    response.raise_for_status()
                    result = await response.json()
                    reply = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()

            if not reply:
                 raise Exception("模型返回了空回复。")

            return web.json_response({"success": True, "message": f"模型回复: '{reply}'"})

    except aiohttp.ClientResponseError as e:
        error_message = f"HTTP错误: {e.status} - {e.message}"
        logger.error(f"LLM响应测试失败: {error_message}")
        return web.json_response({"success": False, "error": error_message}, status=400)
    except asyncio.TimeoutError:
        logger.error(f"LLM响应测试超时")
        return web.json_response({"success": False, "error": f"请求超时: {timeout}s"}, status=500)
    except Exception as e:
        logger.error(f"LLM响应测试时发生未知错误: {e}")
        return web.json_response({"success": False, "error": f"未知错误: {e}"}, status=500)

# API to get all tags
@PromptServer.instance.routes.get("/character_swap/get_all_tags")
async def get_all_tags(request):
    """提供所有可用的标签给前端，优先使用JSON，失败则回退到CSV"""
    zh_cn_dir = os.path.join(PLUGIN_DIR, "..", "danbooru_gallery", "zh_cn")
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
    CATEGORY = "danbooru"

    async def execute(self, original_prompt, character_prompt, target_features):
        """
        异步执行角色特征交换，支持ComfyUI中断机制
        """
        # 在执行开始时立即检查中断状态
        model_management.throw_exception_if_processing_interrupted()
            
        original_prompt = _parse_prompt_input(original_prompt)
        character_prompt = _parse_prompt_input(character_prompt)

        # 在处理输入后再次检查中断状态
        model_management.throw_exception_if_processing_interrupted()

        settings = load_llm_settings()
        api_channel = settings.get("api_channel", "openrouter")
        channels_config = settings.get("channels_config", {})
        channel_conf = channels_config.get(api_channel, {})
        
        api_url = channel_conf.get("api_url", "").strip()
        api_key = channel_conf.get("api_key", "").strip()
        model = settings.get("channel_models", {}).get(api_channel)
        
        custom_prompt_template = settings.get("custom_prompt")
        timeout = settings.get("timeout", 30)

        active_preset_name = settings.get("active_preset_name", "default")
        active_preset = next((p for p in settings.get("presets", []) if p["name"] == active_preset_name), None)
        
        final_target_features = ", ".join(active_preset["features"]) if active_preset else target_features

        # 在格式化提示词前检查中断
        model_management.throw_exception_if_processing_interrupted()
            
        # --- 优雅地校验占位符 ---
        import re
        required_placeholders = {"original_prompt", "character_prompt", "target_features"}
        
        # 使用 re.DOTALL 来匹配包含换行符的占位符内容
        all_found_placeholders = re.findall(r"\{(.+?)\}", custom_prompt_template, re.DOTALL)
        
        # 清理占位符，移除换行符等，用于检查是否存在
        cleaned_placeholders = set(ph.replace('\n', '').replace('\r', '') for ph in all_found_placeholders)

        # 1. 检查缺失的占位符
        missing = required_placeholders - cleaned_placeholders
        if missing:
            error_msg = f"错误: 自定义提示词模板缺少占位符: {', '.join(missing)}。请在设置中修复。"
            logger.error(error_msg)
            return (error_msg,)

        # 2. 检查格式错误的占位符 (包含换行符)
        malformed_errors = []
        for ph in all_found_placeholders:
            if '\n' in ph or '\r' in ph:
                display_ph = ph.replace('\n', '\\n').replace('\r', '\\r')
                correct_ph = ph.replace('\n', '').replace('\r', '')
                error = f"错误格式 '{{{display_ph}}}' -> 正确应为 '{{{correct_ph}}}'"
                malformed_errors.append(error)
        
        if malformed_errors:
            error_msg = "错误: 模板中发现格式错误的占位符:\n" + "\n".join(malformed_errors) + "\n请在设置中修复。"
            logger.error(error_msg)
            return (error_msg,)

        # 3. 如果一切正常，则尝试格式化
        try:
            prompt_for_llm = custom_prompt_template.format(
                original_prompt=original_prompt,
                character_prompt=character_prompt,
                target_features=final_target_features
            )
        except KeyError as e:
            # 这是一个后备检查，以防有未预料到的占位符问题
            error_msg = f"错误: 格式化提示词失败，未知的占位符: {e}。请检查自定义提示词模板。"
            logger.error(error_msg)
            return (error_msg,)

        # 在缓存操作前检查中断
        model_management.throw_exception_if_processing_interrupted()

        # 缓存原始和角色提示词
        try:
            cache_dir = os.path.dirname(PROMPT_CACHE_FILE)
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir)
            with open(PROMPT_CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump({"original_prompt": original_prompt, "character_prompt": character_prompt}, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"写入提示词缓存失败: {e}")

        # --- Gemini CLI 执行 (异步) ---
        if api_channel == "gemini_cli":
            model_management.throw_exception_if_processing_interrupted()
            
            if not model:
                logger.error("[Execute Gemini CLI] Error: Model not selected for Gemini CLI channel.")
                return ("错误: Gemini CLI 渠道未选择模型。",)
            
            process = None
            try:
                gemini_executable = _get_gemini_executable_path()
                command = [gemini_executable, "-m", model]
                
                cli_env = os.environ.copy()
                cli_env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"

                process = await asyncio.create_subprocess_exec(
                    *command,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=cli_env
                )

                # 写入输入数据前检查中断
                model_management.throw_exception_if_processing_interrupted()
                
                process.stdin.write(prompt_for_llm.encode('utf-8'))
                await process.stdin.drain()
                process.stdin.close()

                # 使用更频繁的中断检查（每25ms检查一次）
                start_time = asyncio.get_event_loop().time()
                check_interval = 0.025
                
                while process.returncode is None:
                    try:
                        model_management.throw_exception_if_processing_interrupted()
                    except model_management.InterruptProcessingException:
                        logger.warning("[Execute Gemini CLI] Interruption detected. Terminating subprocess.")
                        try:
                            # 尝试优雅终止
                            process.terminate()
                            # 等待短时间看是否能优雅退出
                            try:
                                await asyncio.wait_for(process.wait(), timeout=1.0)
                            except asyncio.TimeoutError:
                                # 如果优雅终止失败，强制杀死进程
                                logger.warning("[Execute Gemini CLI] Force killing subprocess.")
                                process.kill()
                                await process.wait()
                        except (ProcessLookupError, AttributeError):
                            # 进程已经不存在
                            pass
                        raise  # 重新抛出异常，让ComfyUI处理
                    
                    current_time = asyncio.get_event_loop().time()
                    if (current_time - start_time) > timeout:
                         logger.error(f"[Execute Gemini CLI] Subprocess timed out. Terminating.")
                         try:
                             process.terminate()
                             try:
                                 await asyncio.wait_for(process.wait(), timeout=1.0)
                             except asyncio.TimeoutError:
                                 process.kill()
                                 await process.wait()
                         except (ProcessLookupError, AttributeError):
                             pass
                         return (f"错误: Gemini CLI 命令超时 ({timeout}s)。",)

                    await asyncio.sleep(check_interval)

                # 获取输出前最后检查一次中断
                model_management.throw_exception_if_processing_interrupted()

                stdout, stderr = await process.communicate()
                stdout_res = stdout.decode('utf-8', errors='ignore').strip()
                stderr_res = stderr.decode('utf-8', errors='ignore').strip()

                if process.returncode != 0:
                    logger.error(f"[Execute Gemini CLI] Subprocess failed. Stderr: {stderr_res}")
                    return (f"Gemini CLI 错误: {stderr_res}",)

                new_prompt = stdout_res.strip('"')
                return (new_prompt,)

            except asyncio.CancelledError:
                logger.warning("[Execute Gemini CLI] Execution was cancelled.")
                if process:
                    try:
                        # 尝试优雅终止进程
                        process.terminate()
                        try:
                            await asyncio.wait_for(process.wait(), timeout=2.0)
                        except asyncio.TimeoutError:
                            # 优雅终止失败，强制杀死
                            process.kill()
                            await process.wait()
                    except (ProcessLookupError, AttributeError):
                        # 进程已经不存在
                        pass
                return ("错误: 执行被用户中断。",)
            except Exception as e:
                logger.error(f"Gemini CLI 未知错误: {traceback.format_exc()}")
                # 确保在异常情况下也能清理进程
                if process:
                    try:
                        process.kill()
                        await process.wait()
                    except (ProcessLookupError, AttributeError):
                        pass
                return (f"Gemini CLI 未知错误: {e}",)

        # --- HTTP API 执行 (异步) ---
        # 在开始HTTP API调用前检查中断
        model_management.throw_exception_if_processing_interrupted()
            
        if not api_key:
            return (f"错误: 渠道 '{api_channel}' 的 API Key 未设置。",)
        if not model:
            return (f"错误: 渠道 '{api_channel}' 的模型未选择。",)

        # 在准备请求数据前检查中断
        model_management.throw_exception_if_processing_interrupted()

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        
        if api_channel == 'gemini_api':
            api_endpoint = f"{api_url.rstrip('/')}/models/{model}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {"contents": [{"parts": [{"text": prompt_for_llm}]}]}
        else: # OpenAI 兼容
            api_endpoint = f"{api_url.rstrip('/')}/chat/completions"
            payload = {"model": model, "messages": [{"role": "user", "content": prompt_for_llm}]}

        # 在发送请求前最后检查一次中断状态
        model_management.throw_exception_if_processing_interrupted()

        try:
            async with aiohttp.ClientSession() as session:
                # 创建HTTP请求任务
                async def make_http_request():
                    return await session.post(api_endpoint, headers=headers, json=payload, timeout=timeout, ssl=False)
                
                # 使用更短的超时时间进行分段请求，以便能够及时响应中断
                request_task = asyncio.create_task(make_http_request())
                
                # 更频繁地检查中断状态（每50ms检查一次）
                check_interval = 0.05
                while not request_task.done():
                    # 使用throw_exception_if_processing_interrupted进行更强制的中断
                    try:
                        model_management.throw_exception_if_processing_interrupted()
                    except model_management.InterruptProcessingException:
                        logger.warning("[Execute HTTP] Interruption detected. Cancelling HTTP request.")
                        request_task.cancel()
                        try:
                            await request_task
                        except asyncio.CancelledError:
                            pass
                        raise  # 重新抛出异常，让ComfyUI处理
                    
                    try:
                        # 等待一小段时间或直到任务完成
                        await asyncio.wait_for(asyncio.shield(request_task), timeout=check_interval)
                        break
                    except asyncio.TimeoutError:
                        # 超时说明请求还在进行，继续循环检查中断状态
                        continue
                    except asyncio.CancelledError:
                        # 任务被取消
                        raise model_management.InterruptProcessingException()

                response = request_task.result()
                response.raise_for_status()
                
                # 在解析响应前再次检查中断状态
                model_management.throw_exception_if_processing_interrupted()
                
                result = await response.json()

                # 解析响应后最后检查一次中断状态
                model_management.throw_exception_if_processing_interrupted()

                if api_channel == 'gemini_api':
                    new_prompt = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '').strip()
                else: # OpenAI 兼容
                    new_prompt = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
                
                new_prompt = new_prompt.strip('"')

                if not new_prompt:
                    return ("错误: API 返回了空回复。",)

                return (new_prompt,)
        except asyncio.CancelledError:
            logger.warning("LLM API 调用被用户取消。")
            raise model_management.InterruptProcessingException()
        except aiohttp.ClientResponseError as e:
            error_details = ""
            try:
                error_details = await e.text()
            except:
                pass
            error_message = f"错误: API 请求失败 (HTTP {e.status})。详情: {error_details}"
            logger.error(error_message)
            return (error_message,)
        except asyncio.TimeoutError:
            logger.error(f"调用LLM API超时")
            return (f"API Error: Request timed out after {timeout} seconds.",)
        except Exception as e:
            logger.error(f"处理LLM响应失败: {traceback.format_exc()}")
            return (f"Processing Error: {e}",)


# 节点映射
NODE_CLASS_MAPPINGS = {
    "CharacterFeatureSwapNode": CharacterFeatureSwapNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterFeatureSwapNode": "角色特征交换 (Character Feature Swap)"
}