"""
简易Checkpoint加载器（Simple Checkpoint Loader）
基于Checkpoint Loader with Name节点，增加了VAE自定义选项
增强版本：添加了文件锁定、内存检查、重试机制等健壮性功能
"""

import folder_paths
import comfy.sd
import os
import sys
import time
import threading
from pathlib import Path

# 添加项目根目录到Python路径，以便导入自定义logger
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from py.utils.logger import get_logger

# 平台特定的文件锁实现
if sys.platform == 'win32':
    import msvcrt
else:
    import fcntl

# 配置常量 - 可以通过环境变量自定义
MAX_RETRY_ATTEMPTS = int(os.getenv('CHECKPOINT_LOADER_MAX_RETRIES', '3'))
BASE_RETRY_DELAY = float(os.getenv('CHECKPOINT_LOADER_RETRY_DELAY', '1.0'))  # 秒
MEMORY_SAFETY_THRESHOLD = float(os.getenv('CHECKPOINT_LOADER_MEMORY_THRESHOLD', '0.8'))  # 内存使用率安全阈值
FILE_LOCK_TIMEOUT = int(os.getenv('CHECKPOINT_LOADER_LOCK_TIMEOUT', '30'))  # 文件锁超时时间（秒）
ENABLE_FILE_LOCKING = os.getenv('CHECKPOINT_LOADER_ENABLE_FILE_LOCK', 'true').lower() == 'true'
ENABLE_MEMORY_CHECK = os.getenv('CHECKPOINT_LOADER_ENABLE_MEMORY_CHECK', 'true').lower() == 'true'

# 设置日志
logger = get_logger(__name__)

CATEGORY_TYPE = "danbooru"

class SimpleCheckpointLoaderWithName:
    """
    简易Checkpoint加载器
    加载diffusion模型checkpoint，并支持自定义VAE
    """

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "ckpt_name": (folder_paths.get_filename_list("checkpoints"), {
                    "tooltip": "要加载的checkpoint（模型）名称"
                }),
                "vae_name": (["Baked VAE"] + folder_paths.get_filename_list("vae"), {
                    "default": "Baked VAE",
                    "tooltip": "选择VAE模型，默认使用checkpoint内置的VAE"
                }),
                "clip_skip": ("INT", {
                    "default": -2,
                    "min": -24,
                    "max": -1,
                    "step": 1,
                    "tooltip": "CLIP跳过层数。-1=不跳过（使用最后一层），-2=跳过最后1层，以此类推"
                }),
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "STRING", "STRING")
    RETURN_NAMES = ("MODEL", "CLIP", "VAE", "model_name", "vae_name")
    OUTPUT_TOOLTIPS = (
        "用于对latent去噪的模型",
        "用于编码文本提示词的CLIP模型",
        "用于在图像和latent空间之间编码和解码的VAE模型",
        "模型名称，可用于Image Save节点保存模型名称",
        "VAE名称，显示当前使用的VAE（Baked VAE或自定义VAE文件名）"
    )

    FUNCTION = "load_checkpoint"
    CATEGORY = CATEGORY_TYPE
    DESCRIPTION = "增强版checkpoint加载器：支持文件锁、内存检查、自动重试等健壮性功能"

    def _acquire_file_lock(self, file_path, timeout=FILE_LOCK_TIMEOUT):
        """
        获取文件锁，防止并发访问

        Args:
            file_path: 要锁定的文件路径
            timeout: 锁定超时时间（秒）

        Returns:
            file object if successful, None if failed
        """
        file_handle = None
        try:
            # 确保文件存在
            if not os.path.exists(file_path):
                logger.error(f"文件不存在: {file_path}")
                return None

            if sys.platform == 'win32':
                # Windows文件锁定 - 使用更安全的方式
                file_handle = open(file_path, 'rb')
                start_time = time.time()
                retry_interval = 0.1  # 100ms重试间隔

                while time.time() - start_time < timeout:
                    try:
                        # 尝试获取锁定
                        msvcrt.locking(file_handle.fileno(), msvcrt.LK_NBLCK, 1)
                        logger.debug(f"成功获取Windows文件锁: {file_path}")
                        return file_handle
                    except OSError as e:
                        # 文件已被锁定，这是正常情况，继续重试
                        if e.errno == 33:  # ERROR_LOCK_VIOLATION on Windows
                            time.sleep(retry_interval)
                            continue
                        else:
                            logger.warning(f"Windows文件锁定异常 (errno {e.errno}): {str(e)}")
                            break
                    except Exception as e:
                        logger.warning(f"Windows文件锁定意外错误: {str(e)}")
                        break

                # 超时或失败，关闭文件句柄
                if file_handle:
                    file_handle.close()
                return None

            else:
                # Unix文件锁定
                file_handle = open(file_path, 'rb')
                start_time = time.time()
                retry_interval = 0.1  # 100ms重试间隔

                while time.time() - start_time < timeout:
                    try:
                        fcntl.flock(file_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                        logger.debug(f"成功获取Unix文件锁: {file_path}")
                        return file_handle
                    except (OSError, IOError) as e:
                        # 文件已被锁定，继续重试
                        if e.errno in (11, 35):  # EAGAIN or EWOULDBLOCK
                            time.sleep(retry_interval)
                            continue
                        else:
                            logger.warning(f"Unix文件锁定异常 (errno {e.errno}): {str(e)}")
                            break

                # 超时或失败，关闭文件句柄
                if file_handle:
                    file_handle.close()
                return None

        except Exception as e:
            logger.error(f"获取文件锁时发生未预期错误: {file_path}, 错误: {str(e)}")
            if file_handle and not file_handle.closed:
                file_handle.close()
            return None

    def _release_file_lock(self, file_handle):
        """
        释放文件锁

        Args:
            file_handle: 文件句柄
        """
        try:
            if file_handle and not file_handle.closed:
                if sys.platform == 'win32':
                    msvcrt.locking(file_handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(file_handle.fileno(), fcntl.LOCK_UN)
                file_handle.close()
                logger.info("文件锁已释放")
        except Exception as e:
            logger.error(f"释放文件锁失败: {str(e)}")

    def _check_memory_safety(self, checkpoint_path):
        """
        检查内存安全性

        Args:
            checkpoint_path: checkpoint文件路径

        Returns:
            tuple: (is_safe, memory_info)
        """
        try:
            # 尝试导入psutil进行内存检查
            import psutil

            # 获取系统内存信息
            memory = psutil.virtual_memory()
            available_memory_gb = memory.available / (1024**3)
            memory_usage_percent = memory.percent

            # 获取checkpoint文件大小
            file_size_gb = os.path.getsize(checkpoint_path) / (1024**3)

            # 估算加载模型所需的内存（文件大小的3-5倍）
            estimated_memory_needed = file_size_gb * 4

            is_safe = (memory_usage_percent < MEMORY_SAFETY_THRESHOLD * 100 and
                      available_memory_gb > estimated_memory_needed)

            memory_info = {
                'available_memory_gb': available_memory_gb,
                'memory_usage_percent': memory_usage_percent,
                'file_size_gb': file_size_gb,
                'estimated_memory_needed_gb': estimated_memory_needed,
                'is_safe': is_safe
            }

            logger.info(f"内存安全检查结果: {memory_info}")
            return is_safe, memory_info

        except ImportError:
            logger.warning("psutil未安装，跳过内存安全检查")
            return True, {'reason': 'psutil_not_available'}
        except Exception as e:
            logger.error(f"内存安全检查失败: {str(e)}")
            return True, {'reason': 'check_failed', 'error': str(e)}

    def _validate_checkpoint_file(self, checkpoint_path):
        """
        验证checkpoint文件完整性

        Args:
            checkpoint_path: checkpoint文件路径

        Returns:
            bool: 文件是否有效
        """
        try:
            file_size = os.path.getsize(checkpoint_path)
            if file_size == 0:
                logger.error(f"Checkpoint文件为空: {checkpoint_path}")
                return False

            # 检查文件是否可读
            with open(checkpoint_path, 'rb') as f:
                # 读取文件头部检查基本结构
                header = f.read(1024)
                if not header:
                    logger.error(f"无法读取checkpoint文件头部: {checkpoint_path}")
                    return False

            logger.info(f"Checkpoint文件验证通过: {checkpoint_path} ({file_size / (1024**3):.2f}GB)")
            return True

        except Exception as e:
            logger.error(f"Checkpoint文件验证失败: {checkpoint_path}, 错误: {str(e)}")
            return False

    def load_checkpoint(self, ckpt_name, vae_name, clip_skip):
        """
        增强版checkpoint加载方法，包含文件锁、内存检查、重试机制

        Args:
            ckpt_name: checkpoint模型名称
            vae_name: VAE模型名称
            clip_skip: CLIP跳过层数

        Returns:
            tuple: (MODEL, CLIP, VAE, model_name, vae_name)
        """
        logger.info(f"开始加载checkpoint: {ckpt_name}, VAE: {vae_name}, CLIP Skip: {clip_skip}")

        # 获取checkpoint文件路径
        ckpt_path = folder_paths.get_full_path_or_raise("checkpoints", ckpt_name)
        logger.info(f"Checkpoint文件路径: {ckpt_path}")

        # 验证checkpoint文件
        if not self._validate_checkpoint_file(ckpt_path):
            raise RuntimeError(f"Checkpoint文件验证失败: {ckpt_name}")

        # 内存安全检查（可配置）
        if ENABLE_MEMORY_CHECK:
            is_memory_safe, memory_info = self._check_memory_safety(ckpt_path)
            if not is_memory_safe:
                logger.warning(f"内存可能不足: {memory_info}")
                # 这里不直接失败，而是给出警告，让用户自己决定是否继续
        else:
            logger.debug("内存检查已禁用")

        # 文件锁和重试机制
        file_lock = None
        last_exception = None

        for attempt in range(MAX_RETRY_ATTEMPTS):
            try:
                logger.info(f"加载尝试 {attempt + 1}/{MAX_RETRY_ATTEMPTS}")

                # 获取文件锁（可配置）
                if ENABLE_FILE_LOCKING:
                    file_lock = self._acquire_file_lock(ckpt_path)
                    if not file_lock:
                        logger.warning(f"无法获取文件锁，尝试 {attempt + 1}/{MAX_RETRY_ATTEMPTS}")
                        if attempt < MAX_RETRY_ATTEMPTS - 1:
                            time.sleep(BASE_RETRY_DELAY * (2 ** attempt))  # 指数退避
                            continue
                        else:
                            raise RuntimeError(f"无法获取文件锁: {ckpt_path}")
                    logger.debug("文件锁获取成功，开始加载checkpoint...")
                else:
                    logger.debug("文件锁定已禁用，直接开始加载")
                    file_lock = None

                # 实际的checkpoint加载（关键操作）
                try:
                    out = comfy.sd.load_checkpoint_guess_config(
                        ckpt_path,
                        output_vae=True,
                        output_clip=True,
                        embedding_directory=folder_paths.get_folder_paths("embeddings")
                    )
                    logger.info("checkpoint加载成功")
                except Exception as e:
                    logger.error(f"load_checkpoint_guess_config失败: {str(e)}")
                    # 检查是否是内存访问违规
                    if "access violation" in str(e).lower() or "memory" in str(e).lower():
                        logger.error("检测到内存访问错误，可能是内存不足或文件损坏")
                    raise

                model, clip, vae = out[:3]
                logger.info("模型组件解包成功")

                # 如果选择了自定义VAE（不是Baked VAE），则加载自定义VAE
                if vae_name != "Baked VAE":
                    logger.info(f"加载自定义VAE: {vae_name}")
                    vae_path = folder_paths.get_full_path_or_raise("vae", vae_name)

                    # 验证VAE文件
                    if not self._validate_checkpoint_file(vae_path):
                        raise RuntimeError(f"VAE文件验证失败: {vae_name}")

                    try:
                        vae = comfy.sd.VAE(sd=comfy.utils.load_torch_file(vae_path))
                        logger.info("自定义VAE加载成功")
                    except Exception as e:
                        logger.error(f"自定义VAE加载失败: {str(e)}")
                        raise RuntimeError(f"VAE加载失败: {vae_name}, 错误: {str(e)}")

                # 应用CLIP跳过层设置
                if clip_skip < -1:
                    logger.info(f"应用CLIP跳过层设置: {clip_skip}")
                    try:
                        clip = clip.clone()
                        clip.clip_layer(clip_skip)
                        logger.info("CLIP跳过层设置应用成功")
                    except Exception as e:
                        logger.error(f"CLIP跳过层设置失败: {str(e)}")
                        raise RuntimeError(f"CLIP跳过层设置失败: {str(e)}")

                logger.info(f"checkpoint加载完成: {ckpt_name}")
                return (model, clip, vae, ckpt_name, vae_name)

            except Exception as e:
                last_exception = e
                logger.error(f"加载尝试 {attempt + 1} 失败: {str(e)}")

                # 如果不是最后一次尝试，等待后重试
                if attempt < MAX_RETRY_ATTEMPTS - 1:
                    retry_delay = BASE_RETRY_DELAY * (2 ** attempt)
                    logger.info(f"等待 {retry_delay:.1f} 秒后重试...")
                    time.sleep(retry_delay)

            finally:
                # 释放文件锁（如果启用）
                if ENABLE_FILE_LOCKING and file_lock:
                    self._release_file_lock(file_lock)
                    file_lock = None

        # 所有尝试都失败了
        error_msg = f"checkpoint加载失败，已尝试 {MAX_RETRY_ATTEMPTS} 次: {ckpt_name}"
        if last_exception:
            error_msg += f"\n最后错误: {str(last_exception)}"
            logger.error(f"{error_msg}\n异常类型: {type(last_exception).__name__}")

        raise RuntimeError(error_msg)


def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "SimpleCheckpointLoaderWithName": SimpleCheckpointLoaderWithName
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "SimpleCheckpointLoaderWithName": "简易Checkpoint加载器 (Simple Checkpoint Loader)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
