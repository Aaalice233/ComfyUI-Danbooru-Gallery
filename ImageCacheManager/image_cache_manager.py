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

    def clear_cache(self) -> None:
        """清空缓存"""
        operation_id = f"clear_{int(time.time() * 1000)}"
        self._start_operation(operation_id, "clear_cache")

        try:
            print(f"[ImageCacheManager] 清空缓存开始 (操作ID: {operation_id})")

            # 清空缓存数据
            self.cache_data["images"] = []
            self.cache_data["timestamp"] = 0
            self.cache_data["metadata"] = {}

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
                "session_id": self.session_id
            }

            print("[ImageCacheManager] ✓ 缓存已清空，会话状态已重置")

        finally:
            self._end_operation(operation_id)

    def cache_images(self,
                    images: List[torch.Tensor],
                    filename_prefix: str = "cached_image",
                    preview_rgba: bool = True) -> List[Dict[str, Any]]:
        """
        缓存图像数据（总是追加到现有缓存）

        Args:
            images: 图像张量列表
            filename_prefix: 文件名前缀
            preview_rgba: 是否使用RGBA预览

        Returns:
            缓存的图像数据列表
        """
        operation_id = f"cache_{int(time.time() * 1000)}"
        self._start_operation(operation_id, "cache_images")

        try:
            print(f"[ImageCacheManager DEBUG] cache_images called on instance ID: {self.instance_id}")
            print(f"[ImageCacheManager DEBUG] Operation ID: {operation_id}")
            print(f"[ImageCacheManager DEBUG] Current cache size before adding: {len(self.cache_data['images'])}")
            print(f"[ImageCacheManager DEBUG] Number of new images to add: {len(images)}")

            timestamp = int(time.time() * 1000)
            results = []
            cache_data = []

            print(f"[ImageCacheManager] 开始缓存 {len(images)} 张图像")
            print(f"[ImageCacheManager] 文件名前缀: {filename_prefix}")
            print(f"[ImageCacheManager] 当前模式: 追加（不清空旧缓存）")

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

                    print(f"[ImageCacheManager] 缓存图像 {idx+1}/{len(images)}: {filename}")

                except Exception as e:
                    print(f"[ImageCacheManager] 处理图像 {idx+1} 时出错: {str(e)}")
                    continue

            # 更新全局缓存（总是追加）
            self.cache_data["images"].extend(cache_data)

            print(f"[ImageCacheManager DEBUG] Cache size after adding: {len(self.cache_data['images'])}")

            self.cache_data["timestamp"] = timestamp
            self.cache_data["metadata"] = {
                "count": len(self.cache_data["images"]), # 使用更新后的列表长度
                "prefix": filename_prefix
            }

            # 更新会话追踪信息
            self.session_execution_count += 1
            self.last_save_timestamp = timestamp
            self.has_saved_this_session = True
            print(f"[ImageCacheManager] 会话保存次数: {self.session_execution_count}")

            # 发送WebSocket事件通知缓存更新（延迟导入）
            if cache_data:
                print(f"[ImageCacheManager] 已缓存 {len(cache_data)} 张图像")
                try:
                    from server import PromptServer
                    PromptServer.instance.send_sync("image-cache-update", {
                        "cache_info": {
                            "count": len(cache_data),
                            "timestamp": timestamp,
                            "metadata": self.cache_data["metadata"]
                        }
                    })
                except ImportError:
                    print("[ImageCacheManager] 警告: 不在ComfyUI环境中，跳过WebSocket通知")
                except Exception as e:
                    print(f"[ImageCacheManager] WebSocket通知失败: {e}")

        finally:
            self._end_operation(operation_id)

        return results

    def get_cached_images(self,
                         get_latest: bool = True,
                         index: int = 0) -> Tuple[List[torch.Tensor], List[torch.Tensor]]:
        """
        从缓存中获取图像数据

        Args:
            get_latest: 是否获取所有缓存图像
            index: 当get_latest为False时，获取指定索引的图像

        Returns:
            (images_tensors, masks_tensors) 图像和遮罩张量元组
        """
        operation_id = f"get_{int(time.time() * 1000)}"
        self._start_operation(operation_id, "get_cached_images")

        try:
            # 增加获取计数
            self.increment_get_count()

            print(f"[ImageCacheManager DEBUG] get_cached_images called on instance ID: {self.instance_id}")
            print(f"[ImageCacheManager DEBUG] Operation ID: {operation_id}")
            print(f"[ImageCacheManager DEBUG] Current cache size at get: {len(self.cache_data['images'])}")

            print(f"[ImageCacheManager] 开始获取缓存图像")
            print(f"[ImageCacheManager] 获取最新: {get_latest}")
            print(f"[ImageCacheManager] 索引: {index}")
            print(f"[ImageCacheManager] 会话获取次数: {self.get_count_this_session}")

            # 检查缓存中是否有图像
            if not self.cache_data["images"]:
                print(f"[ImageCacheManager] 缓存为空，返回空图像")
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
                print(f"[ImageCacheManager] 空白图像形状: {empty_image.shape}")
                print(f"[ImageCacheManager] 空白遮罩形状: {empty_mask.shape}")
                return [empty_image], [empty_mask]

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
                output_masks = []

                # 确定要获取的图像
                if get_latest:
                    # 获取所有缓存的图像
                    images_to_get = self.cache_data["images"]
                    print(f"[ImageCacheManager] 获取所有 {len(images_to_get)} 张缓存图像")
                else:
                    # 获取指定索引的图像
                    if index < len(self.cache_data["images"]):
                        images_to_get = [self.cache_data["images"][index]]
                        print(f"[ImageCacheManager] 获取索引 {index} 的图像")
                    else:
                        print(f"[ImageCacheManager] 索引 {index} 超出范围，缓存中共有 {len(self.cache_data['images'])} 张图像")
                        empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                        empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
                        print(f"[ImageCacheManager] 索引越界空白图像形状: {empty_image.shape}")
                        return [empty_image], [empty_mask]

                # 加载图像
                for img_data in images_to_get:
                    try:
                        img_file = img_data["filename"]
                        img_path = os.path.join(temp_dir, img_file)

                        if not os.path.exists(img_path):
                            print(f"[ImageCacheManager] 文件不存在: {img_path}")
                            continue

                        img = Image.open(img_path)
                        print(f"[ImageCacheManager] 成功加载图像: {img_file}")

                        # RGBA格式处理
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

                            print(f"[ImageCacheManager] RGBA图像处理，最终形状: {image.shape}")

                            # 遮罩处理 (注意反转)
                            mask = np.array(a).astype(np.float32) / 255.0
                            mask = torch.from_numpy(mask)  # 先创建2D张量 (H, W)

                            # 确保遮罩是3D张量格式 (batch, height, width)
                            if mask.dim() == 2:
                                mask = mask.unsqueeze(0)  # 添加批次维度 -> (1, H, W)
                            elif mask.dim() == 3:
                                if mask.shape[-1] == 1:
                                    mask = mask.squeeze(-1)  # 移除通道维度 -> (1, H, W)
                                elif mask.shape[0] == 1:
                                    # 如果是 (1, H, W) 格式，直接使用
                                    pass

                            mask = 1.0 - mask
                            print(f"[ImageCacheManager] 遮罩处理，最终形状: {mask.shape}")
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

                            print(f"[ImageCacheManager] RGB图像处理，最终形状: {image.shape}")

                            # 创建空白遮罩，确保是3D格式
                            mask = torch.zeros((1, image.shape[1], image.shape[2]), dtype=torch.float32, device="cpu")
                            print(f"[ImageCacheManager] 创建空白遮罩，形状: {mask.shape}")

                        output_images.append(image)
                        output_masks.append(mask)

                    except Exception as e:
                        print(f"[ImageCacheManager] 处理文件时出错: {str(e)}")
                        continue

                if not output_images:
                    print(f"[ImageCacheManager] 没有成功加载任何图像，返回空图像")
                    empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                    empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
                    print(f"[ImageCacheManager] 无图像加载时空白图像形状: {empty_image.shape}")
                    return [empty_image], [empty_mask]

                print(f"[ImageCacheManager] 成功获取 {len(output_images)} 张图像")
                return output_images, output_masks

            except Exception as e:
                print(f"[ImageCacheManager] 获取图像时出错: {str(e)}")
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
                print(f"[ImageCacheManager] 异常时空白图像形状: {empty_image.shape}")
                return [empty_image], [empty_mask]

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

        print(f"[ImageCacheManager DEBUG] is_cache_valid called on instance ID: {self.instance_id}")

        # 检查是否有缓存数据
        if self.is_cache_empty():
            print("[ImageCacheManager] 缓存为空，无效")
            return False

        # 检查缓存时间戳是否过期
        current_time = int(time.time() * 1000)
        age_ms = current_time - self.last_save_timestamp
        age_minutes = age_ms / (1000 * 60)

        if age_minutes > max_age_minutes:
            print(f"[ImageCacheManager] 缓存已过期，保存时间: {age_minutes:.1f}分钟前")
            return False

        print(f"[ImageCacheManager] 缓存有效，保存时间: {age_minutes:.1f}分钟前，会话次数: {self.session_execution_count}")
        return True

    def _start_operation(self, operation_id: str, operation_type: str) -> None:
        """开始操作，添加到操作集合"""
        if self._operation_lock:
            print(f"[ImageCacheManager] 警告: 操作被锁定，{operation_id} 等待中...")
        self._pending_operations.add(operation_id)
        print(f"[ImageCacheManager] 开始操作: {operation_type} (ID: {operation_id})")

    def _end_operation(self, operation_id: str) -> None:
        """结束操作，从操作集合中移除"""
        if operation_id in self._pending_operations:
            self._pending_operations.remove(operation_id)
        print(f"[ImageCacheManager] 完成操作: {operation_id}")

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
        print(f"[ImageCacheManager] 获取次数更新: {self.get_count_this_session}")

# 全局缓存管理器实例
cache_manager = ImageCacheManager()
