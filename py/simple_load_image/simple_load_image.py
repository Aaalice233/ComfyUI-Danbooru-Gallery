"""
简易加载图像节点 (Simple Load Image)
支持上传图像、选择图像，第一个选项为黑色图像
"""

import os
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
from typing import Tuple

# Logger导入
from ..utils.logger import get_logger
logger = get_logger(__name__)

# 导入ComfyUI的辅助模块
try:
    import folder_paths
    import node_helpers
except ImportError:
    logger.warning("警告: 无法导入 folder_paths 或 node_helpers")
    folder_paths = None
    node_helpers = None

# 常量定义
CATEGORY_TYPE = "danbooru"
DEFAULT_BLACK_IMAGE_SIZE = 1024
BLACK_IMAGE_FILENAME = "simple_none.png"  # 黑色图像文件名


def create_black_image_file():
    """
    创建黑色图像文件到ComfyUI的input目录

    Returns:
        bool: 创建成功返回True，否则返回False
    """
    if not folder_paths:
        logger.info("folder_paths不可用，无法创建黑色图像文件")
        return False

    try:
        # 获取input目录
        input_dir = folder_paths.get_input_directory()
        black_image_path = os.path.join(input_dir, BLACK_IMAGE_FILENAME)

        # 如果文件已存在，直接返回
        if os.path.exists(black_image_path):
            return True

        # 创建1024x1024纯黑色图像
        black_image = Image.new('RGB', (DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE), 'black')

        # 保存为PNG
        black_image.save(black_image_path, 'PNG')
        logger.info(f"已创建黑色图像文件: {black_image_path}")
        return True

    except Exception as e:
        logger.error(f"创建黑色图像文件失败: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return False


class SimpleLoadImage:
    """
    简易加载图像节点

    功能：
    - 支持从input目录加载图像
    - 支持上传图像
    - 第一个选项为黑色图像文件
    - 返回IMAGE类型张量
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        if not folder_paths:
            return {
                "required": {
                    "image": ("STRING", {"default": "", "tooltip": "图像文件名"})
                }
            }

        # 确保黑色图像文件存在
        create_black_image_file()

        # 获取input目录下的图像文件
        input_dir = folder_paths.get_input_directory()
        files = []
        try:
            files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
            files = folder_paths.filter_files_content_types(files, ["image"])
        except Exception as e:
            logger.error(f"获取图像文件列表失败: {e}")

        # 将黑色图像文件放在最前面
        if BLACK_IMAGE_FILENAME in files:
            files.remove(BLACK_IMAGE_FILENAME)
        files = [BLACK_IMAGE_FILENAME] + sorted(files)

        return {
            "required": {
                "image": (files, {"image_upload": True, "tooltip": "选择图像文件"})
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "mask")
    FUNCTION = "load_image"
    CATEGORY = CATEGORY_TYPE

    @classmethod
    def VALIDATE_INPUTS(cls, image):
        """
        验证输入的图像文件是否存在（支持带标记的文件名）

        Args:
            image: 图像文件名（可能包含 [input]、[output]、[temp] 等标记）

        Returns:
            True: 文件有效
            str: 错误信息（文件无效时）
        """
        if not folder_paths:
            return True  # folder_paths不可用时跳过验证

        # 使用ComfyUI的exists_annotated_filepath来验证文件
        # 这个函数会正确处理带标记的文件名，如 'clipspace/xxx.png [input]'
        if not folder_paths.exists_annotated_filepath(image):
            return f"Invalid image file: {image}"

        return True

    def load_image(self, image: str) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        加载图像和mask

        Args:
            image: 图像文件名

        Returns:
            (IMAGE, MASK): 图像张量和mask张量
                IMAGE形状为 (batch, height, width, channels)
                MASK形状为 (batch, height, width)
        """
        # 如果要加载默认黑色图像，确保文件存在（用户可能误删）
        if image == BLACK_IMAGE_FILENAME:
            create_black_image_file()

        # 检查folder_paths和node_helpers是否可用
        if not folder_paths or not node_helpers:
            logger.error("错误: folder_paths 或 node_helpers 不可用")
            # 返回黑色图像和空mask作为后备
            black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
            black_mask = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE), dtype=torch.float32)
            return (black_image, black_mask)

        try:
            # 获取图像完整路径（使用ComfyUI原生方法）
            image_path = folder_paths.get_annotated_filepath(image)

            # 检查文件是否存在
            if not os.path.exists(image_path):
                logger.error(f"图像文件不存在: {image_path}，使用默认黑色占位图")
                # 返回黑色图像和空mask作为后备
                black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
                black_mask = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE), dtype=torch.float32)
                return (black_image, black_mask)

            # 使用PIL打开图像（ComfyUI原生方法）
            img = node_helpers.pillow(Image.open, image_path)

            # 处理图像序列（如GIF）
            output_images = []
            output_masks = []

            for i in ImageSequence.Iterator(img):
                # 处理EXIF方向信息
                i = node_helpers.pillow(ImageOps.exif_transpose, i)

                # 处理特殊模式
                if i.mode == 'I':
                    i = i.point(lambda i: i * (1 / 255))

                # 转换为RGB模式
                image_rgb = i.convert("RGB")

                # 转换为numpy数组并归一化到[0, 1]
                image_np = np.array(image_rgb).astype(np.float32) / 255.0

                # 转换为torch张量，添加batch维度
                image_tensor = torch.from_numpy(image_np)[None,]

                # 提取mask（从alpha通道）
                if 'A' in i.getbands():
                    # 图像有alpha通道，提取它作为mask
                    mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                    mask = 1. - torch.from_numpy(mask)
                elif i.mode == 'P' and 'transparency' in i.info:
                    # 调色板模式且有透明度信息
                    mask = np.array(i.convert('RGBA').getchannel('A')).astype(np.float32) / 255.0
                    mask = 1. - torch.from_numpy(mask)
                else:
                    # 没有alpha通道，创建全零mask（全白，即不透明）
                    mask = torch.zeros((image_tensor.shape[1], image_tensor.shape[2]), dtype=torch.float32)

                output_images.append(image_tensor)
                output_masks.append(mask.unsqueeze(0))

            # 合并所有图像帧和mask
            if len(output_images) > 1:
                result_image = torch.cat(output_images, dim=0)
                result_mask = torch.cat(output_masks, dim=0)
            elif len(output_images) == 1:
                result_image = output_images[0]
                result_mask = output_masks[0]
            else:
                # 如果没有加载到图像，返回黑色图像和空mask
                logger.error(f"图像加载失败: {image}")
                result_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
                result_mask = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE), dtype=torch.float32)

            return (result_image, result_mask)

        except Exception as e:
            logger.info(f"加载图像时出错: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            # 发生错误时返回黑色图像和空mask
            black_image = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE, 3), dtype=torch.float32)
            black_mask = torch.zeros((1, DEFAULT_BLACK_IMAGE_SIZE, DEFAULT_BLACK_IMAGE_SIZE), dtype=torch.float32)
            return (black_image, black_mask)


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
