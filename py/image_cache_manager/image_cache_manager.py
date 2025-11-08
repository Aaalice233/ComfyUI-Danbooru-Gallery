"""
图像缓存管理器 - 单例模式管理全局图像缓存
"""

import sys
import os
import time
import threading
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

class ImageCacheManager:
    """
    图像缓存管理器 - 单例模式管理全局图像缓存
    """
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            # 实例ID，用于追踪是否为同一个对象
            self.instance_id = id(self)
            logger.debug(f" New instance created with ID: {self.instance_id}")

            # 线程锁，确保线程安全
            self._lock = threading.RLock()  # 使用RLock支持递归锁定

            # 多通道缓存数据（基于组名）
            self.cache_channels = {}  # {channel_name: {"images": [], "timestamp": 0, "metadata": {}}}

            # 当前执行的组名（由组执行管理器设置）
            self.current_group_name = None

            # 向后兼容：默认通道
            self.cache_data = {
                "images": [],
                "timestamp": 0,
                "metadata": {}
            }

            # 增强的会话追踪字段
            self.session_execution_count = 0          # 当前会话中保存缓存的次数
            self.last_save_timestamp = 0              # 最后一次保存缓存的时间戳
            self.has_saved_this_session = False       # 当次会话是否已保存过缓存
            self.session_start_time = time.time()     # 当前会话开始时间
            self.session_id = int(time.time())        # 会话唯一ID
            self.last_get_timestamp = 0               # 最后一次获取缓存的时间戳
            self.get_count_this_session = 0           # 当前会话中获取缓存的次数

            # 最后一次操作信息
            self._last_operation = None

            # 延迟导入folder_paths
            try:
                import folder_paths
                self.output_dir = folder_paths.get_temp_directory()
            except ImportError:
                # 如果在ComfyUI环境外，使用临时目录
                import tempfile
                self.output_dir = tempfile.gettempdir()
                logger.warning(" Not in ComfyUI environment, using system temp directory")
            except Exception:
                import tempfile
                self.output_dir = tempfile.gettempdir()
                logger.warning(" Cannot import folder_paths, using system temp directory")
            self.type = "temp"
            self.compress_level = 1
            self._initialized = True
            logger.info(f" Initialized global image cache manager (Session ID: {self.session_id})")

    def set_current_group(self, group_name: Optional[str]) -> None:
        """设置当前执行的组名（由组执行管理器调用）"""
        self.current_group_name = group_name
        if group_name:
            logger.info(f" >>> 设置当前执行组: {group_name}")
        else:
            logger.info(f" >>> 清除当前执行组")

    def get_cache_channel(self, channel_name: Optional[str] = None) -> Dict[str, Any]:
        """
        获取缓存通道，如果不存在则创建

        Args:
            channel_name: 通道名称，如果为None则使用当前组名，如果当前组名也为None则使用默认通道

        Returns:
            缓存通道字典
        """
        # 确定实际使用的通道名
        if channel_name is None:
            channel_name = self.current_group_name

        # 如果仍然为None，使用默认通道
        if channel_name is None:
            return self.cache_data

        # 如果通道不存在，创建新通道
        if channel_name not in self.cache_channels:
            self.cache_channels[channel_name] = {
                "images": [],
                "timestamp": 0,
                "metadata": {}
            }
            logger.info(f" 创建新缓存通道: {channel_name}")

        return self.cache_channels[channel_name]

    def clear_cache(self, channel_name: Optional[str] = None) -> None:
        """
        清空缓存（线程安全）

        Args:
            channel_name: 要清空的通道名称，None表示清空所有通道
        """
        with self._lock:
            try:
                if channel_name is None:
                    # 清空所有通道
                    logger.info(f" 清空所有缓存通道")

                    # 清空默认通道
                    self.cache_data["images"] = []
                    self.cache_data["timestamp"] = 0
                    self.cache_data["metadata"] = {}

                    # 清空所有命名通道
                    self.cache_channels.clear()

                    logger.info(f" ✓ 已清空所有缓存通道")
                else:
                    # 清空指定通道
                    logger.info(f" 清空缓存通道: {channel_name}")

                    if channel_name in self.cache_channels:
                        self.cache_channels[channel_name]["images"] = []
                        self.cache_channels[channel_name]["timestamp"] = 0
                        self.cache_channels[channel_name]["metadata"] = {}
                        logger.info(f" ✓ 已清空缓存通道: {channel_name}")
                    else:
                        logger.info(f" 缓存通道不存在，无需清空: {channel_name}")

                # 重置会话追踪信息
                self.has_saved_this_session = False
                self.session_execution_count = 0
                self.last_save_timestamp = 0
                self.get_count_this_session = 0
                self.last_get_timestamp = 0

                # 记录操作
                self._last_operation = {
                    "type": "clear_cache",
                    "timestamp": time.time(),
                    "session_id": self.session_id,
                    "channel": channel_name
                }

                # 发送WebSocket事件通知通道清空
                try:
                    from server import PromptServer
                    all_channels = self.get_all_channels()
                    PromptServer.instance.send_sync("image-cache-channel-cleared", {
                        "channel": channel_name,
                        "all_channels": all_channels
                    })
                except ImportError:
                    logger.warning(" 不在ComfyUI环境中，跳过WebSocket通知")
                except Exception as e:
                    logger.info(f" WebSocket通知失败: {e}")

            except Exception as e:
                logger.error(f"✗ 清空缓存失败: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())

    def cache_images(self,
                    images: List[torch.Tensor],
                    filename_prefix: str = "cached_image",
                    preview_rgba: bool = True,
                    clear_before_save: bool = True,
                    channel_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        缓存图像数据（线程安全）

        Args:
            images: 图像张量列表
            filename_prefix: 文件名前缀
            preview_rgba: 是否使用RGBA预览
            clear_before_save: 是否在保存前清空旧缓存（默认True=覆盖模式）
            channel_name: 缓存通道名称，None表示使用当前组名

        Returns:
            缓存的图像数据列表
        """
        with self._lock:
            try:
                # 获取目标缓存通道
                cache_channel = self.get_cache_channel(channel_name)
                actual_channel_name = channel_name or self.current_group_name or "default"

                # 简化日志 - 只显示关键通道信息
                logger.info(f" ┌─ 通道: '{actual_channel_name}'")
                logger.info(f" │  当前: {len(cache_channel['images'])} 张 → 新增: {len(images)} 张")

                timestamp = int(time.time() * 1000)
                results = []
                cache_data = []

                # 根据参数决定是否清空旧缓存
                if clear_before_save and len(cache_channel["images"]) > 0:
                    old_count = len(cache_channel["images"])
                    cache_channel["images"] = []
                    logger.info(f" │  模式: 覆盖 (已清除 {old_count} 张旧图)")
                else:
                    logger.info(f" │  模式: {'追加' if not clear_before_save else '覆盖'}")

                for idx, image_batch in enumerate(images):
                    try:
                        # 图像处理
                        image = image_batch.squeeze()
                        rgb_image = Image.fromarray(np.clip(255. * image.cpu().numpy(), 0, 255).astype(np.uint8))

                        # 创建默认遮罩（完全不透明）
                        mask_img = Image.new('L', rgb_image.size, 255)

                        # 合并为RGBA
                        r, g, b = rgb_image.convert('RGB').split()
                        rgba_image = Image.merge('RGBA', (r, g, b, mask_img))

                        # 保存文件
                        filename = f"{filename_prefix}_{timestamp}_{idx}.png"
                        file_path = os.path.join(self.output_dir, filename)
                        rgba_image.save(file_path, compress_level=self.compress_level)

                        # 准备缓存数据，包含预览格式信息
                        cache_item = {
                            "filename": filename,
                            "subfolder": "",
                            "type": self.type,
                            "timestamp": timestamp,
                            "index": idx,
                            "preview_format": "rgba" if preview_rgba else "rgb",
                            "original_filename": filename
                        }
                        cache_data.append(cache_item)

                        # 预览处理
                        if not preview_rgba:
                            preview_filename = f"{filename_prefix}_{timestamp}_{idx}_preview.jpg"
                            preview_path = os.path.join(self.output_dir, preview_filename)
                            rgb_image.save(preview_path, format="JPEG", quality=95)
                            results.append({
                                "filename": preview_filename,
                                "subfolder": "",
                                "type": self.type
                            })
                        else:
                            results.append(cache_item)

                    except Exception as e:
                        logger.info(f" 处理图像 {idx+1} 时出错: {str(e)}")
                        continue

                # 更新缓存通道（追加到当前通道）
                cache_channel["images"].extend(cache_data)

                cache_channel["timestamp"] = timestamp
                cache_channel["metadata"] = {
                    "count": len(cache_channel["images"]), # 使用更新后的列表长度
                    "prefix": filename_prefix,
                    "channel": actual_channel_name
                }

                # 更新会话追踪信息
                self.session_execution_count += 1
                self.last_save_timestamp = timestamp
                self.has_saved_this_session = True

                # 输出结果日志
                logger.info(f" └─ 完成: {len(cache_data)} 张图像 → 总计: {len(cache_channel['images'])} 张")

                # 发送WebSocket事件通知缓存更新（延迟导入）
                if cache_data:
                    try:
                        from server import PromptServer
                        # 包含所有通道列表，供前端动态更新下拉菜单
                        all_channels = self.get_all_channels()
                        PromptServer.instance.send_sync("image-cache-update", {
                            "cache_info": {
                                "count": len(cache_data),
                                "timestamp": timestamp,
                                "metadata": cache_channel["metadata"],
                                "channel": actual_channel_name,
                                "all_channels": all_channels  # 新增：所有通道列表
                            }
                        })
                    except ImportError:
                        logger.warning(" 不在ComfyUI环境中，跳过WebSocket通知")
                    except Exception as e:
                        logger.info(f" WebSocket通知失败: {e}")

                return results

            except Exception as e:
                logger.error(f"✗ 缓存失败: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                return []

    def get_cached_images(self,
                         get_latest: bool = True,
                         index: int = 0,
                         channel_name: Optional[str] = None) -> List[torch.Tensor]:
        """
        从缓存中获取图像数据（线程安全）

        Args:
            get_latest: 是否获取所有缓存图像
            index: 当get_latest为False时，获取指定索引的图像
            channel_name: 缓存通道名称，None表示使用当前组名

        Returns:
            images_tensors: 图像张量列表
        """
        with self._lock:
            try:
                # 增加获取计数
                self.increment_get_count()

                # 获取目标缓存通道
                cache_channel = self.get_cache_channel(channel_name)
                actual_channel_name = channel_name or self.current_group_name or "default"

                # 简化日志 - 只显示关键获取信息
                logger.info(f" ┌─ 从通道 '{actual_channel_name}' 获取")
                logger.info(f" │  可用: {len(cache_channel['images'])} 张")

                # 检查缓存中是否有图像
                if not cache_channel["images"]:
                    logger.info(f" └─ 缓存为空，返回空列表")
                    # ✅ 修复：返回空列表，让调用者决定使用默认图像
                    return []

                try:
                    # 延迟导入folder_paths
                    try:
                        import folder_paths
                        temp_dir = folder_paths.get_temp_directory()
                    except ImportError:
                        temp_dir = self.output_dir
                    except Exception:
                        temp_dir = self.output_dir
                    output_images = []

                    # 确定要获取的图像
                    if get_latest:
                        # 获取所有缓存的图像
                        images_to_get = cache_channel["images"]
                    else:
                        # 获取指定索引的图像
                        if index < len(cache_channel["images"]):
                            images_to_get = [cache_channel["images"][index]]
                        else:
                            logger.info(f" └─ 索引 {index} 超出范围 (总数: {len(cache_channel['images'])})")
                            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                            return [empty_image]

                    # 加载图像
                    for img_data in images_to_get:
                        try:
                            img_file = img_data["filename"]
                            img_path = os.path.join(temp_dir, img_file)

                            if not os.path.exists(img_path):
                                logger.info(f" 文件不存在: {img_path}")
                                continue

                            img = Image.open(img_path)

                            # RGBA格式处理 - 只提取RGB通道
                            if img.mode == 'RGBA':
                                r, g, b, a = img.split()
                                rgb_image = Image.merge('RGB', (r, g, b))

                                # 转换为张量
                                image = np.array(rgb_image).astype(np.float32) / 255.0
                                image = torch.from_numpy(image)  # 先创建3D张量 (H, W, C)

                                # 确保是4D张量格式 (batch, height, width, channels)
                                if image.dim() == 3:
                                    image = image.unsqueeze(0)  # 添加批次维度 -> (1, H, W, C)
                                elif image.dim() == 2:
                                    image = image.unsqueeze(0).unsqueeze(-1)  # (1, H, W, 1)
                                    image = image.expand(-1, -1, -1, 3)  # 扩展为3通道
                            else:
                                # RGB格式处理
                                image = np.array(img.convert('RGB')).astype(np.float32) / 255.0
                                image = torch.from_numpy(image)  # 先创建3D张量 (H, W, C)

                                # 确保是4D张量格式 (batch, height, width, channels)
                                if image.dim() == 3:
                                    image = image.unsqueeze(0)  # 添加批次维度 -> (1, H, W, C)
                                elif image.dim() == 2:
                                    image = image.unsqueeze(0).unsqueeze(-1)  # (1, H, W, 1)
                                    image = image.expand(-1, -1, -1, 3)  # 扩展为3通道

                            output_images.append(image)

                        except Exception as e:
                            logger.info(f" 处理文件时出错: {str(e)}")
                            continue

                    if not output_images:
                        logger.info(f" └─ 没有加载到任何图像，返回空白")
                        empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                        return [empty_image]

                    logger.info(f" └─ 成功获取: {len(output_images)} 张图像")
                    return output_images

                except Exception as e:
                    logger.info(f" └─ 获取失败: {str(e)}")
                    empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                    return [empty_image]

            except Exception as e:
                logger.error(f"✗ 获取缓存失败: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                return [empty_image]

    def get_cache_info(self) -> Dict[str, Any]:
        """
        获取当前缓存信息

        Returns:
            缓存信息字典
        """
        return {
            "count": len(self.cache_data["images"]),
            "timestamp": self.cache_data["timestamp"],
            "metadata": self.cache_data["metadata"].copy()
        }

    def is_cache_empty(self) -> bool:
        """检查缓存是否为空"""
        return len(self.cache_data["images"]) == 0

    def is_cache_valid(self, max_age_minutes: int = 30) -> bool:
        """
        检查缓存是否有效（有缓存数据且未过期）

        Args:
            max_age_minutes: 缓存最大有效时间（分钟），默认30分钟

        Returns:
            bool: 缓存是否有效
        """
        import time

        # 检查是否有缓存数据
        if self.is_cache_empty():
            return False

        # 检查缓存时间戳是否过期
        current_time = int(time.time() * 1000)
        age_ms = current_time - self.last_save_timestamp
        age_minutes = age_ms / (1000 * 60)

        if age_minutes > max_age_minutes:
            return False

        return True

    def get_session_info(self) -> Dict[str, Any]:
        """获取会话信息（线程安全）"""
        with self._lock:
            current_time = time.time()
            session_duration = current_time - self.session_start_time

            return {
                "session_id": self.session_id,
                "session_start_time": self.session_start_time,
                "session_duration_seconds": round(session_duration, 2),
                "execution_count": self.session_execution_count,
                "get_count": self.get_count_this_session,
                "has_saved_this_session": self.has_saved_this_session,
                "last_save_timestamp": self.last_save_timestamp,
                "last_get_timestamp": self.last_get_timestamp,
                "last_operation": self._last_operation
            }

    def increment_get_count(self) -> None:
        """增加获取计数"""
        self.get_count_this_session += 1
        self.last_get_timestamp = time.time()

    def get_all_channels(self) -> List[str]:
        """
        获取所有已定义的通道列表

        Returns:
            通道名称列表
        """
        return list(self.cache_channels.keys())

    def ensure_channel_exists(self, channel_name: str) -> bool:
        """
        确保通道存在，如果不存在则创建空通道
        用于前端预注册通道，确保下拉列表中显示该通道

        Args:
            channel_name: 通道名称

        Returns:
            True表示通道已存在或创建成功，False表示失败
        """
        try:
            if channel_name not in self.cache_channels:
                self.cache_channels[channel_name] = {
                    "images": [],
                    "timestamp": int(time.time() * 1000),
                    "metadata": {}
                }
                logger.info(f" 预注册空通道: {channel_name}")
                return True
            else:
                logger.info(f" 通道已存在: {channel_name}")
                return True
        except Exception as e:
            logger.info(f" 创建通道失败: {channel_name}, 错误: {e}")
            return False

    def rename_channel(self, old_name: str, new_name: str) -> bool:
        """
        重命名通道（将旧通道的数据移到新通道，然后删除旧通道）（线程安全）

        Args:
            old_name: 旧通道名称
            new_name: 新通道名称

        Returns:
            是否成功重命名
        """
        with self._lock:
            try:
                # 检查旧通道是否存在
                if old_name not in self.cache_channels:
                    logger.warning(f"⚠️ 旧通道 '{old_name}' 不存在，无法重命名")
                    return False

                # 检查新通道名是否与旧通道名相同
                if old_name == new_name:
                    logger.warning(f"⚠️ 新旧通道名相同，无需重命名")
                    return True

                # 检查新通道是否已存在
                if new_name in self.cache_channels:
                    logger.warning(f"⚠️ 新通道 '{new_name}' 已存在，将覆盖")

                # 复制旧通道数据到新通道
                self.cache_channels[new_name] = self.cache_channels[old_name].copy()

                # 删除旧通道
                del self.cache_channels[old_name]

                logger.info(f" ✅ 通道已重命名: '{old_name}' -> '{new_name}'")

                # 记录操作
                self._last_operation = {
                    "type": "rename_channel",
                    "timestamp": time.time(),
                    "session_id": self.session_id,
                    "old_name": old_name,
                    "new_name": new_name
                }

                # 发送WebSocket事件通知通道重命名
                try:
                    from server import PromptServer
                    all_channels = self.get_all_channels()
                    PromptServer.instance.send_sync("image-cache-channel-renamed", {
                        "old_name": old_name,
                        "new_name": new_name,
                        "all_channels": all_channels
                    })
                except ImportError:
                    logger.warning(" 不在ComfyUI环境中，跳过WebSocket通知")
                except Exception as e:
                    logger.info(f" WebSocket通知失败: {e}")

                return True

            except Exception as e:
                logger.error(f"❌ 重命名通道失败: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                return False

# 全局缓存管理器实例
cache_manager = ImageCacheManager()
