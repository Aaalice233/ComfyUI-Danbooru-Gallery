"""
保存图像增强版节点 (Save Image Plus)
支持直接传入提示词和 LoRA 语法，使用独立的元数据收集模块
"""

import hashlib
import json
import os
import re
from pathlib import Path
from PIL import Image
from PIL.PngImagePlugin import PngInfo
import numpy as np
import folder_paths
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple

# 导入哈希缓存管理器
try:
    from .hash_cache_manager import get_cache_manager
    HAS_HASH_CACHE = True
    print("[SaveImagePlus] 哈希缓存管理器已加载")
except Exception as e:
    HAS_HASH_CACHE = False
    print(f"[SaveImagePlus] Warning: 哈希缓存管理器加载失败: {e}")

# 尝试导入本地 metadata_collector 模块
HAS_METADATA_COLLECTOR = False

try:
    from ..metadata_collector import get_metadata
    from ..metadata_collector.metadata_processor import MetadataProcessor
    HAS_METADATA_COLLECTOR = True
    print("[SaveImagePlus] 本地元数据收集模块已加载")
except Exception as e:
    print(f"[SaveImagePlus] Warning: 本地元数据收集模块加载失败: {e}")
    print("[SaveImagePlus] 将使用有限的元数据功能")


class SaveImagePlus:
    """
    保存图像增强版节点
    支持直接传入提示词和 LoRA 语法，自动生成 A1111 格式的元数据
    可选依赖 元数据收集器 插件进行哈希计算和元数据收集
    """

    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"
        self.prefix_append = ""
        self.compress_level = 4

        # 占位符正则表达式模式
        self.pattern_format = re.compile(r"(%[^%]+%)")

        # Sampler 名称映射表（ComfyUI 内部名 → A1111 用户友好名）
        self.sampler_mapping = {
            'euler': 'Euler',
            'euler_ancestral': 'Euler a',
            'heun': 'Heun',
            'dpm_2': 'DPM2',
            'dpm_2_ancestral': 'DPM2 a',
            'lms': 'LMS',
            'dpm_fast': 'DPM fast',
            'dpm_adaptive': 'DPM adaptive',
            'dpmpp_2s_ancestral': 'DPM++ 2S a',
            'dpmpp_sde': 'DPM++ SDE',
            'dpmpp_2m': 'DPM++ 2M',
            'ddim': 'DDIM',
            'uni_pc': 'UniPC',
        }

        # Scheduler 名称映射表（ComfyUI 内部名 → A1111 后缀）
        self.scheduler_mapping = {
            'normal': 'Simple',
            'karras': 'Karras',
            'exponential': 'Exponential',
            'sgm_uniform': 'SGM Uniform',
        }

        # 初始化哈希缓存管理器（如果可用）
        self.hash_cache_manager = None
        if HAS_HASH_CACHE:
            try:
                self.hash_cache_manager = get_cache_manager()
                print("[SaveImagePlus] 哈希缓存已启用")
            except Exception as e:
                print(f"[SaveImagePlus] Warning: 哈希缓存初始化失败: {e}")

        # 初始化线程池（用于并行计算哈希）
        # 限制为3个worker，避免IO竞争
        self.hash_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="HashCalc")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE", {
                    "tooltip": "要保存的图像"
                }),
                "enable": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "是否保存图像（关闭时节点不执行）"
                }),
                "filename_prefix": ("STRING", {
                    "default": "ComfyUI",
                    "tooltip": "文件名前缀"
                }),
                "file_format": (["PNG", "JPEG", "WEBP"], {
                    "default": "PNG",
                    "tooltip": "图像保存格式"
                }),
                "quality": ("INT", {
                    "default": 100,
                    "min": 1,
                    "max": 100,
                    "step": 1,
                    "tooltip": "JPEG/WebP 质量（1-100）"
                }),
                "embed_workflow": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "是否嵌入 ComfyUI 工作流数据（仅 PNG 格式支持）"
                }),
                "save_clean_copy": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "额外保存无工作流和元数据的纯净副本"
                }),
                "enable_preview": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "是否在界面显示预览（关闭后仅保存文件）"
                }),
            },
            "optional": {
                "positive_prompt": ("STRING", {
                    "forceInput": True,
                    "tooltip": "正面提示词（可选直接输入）"
                }),
                "negative_prompt": ("STRING", {
                    "forceInput": True,
                    "tooltip": "负面提示词（可选直接输入）"
                }),
                "lora_syntax": ("STRING", {
                    "forceInput": True,
                    "tooltip": "LoRA 语法字符串（可选直接输入）"
                }),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "save_images"
    OUTPUT_NODE = True
    CATEGORY = "danbooru"
    DESCRIPTION = "保存图像并嵌入 A1111 格式元数据，支持直接传入提示词和 LoRA 语法"

    def format_filename(self, filename: str, prompt_obj: dict = None) -> str:
        """
        解析文件名中的占位符（仅支持 date 和 seed）

        Args:
            filename: 包含占位符的文件名
            prompt_obj: ComfyUI prompt 对象（用于提取 seed）

        Returns:
            解析后的文件名
        """
        # 查找所有占位符
        result = re.findall(self.pattern_format, filename)

        for segment in result:
            # 移除 % 符号并按 : 分割
            parts = segment.replace("%", "").split(":")
            key = parts[0]

            # 处理 date 占位符
            if key == "date":
                from datetime import datetime
                now = datetime.now()
                date_table = {
                    "yyyy": f"{now.year:04d}",      # 四位年份: 2025
                    "yy": f"{now.year % 100:02d}",  # 两位年份: 25
                    "MM": f"{now.month:02d}",       # 月份: 01-12
                    "dd": f"{now.day:02d}",         # 日期: 01-31
                    "hh": f"{now.hour:02d}",        # 小时: 00-23
                    "mm": f"{now.minute:02d}",      # 分钟: 00-59
                    "ss": f"{now.second:02d}",      # 秒数: 00-59
                }
                if len(parts) >= 2:
                    # 使用自定义格式
                    date_format = parts[1]
                    for k, v in date_table.items():
                        date_format = date_format.replace(k, v)
                    filename = filename.replace(segment, date_format)
                else:
                    # 默认格式: yyyyMMddhhmmss
                    date_format = "yyyyMMddhhmmss"
                    for k, v in date_table.items():
                        date_format = date_format.replace(k, v)
                    filename = filename.replace(segment, date_format)

            # 处理 seed 占位符
            elif key == "seed" and prompt_obj:
                seed = self._extract_seed_from_prompt(prompt_obj)
                if seed is not None:
                    filename = filename.replace(segment, str(seed))

        return filename

    def _extract_seed_from_prompt(self, prompt_obj: dict) -> int:
        """
        从 prompt 对象中提取 seed 值

        Args:
            prompt_obj: ComfyUI prompt 对象

        Returns:
            seed 值，找不到返回 None
        """
        print("[SaveImagePlus] 开始提取 seed...")

        if not prompt_obj:
            print("[SaveImagePlus] prompt_obj 为空，无法提取 seed")
            return None

        # 处理放大阶段：检查是否有 original_prompt 属性
        actual_prompt = prompt_obj
        if hasattr(prompt_obj, 'original_prompt') and prompt_obj.original_prompt:
            actual_prompt = prompt_obj.original_prompt
            print("[SaveImagePlus] 检测到 original_prompt 属性（hasattr），使用 original_prompt")
        elif isinstance(prompt_obj, dict) and 'original_prompt' in prompt_obj:
            actual_prompt = prompt_obj['original_prompt']
            print("[SaveImagePlus] 检测到 original_prompt 字典键，使用 original_prompt")
        else:
            print("[SaveImagePlus] 使用当前 prompt_obj")

        # 优先处理的 sampler 节点类型
        sampler_types = ['KSampler', 'KSamplerAdvanced', 'SamplerCustom']

        # 第一阶段：优先查找 sampler 节点的 seed
        print("[SaveImagePlus] 阶段1 - 查找 sampler 节点...")
        for node_id, node_data in actual_prompt.items():
            if isinstance(node_data, dict):
                class_type = node_data.get("class_type", "")
                if class_type in sampler_types and "inputs" in node_data:
                    inputs = node_data.get("inputs", {})
                    # 检查 seed 或 noise_seed
                    if "seed" in inputs:
                        seed_value = inputs["seed"]
                        print(f"[SaveImagePlus] 在 sampler 节点 {node_id} ({class_type}) 中找到 seed: {seed_value}")
                        return seed_value
                    if "noise_seed" in inputs:
                        seed_value = inputs["noise_seed"]
                        print(f"[SaveImagePlus] 在 sampler 节点 {node_id} ({class_type}) 中找到 noise_seed: {seed_value}")
                        return seed_value

        # 第二阶段：查找任何包含 seed 的节点
        print("[SaveImagePlus] 阶段2 - 查找任何包含 seed 的节点...")
        for node_id, node_data in actual_prompt.items():
            if isinstance(node_data, dict) and "inputs" in node_data:
                inputs = node_data.get("inputs", {})
                if "seed" in inputs:
                    seed_value = inputs["seed"]
                    class_type = node_data.get("class_type", "未知")
                    print(f"[SaveImagePlus] 在节点 {node_id} ({class_type}) 中找到 seed: {seed_value}")
                    return seed_value
                if "noise_seed" in inputs:
                    seed_value = inputs["noise_seed"]
                    class_type = node_data.get("class_type", "未知")
                    print(f"[SaveImagePlus] 在节点 {node_id} ({class_type}) 中找到 noise_seed: {seed_value}")
                    return seed_value

        print("[SaveImagePlus] 未找到任何 seed 值")
        return None

    def _get_lora_hash(self, lora_name: str) -> str:
        """
        获取 LoRA 哈希值（使用与 LoRA Manager 一致的计算方法）

        Args:
            lora_name: LoRA 模型名称（不含扩展名）

        Returns:
            哈希值字符串（前10个字符）
        """
        print(f"[SaveImagePlus] 计算 LoRA 哈希: {lora_name}")
        return self._calculate_lora_hash(lora_name)

    def _calculate_lora_hash(self, lora_name: str) -> str:
        """
        LoRA 哈希计算实现（与 LoRA Manager 完全一致）
        计算 LoRA 文件的完整 SHA256 哈希，取前 10 个字符
        优化：使用缓存管理器加速重复计算

        Args:
            lora_name: LoRA 模型名称（不含扩展名）

        Returns:
            哈希值字符串（前10个字符），失败返回空字符串
        """
        try:
            # 搜索 LoRA 文件
            lora_paths = folder_paths.get_filename_list("loras")
            lora_file = None

            for path in lora_paths:
                if os.path.splitext(os.path.basename(path))[0] == lora_name:
                    lora_file = folder_paths.get_full_path("loras", path)
                    break

            if not lora_file or not os.path.exists(lora_file):
                print(f"[SaveImagePlus] 找不到 LoRA 文件: {lora_name}")
                return ""

            # 如果有缓存管理器，使用缓存计算
            if self.hash_cache_manager:
                cached_hash = self.hash_cache_manager.get_hash(lora_file)
                if cached_hash:
                    print(f"[SaveImagePlus] 从缓存获取 LoRA 哈希: {lora_name} -> {cached_hash}")
                    return cached_hash

            print(f"[SaveImagePlus] 计算 LoRA 哈希: {lora_name} -> {lora_file}")

            # 计算完整文件的 SHA256 哈希（与 LoRA Manager 一致）
            sha256_hash = hashlib.sha256()

            with open(lora_file, "rb") as f:
                # 使用 128KB 块大小，与 LoRA Manager 一致
                for byte_block in iter(lambda: f.read(128 * 1024), b""):
                    sha256_hash.update(byte_block)

            # 返回前 10 个字符（保持小写，符合 A1111 标准）
            hash_result = sha256_hash.hexdigest()[:10]

            # 保存到缓存
            if self.hash_cache_manager:
                self.hash_cache_manager.set_hash(lora_file, hash_result)

            print(f"[SaveImagePlus] 计算哈希成功: {hash_result}")
            return hash_result

        except Exception as e:
            print(f"[SaveImagePlus] 计算 LoRA 哈希失败 ({lora_name}): {e}")
            return ""

    def _get_checkpoint_hash(self, checkpoint_name: str) -> str:
        """
        获取 checkpoint 哈希值（使用与 LoRA Manager 一致的计算方法）

        Args:
            checkpoint_name: checkpoint 模型路径或名称

        Returns:
            哈希值字符串（前10个字符）
        """
        print(f"[SaveImagePlus] 计算 checkpoint 哈希: {checkpoint_name}")
        return self._calculate_checkpoint_hash(checkpoint_name)

    def _calculate_checkpoint_hash(self, checkpoint_name: str) -> str:
        """
        checkpoint 哈希计算实现
        计算 checkpoint 文件的完整 SHA256 哈希（与 LoRA Manager 一致，取前 10 个字符）
        优化：使用缓存管理器加速重复计算

        Args:
            checkpoint_name: checkpoint 模型路径或名称

        Returns:
            哈希值字符串（前10个字符），失败返回空字符串
        """
        try:
            # 如果是完整路径，直接使用
            if os.path.isabs(checkpoint_name) and os.path.exists(checkpoint_name):
                checkpoint_file = checkpoint_name
            else:
                # 搜索 checkpoint 文件
                checkpoint_paths = folder_paths.get_filename_list("checkpoints")
                checkpoint_file = None

                # 去除扩展名进行匹配
                base_name = os.path.splitext(os.path.basename(checkpoint_name))[0]

                for path in checkpoint_paths:
                    if os.path.splitext(os.path.basename(path))[0] == base_name:
                        checkpoint_file = folder_paths.get_full_path("checkpoints", path)
                        break

            if not checkpoint_file or not os.path.exists(checkpoint_file):
                print(f"[SaveImagePlus] 找不到 checkpoint 文件: {checkpoint_name}")
                return ""

            # 如果有缓存管理器，使用缓存计算
            if self.hash_cache_manager:
                cached_hash = self.hash_cache_manager.get_hash(checkpoint_file)
                if cached_hash:
                    print(f"[SaveImagePlus] 从缓存获取 checkpoint 哈希: {checkpoint_name} -> {cached_hash}")
                    return cached_hash

            print(f"[SaveImagePlus] 计算 checkpoint 哈希: {checkpoint_name} -> {checkpoint_file}")

            # 计算完整文件的 SHA256 哈希（与 LoRA Manager 一致）
            sha256_hash = hashlib.sha256()

            with open(checkpoint_file, "rb") as f:
                # 使用 128KB 块大小，与 LoRA Manager 一致
                for byte_block in iter(lambda: f.read(128 * 1024), b""):
                    sha256_hash.update(byte_block)

            # 返回前 10 个字符（保持小写，符合 A1111 标准）
            hash_result = sha256_hash.hexdigest()[:10]

            # 保存到缓存
            if self.hash_cache_manager:
                self.hash_cache_manager.set_hash(checkpoint_file, hash_result)

            print(f"[SaveImagePlus] 计算 checkpoint 哈希成功: {hash_result}")
            return hash_result

        except Exception as e:
            print(f"[SaveImagePlus] 计算 checkpoint 哈希失败 ({checkpoint_name}): {e}")
            return ""

    def _calculate_lora_hashes_parallel(self, lora_names: List[str]) -> Dict[str, str]:
        """
        并行计算多个LoRA的哈希值（使用线程池）

        Args:
            lora_names: LoRA名称列表

        Returns:
            LoRA名称到哈希值的字典 {lora_name: hash_value}
        """
        if not lora_names:
            return {}

        result = {}

        # 如果只有一个LoRA或没有线程池，直接顺序计算
        if len(lora_names) == 1 or not hasattr(self, 'hash_executor'):
            for lora_name in lora_names:
                hash_value = self._calculate_lora_hash(lora_name)
                if hash_value:
                    result[lora_name] = hash_value
            return result

        # 使用线程池并行计算
        print(f"[SaveImagePlus] 并行计算 {len(lora_names)} 个 LoRA 哈希...")
        futures = {}

        for lora_name in lora_names:
            future = self.hash_executor.submit(self._calculate_lora_hash, lora_name)
            futures[future] = lora_name

        # 等待所有任务完成
        for future in as_completed(futures):
            lora_name = futures[future]
            try:
                hash_value = future.result()
                if hash_value:
                    result[lora_name] = hash_value
            except Exception as e:
                print(f"[SaveImagePlus] 并行计算 LoRA 哈希失败 ({lora_name}): {e}")

        print(f"[SaveImagePlus] 并行计算完成，成功获取 {len(result)}/{len(lora_names)} 个哈希")
        return result

    def _collect_metadata(
        self,
        positive_prompt: str = None,
        negative_prompt: str = None,
        lora_syntax: str = None,
        prompt_obj=None
    ) -> dict:
        """
        收集元数据（四级降级策略）

        Args:
            positive_prompt: 直接传入的正面提示词
            negative_prompt: 直接传入的负面提示词
            lora_syntax: 直接传入的 LoRA 语法
            prompt_obj: 来自 ComfyUI 的 prompt 对象（用于 元数据收集器 收集）

        Returns:
            包含完整生成参数的字典（A1111 格式所需的所有字段）
        """
        print("[SaveImagePlus] 开始收集元数据...")

        # 初始化结果字典，包含所有可能的字段
        result = {
            "prompt": "",
            "negative_prompt": "",
            "loras": "",
            "steps": None,
            "sampler": None,
            "scheduler": None,
            "cfg_scale": None,
            "seed": None,
            "size": None,
            "checkpoint": None,
        }

        # 级别 1: 优先使用直接传入的值
        print(f"[SaveImagePlus] 级别1 - 直接传入: positive={bool(positive_prompt)}, negative={bool(negative_prompt)}, loras={bool(lora_syntax)}")
        if positive_prompt:
            result["prompt"] = positive_prompt
        if negative_prompt:
            result["negative_prompt"] = negative_prompt
        if lora_syntax:
            result["loras"] = lora_syntax

        # 级别 2: 尝试使用 元数据收集器 的元数据收集
        if HAS_METADATA_COLLECTOR and prompt_obj:
            print("[SaveImagePlus] 级别2 - 尝试使用 元数据收集器 元数据收集...")
            try:
                # 获取原始元数据（使用顶部已导入的模块）
                raw_metadata = get_metadata()
                print(f"[SaveImagePlus] 获取到原始元数据: {bool(raw_metadata)}")

                # 使用静态方法提取参数
                if raw_metadata:
                    params = MetadataProcessor.extract_generation_params(raw_metadata)
                    print(f"[SaveImagePlus] 提取的参数键: {list(params.keys()) if params else None}")

                    # 提取所有参数（只在当前值为空时填充）
                    if not result["prompt"] and "prompt" in params:
                        result["prompt"] = params["prompt"]
                        print("[SaveImagePlus] 从 元数据收集器 获取 prompt")
                    if not result["negative_prompt"] and "negative_prompt" in params:
                        result["negative_prompt"] = params["negative_prompt"]
                        print("[SaveImagePlus] 从 元数据收集器 获取 negative_prompt")
                    if not result["loras"] and "loras" in params:
                        result["loras"] = params["loras"]
                        print("[SaveImagePlus] 从 元数据收集器 获取 loras")

                    # 提取生成参数
                    if result["steps"] is None and "steps" in params:
                        result["steps"] = params["steps"]
                        print(f"[SaveImagePlus] 从 元数据收集器 获取 steps: {result['steps']}")

                    if result["sampler"] is None and "sampler" in params:
                        result["sampler"] = params["sampler"]
                        print(f"[SaveImagePlus] 从 元数据收集器 获取 sampler: {result['sampler']}")

                    if result["scheduler"] is None and "scheduler" in params:
                        result["scheduler"] = params["scheduler"]
                        print(f"[SaveImagePlus] 从 元数据收集器 获取 scheduler: {result['scheduler']}")

                    # CFG scale 可能有多个字段名
                    if result["cfg_scale"] is None:
                        for cfg_key in ["cfg_scale", "cfg", "guidance"]:
                            if cfg_key in params:
                                result["cfg_scale"] = params[cfg_key]
                                print(f"[SaveImagePlus] 从 元数据收集器 获取 cfg_scale: {result['cfg_scale']}")
                                break

                    if result["seed"] is None and "seed" in params:
                        result["seed"] = params["seed"]
                        print(f"[SaveImagePlus] 从 元数据收集器 获取 seed: {result['seed']}")

                    if result["size"] is None and "size" in params:
                        result["size"] = params["size"]
                        print(f"[SaveImagePlus] 从 元数据收集器 获取 size: {result['size']}")

                    if result["checkpoint"] is None and "checkpoint" in params:
                        result["checkpoint"] = params["checkpoint"]
                        print(f"[SaveImagePlus] 从 元数据收集器 获取 checkpoint: {result['checkpoint']}")
                else:
                    print("[SaveImagePlus] raw_metadata 为空")
            except Exception as e:
                print(f"[SaveImagePlus] 元数据收集器 元数据收集失败: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[SaveImagePlus] 跳过级别2: HAS_METADATA_COLLECTOR={HAS_METADATA_COLLECTOR}, prompt_obj={bool(prompt_obj)}")

        # 级别 3: 从正面提示词中提取 LoRA（如果仍未获取）
        if not result["loras"] and result["prompt"]:
            print("[SaveImagePlus] 级别3 - 从 prompt 提取 LoRA...")
            lora_pattern = r'<lora:[^>]+>'
            loras_found = re.findall(lora_pattern, result["prompt"])
            if loras_found:
                result["loras"] = ", ".join(loras_found)
                print(f"[SaveImagePlus] 提取到 {len(loras_found)} 个 LoRA")
            else:
                print("[SaveImagePlus] 未找到 LoRA 语法")
        else:
            print(f"[SaveImagePlus] 跳过级别3: loras已有={bool(result['loras'])}, prompt={bool(result['prompt'])}")

        # 级别 4: 返回结果（可能部分为空）
        print(f"[SaveImagePlus] 元数据收集完成:")
        print(f"  - prompt: {bool(result['prompt'])}")
        print(f"  - negative_prompt: {bool(result['negative_prompt'])}")
        print(f"  - loras: {bool(result['loras'])}")
        print(f"  - steps: {result['steps']}")
        print(f"  - sampler: {result['sampler']}")
        print(f"  - scheduler: {result['scheduler']}")
        print(f"  - cfg_scale: {result['cfg_scale']}")
        print(f"  - seed: {result['seed']}")
        print(f"  - size: {result['size']}")
        print(f"  - checkpoint: {result['checkpoint']}")
        return result

    def _format_metadata(self, metadata: dict) -> str:
        """
        格式化元数据为 A1111 文本格式

        Args:
            metadata: 包含完整生成参数的字典（prompt, negative_prompt, loras, steps, sampler, etc.）

        Returns:
            A1111 格式的纯文本字符串
        """
        if not metadata:
            return ""

        # 提取基础信息
        prompt = metadata.get("prompt", "")
        negative_prompt = metadata.get("negative_prompt", "")
        loras_text = metadata.get("loras", "")

        # 计算 LoRA hashes（使用并行计算优化）
        lora_hashes = {}
        if loras_text:
            # 匹配格式: <lora:name:strength> 或 <lora:name>
            lora_matches = re.findall(r'<lora:([^:>]+)(?::([^>]+))?>', loras_text)
            lora_names = [match[0] for match in lora_matches]

            # 使用并行计算（如果有多个LoRA）
            if len(lora_names) > 1:
                lora_hashes = self._calculate_lora_hashes_parallel(lora_names)
            else:
                # 单个LoRA直接计算
                for lora_name in lora_names:
                    hash_value = self._get_lora_hash(lora_name)
                    if hash_value:
                        lora_hashes[lora_name] = hash_value

        # 第一部分：prompt（不包含 LoRA）
        metadata_parts = []
        if loras_text:
            # 如果有 LoRA，换行追加
            prompt_with_loras = f"{prompt}\n{loras_text}" if prompt else loras_text
            metadata_parts.append(prompt_with_loras)
        else:
            metadata_parts.append(prompt)

        # 第二部分：Negative prompt（A1111 格式要求此行必须存在，即使为空）
        metadata_parts.append(f"Negative prompt: {negative_prompt}")

        # 第三部分：参数列表（逗号分隔）
        params = []

        # Steps
        if metadata.get("steps") is not None:
            params.append(f"Steps: {metadata['steps']}")

        # Sampler（合并 Scheduler）
        sampler_name = None
        scheduler_name = None

        if metadata.get("sampler"):
            sampler = metadata["sampler"]
            sampler_name = self.sampler_mapping.get(sampler, sampler)

        if metadata.get("scheduler"):
            scheduler = metadata["scheduler"]
            scheduler_name = self.scheduler_mapping.get(scheduler, scheduler)

        # 合并 Sampler 和 Scheduler
        if sampler_name:
            if scheduler_name:
                params.append(f"Sampler: {sampler_name} {scheduler_name}")
            else:
                params.append(f"Sampler: {sampler_name}")

        # CFG scale
        if metadata.get("cfg_scale") is not None:
            params.append(f"CFG scale: {metadata['cfg_scale']}")

        # Seed
        if metadata.get("seed") is not None:
            params.append(f"Seed: {metadata['seed']}")

        # Size
        if metadata.get("size"):
            params.append(f"Size: {metadata['size']}")

        # Model hash 和 Model name
        if metadata.get("checkpoint"):
            checkpoint = metadata["checkpoint"]
            if checkpoint is not None:
                model_hash = self._get_checkpoint_hash(checkpoint)
                checkpoint_name = os.path.splitext(os.path.basename(checkpoint))[0]

                if model_hash:
                    params.append(f"Model hash: {model_hash[:10]}, Model: {checkpoint_name}")
                else:
                    params.append(f"Model: {checkpoint_name}")

        # Lora hashes
        if lora_hashes:
            lora_hash_parts = []
            for lora_name, hash_value in lora_hashes.items():
                lora_hash_parts.append(f"{lora_name}: {hash_value[:10]}")

            if lora_hash_parts:
                params.append(f"Lora hashes: \"{', '.join(lora_hash_parts)}\"")

        # 添加参数行
        if params:
            metadata_parts.append(", ".join(params))

        # 返回最终文本（换行分隔）
        result = "\n".join(metadata_parts)
        print(f"[SaveImagePlus] 生成的 A1111 元数据（前 300 字符）:\n{result[:300]}")
        return result

    def save_images(
        self,
        images,
        enable=True,
        filename_prefix="ComfyUI",
        file_format="PNG",
        quality=95,
        embed_workflow=True,
        save_clean_copy=False,
        enable_preview=True,
        positive_prompt=None,
        negative_prompt=None,
        lora_syntax=None,
        prompt=None,
        extra_pnginfo=None
    ):
        """
        保存图像主方法

        Args:
            images: 图像张量
            filename_prefix: 文件名前缀
            file_format: 保存格式（PNG/JPEG/WEBP）
            quality: JPEG/WebP 质量
            positive_prompt: 正面提示词（可选）
            negative_prompt: 负面提示词（可选）
            lora_syntax: LoRA 语法（可选）
            prompt: ComfyUI prompt 对象（隐藏参数）
            extra_pnginfo: ComfyUI 工作流信息（隐藏参数）

        Returns:
            保存结果字典
        """
        # 如果禁用保存，直接返回空结果
        if not enable:
            return {"ui": {"images": []}}

        # 收集元数据
        metadata = self._collect_metadata(
            positive_prompt=positive_prompt,
            negative_prompt=negative_prompt,
            lora_syntax=lora_syntax,
            prompt_obj=prompt
        )

        # 格式化元数据
        formatted_metadata = self._format_metadata(metadata)

        # 准备保存目录
        filename_prefix += self.prefix_append

        # 解析占位符（仅 date 和 seed）
        filename_prefix = self.format_filename(filename_prefix, prompt_obj=prompt)

        full_output_folder, filename, counter, subfolder, filename_prefix = \
            folder_paths.get_save_image_path(filename_prefix, self.output_dir, images[0].shape[1], images[0].shape[0])

        # 自动创建目录（如果不存在）
        if not os.path.exists(full_output_folder):
            os.makedirs(full_output_folder, exist_ok=True)

        results = list()

        for batch_number, image in enumerate(images):
            # 转换图像格式
            i = 255. * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))

            # 构建文件名
            file = f"{filename}_{counter:05}_.{file_format.lower()}"
            file_path = os.path.join(full_output_folder, file)

            # 根据格式保存
            if file_format == "PNG":
                # PNG 格式：使用 PngInfo 嵌入元数据
                metadata_png = PngInfo()

                # 嵌入 A1111 格式参数（formatted_metadata 现在是字符串）
                if formatted_metadata:
                    metadata_png.add_text("parameters", formatted_metadata)

                # 嵌入 ComfyUI 工作流（受 embed_workflow 开关控制）
                if embed_workflow and extra_pnginfo is not None:
                    for key, value in extra_pnginfo.items():
                        metadata_png.add_text(key, json.dumps(value))

                img.save(file_path, format="PNG", pnginfo=metadata_png, compress_level=self.compress_level)

            elif file_format in ["JPEG", "WEBP"]:
                # JPEG/WebP 格式：使用 exif 嵌入元数据
                exif_data = img.getexif()

                # UserComment 字段（标签 0x9286）（formatted_metadata 现在是字符串）
                if formatted_metadata:
                    exif_data[0x9286] = formatted_metadata.encode('utf-16')

                if file_format == "JPEG":
                    img.save(file_path, quality=quality, exif=exif_data)
                else:  # WEBP
                    img.save(file_path, quality=quality, exif=exif_data, method=6)

            results.append({
                "filename": file,
                "subfolder": subfolder,
                "type": self.type
            })

            # 保存纯净副本（无元数据和工作流）
            if save_clean_copy:
                # 生成纯净副本文件名
                clean_file = f"{filename}_{counter:05}_no_metadata.{file_format.lower()}"
                clean_path = os.path.join(full_output_folder, clean_file)

                # 保存为原始图像，不嵌入任何元数据
                if file_format == "PNG":
                    img.save(clean_path, compress_level=self.compress_level)
                elif file_format == "JPEG":
                    img.save(clean_path, quality=quality)
                else:  # WEBP
                    img.save(clean_path, quality=quality, method=6)

                # 添加到返回结果
                results.append({
                    "filename": clean_file,
                    "subfolder": subfolder,
                    "type": self.type
                })

            counter += 1

        # 根据 enable_preview 控制是否显示预览
        if enable_preview:
            return {"ui": {"images": results}}
        else:
            return {"ui": {"images": []}}


# 节点映射函数
def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "SaveImagePlus": SaveImagePlus
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "SaveImagePlus": "保存图像增强版 (Save Image Plus)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
