"""
图像缓存管理器 - 单例模式管理全局图像缓存
"""

import sys
import os
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple

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
            print(f"[ImageCacheManager DEBUG] New instance created with ID: {self.instance_id}")

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

            # 状态同步字段
            self._pending_operations = set()          # 进行中的操作集合
            self._operation_lock = False              # 操作锁，防止并发问题
            self._last_operation = None               # 最后一次操作信息

            # 延迟导入folder_paths
            try:
                import folder_paths
                self.output_dir = folder_paths.get_temp_directory()
            except ImportError:
                # 如果在ComfyUI环境外，使用临时目录
                import tempfile
                self.output_dir = tempfile.gettempdir()
                print("[ImageCacheManager] Warning: Not in ComfyUI environment, using system temp directory")
            except Exception:
                import tempfile
                self.output_dir = tempfile.gettempdir()
                print("[ImageCacheManager] Warning: Cannot import folder_paths, using system temp directory")
            self.type = "temp"
            self.compress_level = 1
            self._initialized = True
            print(f"[ImageCacheManager] Initialized global image cache manager (Session ID: {self.session_id})")

    def set_current_group(self, group_name: Optional[str]) -> None:
        """设置当前执行的组名（由组执行管理器调用）"""
        self.current_group_name = group_name
        if group_name:
            print(f"[ImageCacheManager] >>> 设置当前执行组: {group_name}")
        else:
            print(f"[ImageCacheManager] >>> 清除当前执行组")

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
            print(f"[ImageCacheManager] 创建新缓存通道: {channel_name}")

        return self.cache_channels[channel_name]

    def clear_cache(self, channel_name: Optional[str] = None) -> None:
        """
        清空缓存

        Args:
            channel_name: 要清空的通道名称，None表示清空所有通道
        """
        operation_id = f"clear_{int(time.time() * 1000)}"
        self._start_operation(operation_id, "clear_cache")

        try:
            if channel_name is None:
                # 清空所有通道
                print(f"[ImageCacheManager] 清空所有缓存通道 (操作ID: {operation_id})")

                # 清空默认通道
                self.cache_data["images"] = []
                self.cache_data["timestamp"] = 0
                self.cache_data["metadata"] = {}

                # 清空所有命名通道
                self.cache_channels.clear()

                print(f"[ImageCacheManager] ✓ 已清空所有缓存通道")
            else:
                # 清空指定通道
                print(f"[ImageCacheManager] 清空缓存通道: {channel_name} (操作ID: {operation_id})")

                if channel_name in self.cache_channels:
                    self.cache_channels[channel_name]["images"] = []
                    self.cache_channels[channel_name]["timestamp"] = 0
                    self.cache_channels[channel_name]["metadata"] = {}
                    print(f"[ImageCacheManager] ✓ 已清空缓存通道: {channel_name}")
                else:
                    print(f"[ImageCacheManager] 缓存通道不存在，无需清空: {channel_name}")

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

        finally:
            self._end_operation(operation_id)

    def cache_images(self,
                    images: List[torch.Tensor],
                    filename_prefix: str = "cached_image",
                    preview_rgba: bool = True,
                    clear_before_save: bool = True,
                    channel_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        缓存图像数据

        ✅ 添加执行锁保护，防止并发执行导致的状态混乱

        Args:
            images: 图像张量列表
            filename_prefix: 文件名前缀
            preview_rgba: 是否使用RGBA预览
            clear_before_save: 是否在保存前清空旧缓存（默认True=覆盖模式）
            channel_name: 缓存通道名称，None表示使用当前组名

        Returns:
            缓存的图像数据列表
        """
        operation_id = f"cache_{int(time.time() * 1000)}"

        # ✅ 检查操作锁，防止并发写入
        if self._operation_lock:
            print(f"[ImageCacheManager] ⚠ 操作被锁定，等待前一个操作完成...")
            # 简单的自旋等待，最多等待5秒
            wait_count = 0
            while self._operation_lock and wait_count < 50:
                time.sleep(0.1)
                wait_count += 1
            if self._operation_lock:
                print(f"[ImageCacheManager] ✗ 操作锁超时，强制继续")

        self._operation_lock = True
        self._start_operation(operation_id, "cache_images")

        try:
            # 获取目标缓存通道
            cache_channel = self.get_cache_channel(channel_name)
            actual_channel_name = channel_name or self.current_group_name or "default"

            # 简化日志 - 只显示关键通道信息
            print(f"[ImageCacheManager] ┌─ 通道: '{actual_channel_name}'")
            print(f"[ImageCacheManager] │  当前: {len(cache_channel['images'])} 张 → 新增: {len(images)} 张")

            timestamp = int(time.time() * 1000)
            results = []
            cache_data = []

            # 根据参数决定是否清空旧缓存
            if clear_before_save and len(cache_channel["images"]) > 0:
                old_count = len(cache_channel["images"])
                cache_channel["images"] = []
                print(f"[ImageCacheManager] │  模式: 覆盖 (已清除 {old_count} 张旧图)")
            else:
                print(f"[ImageCacheManager] │  模式: {'追加' if not clear_before_save else '覆盖'}")

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
                    print(f"[ImageCacheManager] 处理图像 {idx+1} 时出错: {str(e)}")
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
            print(f"[ImageCacheManager] └─ 完成: {len(cache_data)} 张图像 → 总计: {len(cache_channel['images'])} 张")

            # 发送WebSocket事件通知缓存更新（延迟导入）
            if cache_data:
                try:
                    from server import PromptServer
                    PromptServer.instance.send_sync("image-cache-update", {
                        "cache_info": {
                            "count": len(cache_data),
                            "timestamp": timestamp,
                            "metadata": cache_channel["metadata"],
                            "channel": actual_channel_name
                        }
                    })
                except ImportError:
                    print("[ImageCacheManager] 警告: 不在ComfyUI环境中，跳过WebSocket通知")
                except Exception as e:
                    print(f"[ImageCacheManager] WebSocket通知失败: {e}")

        finally:
            self._end_operation(operation_id)
            # ✅ 释放操作锁
            self._operation_lock = False

        return results

    def get_cached_images(self,
                         get_latest: bool = True,
                         index: int = 0,
                         channel_name: Optional[str] = None) -> List[torch.Tensor]:
        """
        从缓存中获取图像数据

        Args:
            get_latest: 是否获取所有缓存图像
            index: 当get_latest为False时，获取指定索引的图像
            channel_name: 缓存通道名称，None表示使用当前组名

        Returns:
            images_tensors: 图像张量列表
        """
        operation_id = f"get_{int(time.time() * 1000)}"
        self._start_operation(operation_id, "get_cached_images")

        try:
            # 增加获取计数
            self.increment_get_count()

            # 获取目标缓存通道
            cache_channel = self.get_cache_channel(channel_name)
            actual_channel_name = channel_name or self.current_group_name or "default"

            # 简化日志 - 只显示关键获取信息
            print(f"[ImageCacheManager] ┌─ 从通道 '{actual_channel_name}' 获取")
            print(f"[ImageCacheManager] │  可用: {len(cache_channel['images'])} 张")

            # 检查缓存中是否有图像
            if not cache_channel["images"]:
                print(f"[ImageCacheManager] └─ 缓存为空，返回空列表")
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
                        print(f"[ImageCacheManager] └─ 索引 {index} 超出范围 (总数: {len(cache_channel['images'])})")
                        empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                        return [empty_image]

                # 加载图像
                for img_data in images_to_get:
                    try:
                        img_file = img_data["filename"]
                        img_path = os.path.join(temp_dir, img_file)

                        if not os.path.exists(img_path):
                            print(f"[ImageCacheManager] 文件不存在: {img_path}")
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
                        print(f"[ImageCacheManager] 处理文件时出错: {str(e)}")
                        continue

                if not output_images:
                    print(f"[ImageCacheManager] └─ 没有加载到任何图像，返回空白")
                    empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                    return [empty_image]

                print(f"[ImageCacheManager] └─ 成功获取: {len(output_images)} 张图像")
                return output_images

            except Exception as e:
                print(f"[ImageCacheManager] └─ 获取失败: {str(e)}")
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                return [empty_image]

        finally:
            self._end_operation(operation_id)

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

    def _start_operation(self, operation_id: str, operation_type: str) -> None:
        """开始操作，添加到操作集合"""
        if self._operation_lock:
            print(f"[ImageCacheManager] ⚠ 操作被锁定: {operation_id}")
        self._pending_operations.add(operation_id)

    def _end_operation(self, operation_id: str) -> None:
        """结束操作，从操作集合中移除"""
        if operation_id in self._pending_operations:
            self._pending_operations.remove(operation_id)

    def get_session_info(self) -> Dict[str, Any]:
        """获取会话信息"""
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
            "pending_operations": list(self._pending_operations),
            "operation_lock": self._operation_lock,
            "last_operation": self._last_operation
        }

    def increment_get_count(self) -> None:
        """增加获取计数"""
        self.get_count_this_session += 1
        self.last_get_timestamp = time.time()

# 全局缓存管理器实例
cache_manager = ImageCacheManager()
