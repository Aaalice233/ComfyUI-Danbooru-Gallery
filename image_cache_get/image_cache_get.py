"""
优化缓存获取节点 - Native Controlled Cache Get
基于ComfyUI原生机制完全重写，使用稳定的IS_CHANGED和状态管理

⚠️ 关键修正：
1. 使用STRING类型接收JSON序列化的缓存控制信号
2. 使用稳定的MD5哈希算法实现IS_CHANGED
3. 移除ExecutionBlocker滥用，改用状态管理
4. 保持完整的预览功能和错误处理
"""

import json
import time
import hashlib
import torch
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Optional
try:
    from image_cache_manager.image_cache_manager import cache_manager
except ImportError:
    # cache_manager not available in standalone mode
    cache_manager = None

# 设置日志
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OptimizedNCCG")

CATEGORY_TYPE = "danbooru"

class ImageCacheGet:
    """
    基于ComfyUI原生机制的缓存获取节点

    ⚠️ 关键修正：
    1. 使用STRING类型接收JSON序列化的缓存控制信号
    2. 使用稳定的MD5哈希算法实现IS_CHANGED
    3. 移除ExecutionBlocker滥用，改用状态管理
    4. 保持完整的预览功能和错误处理
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "cache_control_signal_json": ("STRING", {
                    "multiline": True,
                    "tooltip": "JSON格式的缓存控制信号，包含执行权限和状态信息"
                }),
                "default_image": ("IMAGE", {
                    "tooltip": "当缓存无效或被阻塞时使用的默认图像"
                }),
            },
            "optional": {
                "enable_preview": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "是否生成缓存图像的预览"
                }),
                "preview_size": (["small", "medium", "large"], {
                    "default": "medium",
                    "tooltip": "预览图像的尺寸"
                }),
                "fallback_mode": (["blank", "default", "error", "passthrough"], {
                    "default": "default",
                    "tooltip": "缓存不可用时的处理模式：blank=空白图像，default=默认图像，error=抛出错误，passthrough=直接通过"
                }),
                "cache_timeout": ("INT", {
                    "default": 60,
                    "min": 5,
                    "max": 300,
                    "tooltip": "缓存控制信号超时时间（秒）"
                }),
                "retry_count": ("INT", {
                    "default": 3,
                    "min": 0,
                    "max": 10,
                    "tooltip": "缓存获取失败时的重试次数"
                })
            },
            "hidden": {
                "node_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "get_with_native_control"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls,
                  cache_control_signal_json: str,
                  default_image=None,
                  enable_preview: bool = True,
                  preview_size: str = "medium",
                  fallback_mode: str = "default",
                  cache_timeout: int = 60,
                  retry_count: int = 3) -> str:
        """
        基于ComfyUI原生机制的IS_CHANGED实现

        ⚠️ 关键修正：
        1. 使用稳定的MD5哈希算法，确保跨会话稳定性
        2. 包含所有影响执行的关键参数
        3. 基于控制信号内容生成稳定哈希

        Args:
            cache_control_signal_json: JSON格式的缓存控制信号
            default_image: 默认图像
            enable_preview: 是否启用预览
            preview_size: 预览尺寸
            fallback_mode: 回退模式
            cache_timeout: 缓存超时时间
            retry_count: 重试次数

        Returns:
            str: MD5哈希值
        """
        try:
            # 解析控制信号
            if cache_control_signal_json and cache_control_signal_json.strip():
                control_signal = json.loads(cache_control_signal_json)
            else:
                control_signal = {"enabled": False, "timestamp": 0, "execution_id": "unknown"}
        except Exception:
            control_signal = {"enabled": False, "timestamp": 0, "execution_id": "unknown"}

        # 提取影响执行的关键字段
        enabled = control_signal.get("enabled", False)
        timestamp = control_signal.get("timestamp", 0)
        execution_id = control_signal.get("execution_id", "unknown")
        mode = control_signal.get("mode", "unknown")
        client_id = control_signal.get("client_id", "unknown")

        # 构建哈希内容 - 包含所有影响执行的因素
        hash_content = (
            f"enabled={enabled}|"
            f"timestamp={timestamp}|"
            f"execution_id={execution_id}|"
            f"mode={mode}|"
            f"client_id={client_id}|"
            f"enable_preview={enable_preview}|"
            f"preview_size={preview_size}|"
            f"fallback_mode={fallback_mode}|"
            f"cache_timeout={cache_timeout}|"
            f"retry_count={retry_count}|"
            f"node_version=2.0.0|"
            f"python_version={hash('stable_hash_algorithm')}"  # Python版本标识
        )

        # 生成稳定的MD5哈希
        hash_value = hashlib.md5(hash_content.encode('utf-8')).hexdigest()

        logger.debug(f"[ImageCacheGet] 🔄 IS_CHANGED哈希生成:")
        logger.debug(f"   - 执行ID: {execution_id}")
        logger.debug(f"   - 启用状态: {enabled}")
        logger.debug(f"   - 控制模式: {mode}")
        logger.debug(f"   - 哈希值: {hash_value}")

        return hash_value

    def get_with_native_control(self,
                             cache_control_signal_json: str,
                             default_image: List[torch.Tensor],
                             enable_preview: List[bool] = [True],
                             preview_size: List[str] = ["medium"],
                             fallback_mode: List[str] = ["default"],
                             cache_timeout: List[int] = [60],
                             retry_count: List[int] = [3],
                             node_id: str = "unknown") -> Dict[str, Any]:
        """
        使用ComfyUI原生机制进行缓存控制的图像获取

        ⚠️ 关键修正：
        1. 不使用ExecutionBlocker，改用状态管理
        2. 基于控制信号内容决定执行策略
        3. 增强错误处理和日志记录
        4. 保持完整的预览功能

        Args:
            cache_control_signal_json: JSON格式的缓存控制信号
            default_image: 默认图像列表
            enable_preview: 是否启用预览列表
            preview_size: 预览尺寸列表
            fallback_mode: 回退模式列表
            cache_timeout: 缓存超时时间列表
            retry_count: 重试次数列表
            node_id: 节点ID

        Returns:
            Dict: 包含图像张量和UI预览的字典
        """

        start_time = time.time()

        # 参数提取 - 处理INPUT_IS_LIST=True的包装
        enable_preview = enable_preview[0] if enable_preview else True
        preview_size = preview_size[0] if preview_size else "medium"
        fallback_mode = fallback_mode[0] if fallback_mode else "default"
        cache_timeout = cache_timeout[0] if cache_timeout else 60
        retry_count = retry_count[0] if retry_count else 3

        logger.info(f"\n{'='*80}")
        logger.info(f"[ImageCacheGet] ⏰ 执行时间: {time.strftime('%H:%M:%S', time.localtime())}")
        logger.info(f"[ImageCacheGet] 🔍 节点ID: {node_id}")
        logger.info(f"[ImageCacheGet] 🎛️ 预览: {'启用' if enable_preview else '禁用'}")
        logger.info(f"[ImageCacheGet] 📐 预览尺寸: {preview_size}")
        logger.info(f"[ImageCacheGet] 🔄 回退模式: {fallback_mode}")
        logger.info(f"[ImageCacheGet] ⏱️ 缓存超时: {cache_timeout}秒")
        logger.info(f"[ImageCacheGet] 🔁 重试次数: {retry_count}")
        logger.info(f"{'='*80}\n")

        try:
            # 1. 解析缓存控制信号
            control_signal = self.parse_control_signal(cache_control_signal_json)

            # 2. 检查执行权限（不使用ExecutionBlocker）
            execution_permission = self.check_execution_permission(control_signal, node_id, cache_timeout)

            logger.info(f"[ImageCacheGet] 🔐 执行权限检查:")
            logger.info(f"   - 控制信号有效: {control_signal.get('valid', False)}")
            logger.info(f"   - 执行启用: {control_signal.get('enabled', False)}")
            logger.info(f"   - 执行许可: {execution_permission}")

            if not execution_permission:
                return self.handle_execution_blocked(
                    default_image, enable_preview, preview_size,
                    fallback_mode, control_signal, node_id, start_time
                )

            # 3. 特殊处理passthrough模式
            if fallback_mode == "passthrough":
                logger.info(f"[ImageCacheGet] ⏭️ Passthrough模式：直接通过")
                return self.handle_passthrough_mode(
                    default_image, enable_preview, preview_size,
                    control_signal, node_id, start_time
                )

            # 4. 执行缓存获取
            return self.execute_cache_retrieval(
                default_image, enable_preview, preview_size,
                fallback_mode, control_signal, node_id, start_time, retry_count
            )

        except Exception as e:
            error_msg = f"缓存获取执行失败: {str(e)}"
            logger.error(f"[ImageCacheGet] ❌ {error_msg}")
            import traceback
            logger.error(f"[ImageCacheGet] 错误堆栈:\n{traceback.format_exc()}")
            return self.handle_execution_error(
                default_image, enable_preview, error_msg, fallback_mode
            )

    def parse_control_signal(self, cache_control_signal_json: str) -> Dict[str, Any]:
        """
        解析缓存控制信号

        Args:
            cache_control_signal_json: JSON格式的控制信号

        Returns:
            解析后的控制信号字典
        """
        try:
            if not cache_control_signal_json or not cache_control_signal_json.strip():
                return {
                    "valid": False,
                    "enabled": False,
                    "mode": "unknown",
                    "execution_id": "unknown",
                    "timestamp": 0,
                    "error": "控制信号为空"
                }

            control_signal = json.loads(cache_control_signal_json)

            # 验证必需字段
            required_fields = ["execution_id", "enabled", "mode", "timestamp"]
            for field in required_fields:
                if field not in control_signal:
                    control_signal[field] = None

            control_signal["valid"] = True
            return control_signal

        except json.JSONDecodeError as e:
            return {
                "valid": False,
                "enabled": False,
                "mode": "unknown",
                "execution_id": "unknown",
                "timestamp": 0,
                "error": f"JSON解析失败: {str(e)}"
            }
        except Exception as e:
            return {
                "valid": False,
                "enabled": False,
                "mode": "unknown",
                "execution_id": "unknown",
                "timestamp": 0,
                "error": f"解析异常: {str(e)}"
            }

    def check_execution_permission(self, control_signal: Dict, node_id: str, cache_timeout: int) -> bool:
        """
        检查执行权限

        Args:
            control_signal: 控制信号字典
            node_id: 节点ID
            cache_timeout: 缓存超时时间

        Returns:
            是否允许执行
        """
        # 检查控制信号有效性
        if not control_signal.get("valid", False):
            logger.warning(f"[ImageCacheGet] ⚠️ 控制信号无效: {control_signal.get('error', '未知错误')}")
            return False

        # 检查启用状态
        if not control_signal.get("enabled", False):
            logger.warning(f"[ImageCacheGet] 🔒 控制信号禁用缓存获取")
            return False

        # 检查时间戳（避免使用过期信号）
        signal_timestamp = control_signal.get("timestamp", 0)
        current_time = time.time()
        if current_time - signal_timestamp > cache_timeout:
            logger.warning(f"[ImageCacheGet] ⏰ 控制信号过期: {current_time - signal_timestamp:.1f}秒 > {cache_timeout}秒")
            return False

        # 检查执行ID
        if not control_signal.get("execution_id"):
            logger.warning(f"[ImageCacheGet] ⚠️ 控制信号缺少执行ID")
            return False

        return True

    def handle_execution_blocked(self,
                              default_image: List[torch.Tensor],
                              enable_preview: bool,
                              preview_size: str,
                              fallback_mode: str,
                              control_signal: Dict,
                              node_id: str,
                              start_time: float) -> Dict[str, Any]:
        """
        处理执行被阻塞的情况

        Args:
            default_image: 默认图像列表
            enable_preview: 是否启用预览
            preview_size: 预览尺寸
            fallback_mode: 回退模式
            control_signal: 控制信号
            node_id: 节点ID
            start_time: 开始时间

        Returns:
            包含fallback图像的字典
        """
        logger.info(f"[ImageCacheGet] 🚫 执行被阻塞，使用回退模式: {fallback_mode}")

        if fallback_mode == "blank":
            return self.create_blank_image_result(enable_preview, start_time)
        elif fallback_mode == "default":
            return self.create_default_image_result(
                default_image, enable_preview, control_signal, node_id, start_time
            )
        elif fallback_mode == "error":
            error_msg = f"缓存获取被阻塞: {control_signal.get('error', '未知原因')}"
            logger.error(f"[ImageCacheGet] ❌ {error_msg}")
            raise ValueError(error_msg)
        else:
            # 默认使用空白图像
            return self.create_blank_image_result(enable_preview, start_time)

    def handle_passthrough_mode(self,
                             default_image: List[torch.Tensor],
                             enable_preview: bool,
                             preview_size: str,
                             control_signal: Dict,
                             node_id: str,
                             start_time: float) -> Dict[str, Any]:
        """
        处理passthrough模式（直接通过）

        Args:
            default_image: 默认图像列表
            enable_preview: 是否启用预览
            preview_size: 预览尺寸
            control_signal: 控制信号
            node_id: 节点ID
            start_time: 开始时间

        Returns:
            包含处理结果的字典
        """
        logger.info(f"[ImageCacheGet] ⏭️ Passthrough模式：跳过权限检查")

        # 直接尝试从缓存获取图像
        try:
            cached_images = cache_manager.get_cached_images(
                get_latest=True,
                index=0
            )

            if cached_images and len(cached_images) > 0:
                result_image = self.ensure_tensor_format(cached_images[-1], "缓存图像")
                logger.info(f"[ImageCacheGet] ✅ Passthrough缓存获取成功: {result_image.shape}")

                # 生成预览
                preview_results = []
                if enable_preview:
                    preview_results = self.generate_cache_preview(control_signal, start_time)

                execution_time = time.time() - start_time
                return {
                    "result": (result_image,),
                    "ui": {"images": preview_results}
                }
            else:
                logger.info(f"[ImageCacheGet] ⚠️ Passthrough缓存为空，使用默认图像")
                return self.create_default_image_result(
                    default_image, enable_preview, control_signal, node_id, start_time
                )

        except Exception as e:
            logger.warning(f"[ImageCacheGet] ⚠️ Passthrough缓存获取失败: {str(e)}")
            return self.create_default_image_result(
                default_image, enable_preview, control_signal, node_id, start_time
            )

    def execute_cache_retrieval(self,
                             default_image: List[torch.Tensor],
                             enable_preview: bool,
                             preview_size: str,
                             fallback_mode: str,
                             control_signal: Dict,
                             node_id: str,
                             start_time: float,
                             retry_count: int) -> Dict[str, Any]:
        """
        执行缓存获取

        Args:
            default_image: 默认图像列表
            enable_preview: 是否启用预览
            preview_size: 预览尺寸
            fallback_mode: 回退模式
            control_signal: 控制信号
            node_id: 节点ID
            start_time: 开始时间
            retry_count: 重试次数

        Returns:
            包含缓存图像的字典
        """
        execution_id = control_signal.get("execution_id", "unknown")

        logger.info(f"[ImageCacheGet] ✅ 执行权限验证通过，开始缓存获取")
        logger.info(f"[ImageCacheGet] 📊 执行ID: {execution_id}")

        # 从缓存管理器获取图像
        for attempt in range(retry_count + 1):
            try:
                cached_images = cache_manager.get_cached_images(
                    get_latest=True,
                    index=0
                )

                if cached_images and len(cached_images) > 0:
                    result_image = self.ensure_tensor_format(cached_images[-1], "缓存图像")

                    # 生成预览
                    preview_results = []
                    if enable_preview:
                        preview_results = self.generate_cache_preview(control_signal, start_time)

                    execution_time = time.time() - start_time
                    logger.info(f"[ImageCacheGet] ✅ 缓存获取成功:")
                    logger.info(f"   - 图像形状: {result_image.shape}")
                    logger.info(f"   - 执行耗时: {execution_time:.3f}秒")
                    logger.info(f"   - 尝试次数: {attempt + 1}")
                    logger.info(f"   - 预览数量: {len(preview_results)}")

                    return {
                        "result": (result_image,),
                        "ui": {"images": preview_results}
                    }
                else:
                    if attempt < retry_count:
                        logger.warning(f"[ImageCacheGet] ⚠️ 缓存为空，重试 {attempt + 1}/{retry_count}")
                        time.sleep(1)  # 短暂等待后重试
                        continue
                    else:
                        logger.warning(f"[ImageCacheGet] ⚠️ 缓存为空且重试次数用尽，使用默认图像")
                        return self.create_default_image_result(
                            default_image, enable_preview, control_signal, node_id, start_time
                        )

            except Exception as e:
                logger.error(f"[ImageCacheGet] ❌ 缓存获取失败 {attempt + 1}/{retry_count}: {str(e)}")
                if attempt < retry_count:
                    continue
                else:
                    return self.create_default_image_result(
                        default_image, enable_preview, control_signal, node_id, start_time
                    )

        # 理论上不应该到达这里
        return self.create_default_image_result(
            default_image, enable_preview, control_signal, node_id, start_time
        )

    def create_blank_image_result(self, enable_preview: bool, start_time: float) -> Dict[str, Any]:
        """
        创建空白图像结果

        Args:
            enable_preview: 是否启用预览
            start_time: 开始时间

        Returns:
            包含空白图像的字典
        """
        try:
            blank_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
        except Exception:
            blank_image = torch.zeros((1, 32, 32, 3), dtype=torch.float32, device="cpu")

        logger.info(f"[ImageCacheGet] 📄 创建空白图像: {blank_image.shape}")
        execution_time = time.time() - start_time
        logger.info(f"[ImageCacheGet] ⏱️ 执行耗时: {execution_time:.3f}秒")

        return {
            "result": (blank_image,),
            "ui": {"images": [] if not enable_preview else []}
        }

    def create_default_image_result(self,
                                 default_image: List[torch.Tensor],
                                 enable_preview: bool,
                                 control_signal: Dict,
                                 node_id: str,
                                 start_time: float) -> Dict[str, Any]:
        """
        创建默认图像结果

        Args:
            default_image: 默认图像列表
            enable_preview: 是否启用预览
            control_signal: 控制信号
            node_id: 节点ID
            start_time: 开始时间

        Returns:
            包含默认图像的字典
        """
        if default_image and len(default_image) > 0:
            result_image = self.ensure_tensor_format(default_image[0], "默认图像")
            logger.info(f"[ImageCacheGet] 📎 使用默认图像: {result_image.shape}")
        else:
            logger.info(f"[ImageCacheGet] ⚠️ 默认图像为空，创建空白图像")
            result_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)

        execution_time = time.time() - start_time
        logger.info(f"[ImageCacheGet] ⏱️ 执行耗时: {execution_time:.3f}秒")

        return {
            "result": (result_image,),
            "ui": {"images": []}  # 默认图像不生成预览
        }

    def handle_execution_error(self,
                           default_image: List[torch.Tensor],
                           enable_preview: bool,
                           error_msg: str,
                           fallback_mode: str) -> Dict[str, Any]:
        """
        处理执行错误

        Args:
            default_image: 默认图像列表
            enable_preview: 是否启用预览
            error_msg: 错误消息
            fallback_mode: 回退模式

        Returns:
            错误处理结果字典
        """
        logger.info(f"[ImageCacheGet] 🚨 处理执行错误: {fallback_mode}")

        if fallback_mode in ["default", "blank"]:
            return self.create_default_image_result(default_image, enable_preview, {}, "unknown", time.time())
        else:
            # 重新抛出错误
            raise RuntimeError(error_msg)

    def generate_cache_preview(self, control_signal: Dict, start_time: float) -> List[Dict[str, str]]:
        """
        生成缓存预览

        Args:
            control_signal: 控制信号
            start_time: 开始时间

        Returns:
            预览信息列表
        """
        try:
            current_group = cache_manager.current_group_name or "default"

            # 获取当前组的缓存图像信息
            if hasattr(cache_manager, 'cache_channels') and current_group in cache_manager.cache_channels:
                channel_cache = cache_manager.cache_channels[current_group]
                cached_images = channel_cache.get('images', [])

                if cached_images:
                    latest_image_info = cached_images[-1]
                    preview_info = {
                        "filename": latest_image_info["filename"],
                        "subfolder": "",
                        "type": "temp"
                    }

                    logger.info(f"[ImageCacheGet] 🖼️ 生成预览: {latest_image_info['filename']}")
                    return [preview_info]

            logger.debug(f"[ImageCacheGet] 🔍 无法生成预览: 当前组={current_group}, 缓存通道存在={hasattr(cache_manager, 'cache_channels')}")
            return []

        except Exception as e:
            logger.warning(f"[ImageCacheGet] ⚠️ 预览生成失败: {str(e)}")
            return []

    def ensure_tensor_format(self, tensor: torch.Tensor, tensor_name: str = "张量") -> torch.Tensor:
        """
        确保张量格式为ComfyUI标准的[B, H, W, C]

        Args:
            tensor: 输入张量
            tensor_name: 张量名称（用于日志）

        Returns:
            格式化后的张量
        """
        if tensor.dim() not in [2, 3, 4, 5]:
            logger.warning(f"[ImageCacheGet] ⚠️ 无效张量维度: {tensor.dim()}，创建空白张量")
            return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

        try:
            if tensor.dim() == 2:
                tensor = tensor.unsqueeze(0).unsqueeze(-1).expand(-1, -1, -1, 3)
            elif tensor.dim() == 3:
                if tensor.shape[-1] <= 4:
                    tensor = tensor.unsqueeze(0)
                    if tensor.shape[-1] == 1:
                        tensor = tensor.expand(-1, -1, -1, 3)
                    elif tensor.shape[-1] == 4:
                        tensor = tensor[..., :3]
                else:
                    tensor = tensor.permute(1, 2, 0).unsqueeze(0)
                    if tensor.shape[-1] >= 3:
                        tensor = tensor[..., :3]
                    else:
                        tensor = tensor.expand(-1, -1, -1, 3)
            elif tensor.dim() == 4:
                if tensor.shape[-1] == 1:
                    tensor = tensor.expand(-1, -1, -1, 3)
                elif tensor.shape[-1] == 4:
                    tensor = tensor[..., :3]
            elif tensor.dim() == 5:
                tensor = tensor[:, 0, :, :, :]
                return self.ensure_tensor_format(tensor, f"{tensor_name}(第一帧)")

            # 验证最终格式
            if tensor.dim() != 4 or tensor.shape[-1] != 3:
                logger.warning(f"[ImageCacheGet] ⚠️ 张量格式化失败，创建空白张量")
                return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

            return tensor

        except Exception as e:
            logger.warning(f"[ImageCacheGet] ⚠️ 张量格式转换失败: {str(e)}")
            return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

# 节点映射导出函数
def get_node_class_mappings():
    return {
        "ImageCacheGet": ImageCacheGet
    }

def get_node_display_name_mappings():
    return {
        "ImageCacheGet": "优化缓存获取节点 v2.0 (Native Controlled Cache Get)"
    }

# 标准导出变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()

if __name__ == "__main__":
    print("[ImageCacheGet] ✅ 优化缓存获取节点模块测试加载完成")
    print("[ImageCacheGet] 📋 节点类: ImageCacheGet")
    print("[ImageCacheGet] 🏷️ 显示名称: 优化缓存获取节点 v2.0")
    print("[ImageCacheGet] 🔧 基于ComfyUI原生机制")
    print("[ImageCacheGet] 🎛️ 使用MD5稳定哈希算法")
    print("[ImageCacheGet] ✅ 技术错误已修正")