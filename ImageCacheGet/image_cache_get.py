"""
图像缓存获取节点 - Image Cache Get Node
主动从单通道缓存中获取图像和遮罩数据
"""

import sys
import os
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple

CATEGORY_TYPE = "Danbooru/Image"


class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False


any_typ = AnyType("*")


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
            self.cache_data = {
                "images": [],
                "timestamp": 0,
                "metadata": {}
            }
            # 延迟导入folder_paths
            try:
                import folder_paths
                self.output_dir = folder_paths.get_temp_directory()
            except ImportError:
                # 如果在ComfyUI环境外，使用临时目录
                import tempfile
                self.output_dir = tempfile.gettempdir()
                print("[ImageCacheManager] 警告: 不在ComfyUI环境中，使用系统临时目录")
            except Exception:
                import tempfile
                self.output_dir = tempfile.gettempdir()
                print("[ImageCacheManager] 警告: 无法导入folder_paths，使用系统临时目录")
            self.type = "temp"
            self.compress_level = 1
            self._initialized = True
            print("[ImageCacheManager] 初始化全局图像缓存管理器")

    def clear_cache(self) -> None:
        """清空缓存"""
        self.cache_data["images"] = []
        self.cache_data["timestamp"] = 0
        self.cache_data["metadata"] = {}
        print("[ImageCacheManager] 缓存已清空")

    def cache_images(self,
                    images: List[torch.Tensor],
                    filename_prefix: str = "cached_image",
                    masks: Optional[List[torch.Tensor]] = None,
                    clear_cache: bool = True,
                    preview_rgba: bool = True) -> List[Dict[str, Any]]:
        """
        缓存图像数据

        Args:
            images: 图像张量列表
            filename_prefix: 文件名前缀
            masks: 可选的遮罩张量列表
            clear_cache: 是否清空之前的缓存
            preview_rgba: 是否使用RGBA预览

        Returns:
            缓存的图像数据列表
        """
        timestamp = int(time.time() * 1000)
        results = []
        cache_data = []

        print(f"[ImageCacheManager] 开始缓存 {len(images)} 张图像")
        print(f"[ImageCacheManager] 文件名前缀: {filename_prefix}")
        print(f"[ImageCacheManager] 清空缓存: {clear_cache}")

        # 清空之前的缓存
        if clear_cache:
            self.clear_cache()

        for idx, image_batch in enumerate(images):
            try:
                # 图像处理
                image = image_batch.squeeze()
                rgb_image = Image.fromarray(np.clip(255. * image.cpu().numpy(), 0, 255).astype(np.uint8))

                # 遮罩处理
                if masks is not None and idx < len(masks):
                    mask = masks[idx].squeeze()
                    mask_img = Image.fromarray(np.clip(255. * (1 - mask.cpu().numpy()), 0, 255).astype(np.uint8))
                else:
                    mask_img = Image.new('L', rgb_image.size, 255)

                # 合并为RGBA
                r, g, b = rgb_image.convert('RGB').split()
                rgba_image = Image.merge('RGBA', (r, g, b, mask_img))

                # 保存文件
                filename = f"{filename_prefix}_{timestamp}_{idx}.png"
                file_path = os.path.join(self.output_dir, filename)
                rgba_image.save(file_path, compress_level=self.compress_level)

                # 准备缓存数据
                cache_item = {
                    "filename": filename,
                    "subfolder": "",
                    "type": self.type,
                    "timestamp": timestamp,
                    "index": idx
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

        # 更新全局缓存
        self.cache_data["images"] = cache_data
        self.cache_data["timestamp"] = timestamp
        self.cache_data["metadata"] = {
            "count": len(cache_data),
            "prefix": filename_prefix,
            "has_masks": masks is not None
        }

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

        return results

    def get_cached_images(self,
                         get_latest: bool = True,
                         index: int = 0,
                         clear_after_get: bool = False) -> Tuple[List[torch.Tensor], List[torch.Tensor]]:
        """
        从缓存中获取图像数据

        Args:
            get_latest: 是否获取所有缓存图像
            index: 当get_latest为False时，获取指定索引的图像
            clear_after_get: 获取后是否清空缓存

        Returns:
            (images_tensors, masks_tensors) 图像和遮罩张量元组
        """
        print(f"[ImageCacheManager] 开始获取缓存图像")
        print(f"[ImageCacheManager] 获取最新: {get_latest}")
        print(f"[ImageCacheManager] 索引: {index}")
        print(f"[ImageCacheManager] 获取后清空: {clear_after_get}")

        # 检查缓存中是否有图像
        if not self.cache_data["images"]:
            print(f"[ImageCacheManager] 缓存为空，返回空图像")
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
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
                        image = torch.from_numpy(image)[None,]

                        # 遮罩处理 (注意反转)
                        mask = np.array(a).astype(np.float32) / 255.0
                        mask = torch.from_numpy(mask)[None,]
                        mask = 1.0 - mask
                    else:
                        # RGB格式处理
                        image = np.array(img.convert('RGB')).astype(np.float32) / 255.0
                        image = torch.from_numpy(image)[None,]
                        mask = torch.zeros((1, image.shape[1], image.shape[2]), dtype=torch.float32, device="cpu")

                    output_images.append(image)
                    output_masks.append(mask)

                except Exception as e:
                    print(f"[ImageCacheManager] 处理文件时出错: {str(e)}")
                    continue

            # 清空缓存（如果需要）
            if clear_after_get:
                self.clear_cache()
                print(f"[ImageCacheManager] 已清空缓存")

            if not output_images:
                print(f"[ImageCacheManager] 没有成功加载任何图像，返回空图像")
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
                return [empty_image], [empty_mask]

            print(f"[ImageCacheManager] 成功获取 {len(output_images)} 张图像")
            return output_images, output_masks

        except Exception as e:
            print(f"[ImageCacheManager] 获取图像时出错: {str(e)}")
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
            return [empty_image], [empty_mask]

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


# 全局缓存管理器实例
cache_manager = ImageCacheManager()


class ImageReceiver:
    """
    图像获取节点 - 主动从全局单通道缓存中获取图像数据
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {}
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    CATEGORY = CATEGORY_TYPE
    OUTPUT_IS_LIST = (True,)
    FUNCTION = "get_cached_images"

    def get_cached_images(self) -> List[torch.Tensor]:
        """
        从全局缓存中获取图像数据
        """
        try:
            print(f"[ImageCacheGet] 开始获取缓存图像")

            # 使用缓存管理器获取最新图像（固定不清除缓存）
            images, _ = cache_manager.get_cached_images(
                get_latest=True,  # 总是获取最新图像
                index=0,  # 不再使用索引
                clear_after_get=False  # 固定不清除缓存
            )

            # 发送成功toast通知
            try:
                from server import PromptServer
                PromptServer.instance.send_sync("image-cache-toast", {
                    "message": f"成功获取 {len(images)} 张图像",
                    "type": "success",
                    "duration": 3000
                })
            except ImportError:
                print("[ImageCacheGet] 警告: 不在ComfyUI环境中，跳过toast通知")
            except Exception as e:
                print(f"[ImageCacheGet] Toast通知失败: {e}")

            print(f"[ImageCacheGet] ✓ 成功获取 {len(images)} 张图像")
            return images

        except Exception as e:
            error_msg = f"获取图像失败: {str(e)}"
            print(f"[ImageCacheGet] ✗ {error_msg}")

            # 发送错误toast通知
            try:
                from server import PromptServer
                PromptServer.instance.send_sync("image-cache-toast", {
                    "message": error_msg,
                    "type": "error",
                    "duration": 5000
                })
            except ImportError:
                print("[ImageCacheGet] 警告: 不在ComfyUI环境中，跳过toast通知")
            except Exception as toast_e:
                print(f"[ImageCacheGet] Toast通知失败: {toast_e}")

            # 返回空图像但不要抛出异常，避免中断工作流
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return [empty_image]


# 节点映射
def get_node_class_mappings():
    return {
        "ImageCacheGet": ImageReceiver
    }

def get_node_display_name_mappings():
    return {
        "ImageCacheGet": "图像缓存获取 (Image Cache Get)"
    }

NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()