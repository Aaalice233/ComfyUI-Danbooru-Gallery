"""
简易加载图像节点 (Simple Load Image)
支持上传图像、选择图像，选择None时加载内置黑色图像
"""

import os
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
from typing import Tuple

# 导入ComfyUI的辅助模块
try:
    import folder_paths
    import node_helpers
except ImportError:
    print("[SimpleLoadImage] 警告: 无法导入 folder_paths 或 node_helpers")
    folder_paths = None
    node_helpers = None

# 常量定义
CATEGORY_TYPE = "danbooru"
DEFAULT_BLACK_IMAGE_SIZE = 1024
BLACK_IMAGE_FILENAME = "_none_black_1024x1024.png"  # 内置黑色图像文件名

# 获取插件目录路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
BLACK_IMAGE_PATH = os.path.join(PLUGIN_DIR, BLACK_IMAGE_FILENAME)


class SimpleLoadImage:
    """
    简易加载图像节点

    功能：
    - 支持从input目录加载图像
    - 支持上传图像
    - 选择黑色图像文件时返回纯黑色图像
    - 返回IMAGE类型张量
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        if not folder_paths:
            return {
                "required": {
                    "image": (["None"], {"default": "None", "tooltip": "图像文件名"})
                }
            }

        # 获取input目录下的图像文件
        input_dir = folder_paths.get_input_directory()
        files = []
        try:
            files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
            files = folder_paths.filter_files_content_types(files, ["image"])
        except Exception as e:
            print(f"[SimpleLoadImage] 获取图像文件列表失败: {e}")

        # 将None选项放在最前面
        files = ["None"] + sorted(files)

        return {
            "required": {
                "image": (files, {"image_upload": True, "tooltip": "选择图像文件，选择None则加载内置黑色图像"})
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "load_image"
    CATEGORY = CATEGORY_TYPE

    def load_image(self, image: str) -> Tuple[torch.Tensor]:
        """
        加载图像或加载内置黑色图像

        Args:
            image: 图像文件名，"None"表示加载内置黑色图像

        Returns:
            (IMAGE,): 图像张量，形状为 (batch, height, width, channels)
        """
        # 如果选择None，加载内置黑色图像
        if not image or image.strip() == "" or image == "None":
            print(f"[SimpleLoadImage] 选择None，加载内置黑色图像")
            try:
                # 检查内置黑色图像文件是否存在
                if not os.path.exists(BLACK_IMAGE_PATH):
                    print(f"[SimpleLoadImage] 内置黑色图像文件不存在: {BLACK_IMAGE_PATH}，返回torch黑色图像")
                    black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
                    return (black_image,)

                # 使用内置黑色图像的路径
                image_path = BLACK_IMAGE_PATH
            except Exception as e:
                print(f"[SimpleLoadImage] 加载内置黑色图像失败: {e}，返回torch黑色图像")
                black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
                return (black_image,)
        else:
            # 检查folder_paths和node_helpers是否可用
            if not folder_paths or not node_helpers:
                print("[SimpleLoadImage] 错误: folder_paths 或 node_helpers 不可用，返回黑色图像")
                black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
                return (black_image,)

            # 获取图像完整路径
            image_path = folder_paths.get_annotated_filepath(image)

            # 检查文件是否存在
            if not os.path.exists(image_path):
                print(f"[SimpleLoadImage] 图像文件不存在: {image_path}，返回黑色图像")
                black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
                return (black_image,)

        # 统一的图像加载逻辑（适用于None和普通图像）
        try:
            # 使用PIL打开图像
            if node_helpers:
                img = node_helpers.pillow(Image.open, image_path)
            else:
                img = Image.open(image_path)

            # 处理图像序列（如GIF）
            output_images = []

            for i in ImageSequence.Iterator(img):
                # 处理EXIF方向信息
                if node_helpers:
                    i = node_helpers.pillow(ImageOps.exif_transpose, i)
                else:
                    i = ImageOps.exif_transpose(i)

                # 处理特殊模式
                if i.mode == 'I':
                    i = i.point(lambda i: i * (1 / 255))

                # 转换为RGB模式
                image_rgb = i.convert("RGB")

                # 转换为numpy数组并归一化到[0, 1]
                image_np = np.array(image_rgb).astype(np.float32) / 255.0

                # 转换为torch张量，添加batch维度
                image_tensor = torch.from_numpy(image_np)[None,]

                output_images.append(image_tensor)

            # 合并所有图像帧
            if len(output_images) > 1:
                result = torch.cat(output_images, dim=0)
                print(f"[SimpleLoadImage] 加载图像序列: {image}，共 {len(output_images)} 帧")
            elif len(output_images) == 1:
                result = output_images[0]
                if image == "None":
                    print(f"[SimpleLoadImage] 加载内置黑色图像，尺寸: {result.shape}")
                else:
                    print(f"[SimpleLoadImage] 加载图像: {image}，尺寸: {result.shape}")
            else:
                # 如果没有加载到图像，返回黑色图像
                print(f"[SimpleLoadImage] 图像加载失败: {image}，返回torch黑色图像")
                result = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)

            return (result,)

        except Exception as e:
            print(f"[SimpleLoadImage] 加载图像时出错: {e}")
            import traceback
            traceback.print_exc()
            # 发生错误时返回torch黑色图像
            black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
            return (black_image,)


# ==================== 节点映射 ====================

def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "SimpleLoadImage": SimpleLoadImage
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "SimpleLoadImage": "简易加载图像 (Simple Load Image)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
