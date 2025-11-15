"""
简易Checkpoint加载器（Simple Checkpoint Loader）
基于Checkpoint Loader with Name节点，增加了VAE自定义选项
简化版本：移除文件锁、内存检查、重试机制等复杂功能，遵循KISS原则
"""

import folder_paths
import comfy.sd
import comfy.utils
import os
import sys

# 添加项目根目录到Python路径，以便导入自定义logger
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
from py.utils.logger import get_logger

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

    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "STRING", "STRING", "INT")
    RETURN_NAMES = ("MODEL", "CLIP", "VAE", "model_name", "vae_name", "clip_skip")
    OUTPUT_TOOLTIPS = (
        "用于对latent去噪的模型",
        "用于编码文本提示词的CLIP模型",
        "用于在图像和latent空间之间编码和解码的VAE模型",
        "模型名称，可用于Image Save节点保存模型名称",
        "VAE名称，显示当前使用的VAE（Baked VAE或自定义VAE文件名）",
        "CLIP跳过层数值"
    )

    FUNCTION = "load_checkpoint"
    CATEGORY = CATEGORY_TYPE
    DESCRIPTION = "简化版checkpoint加载器:轻量级、高效"
    
    @classmethod
    def VALIDATE_INPUTS(cls, ckpt_name, vae_name, **kwargs):
        """
        验证输入参数的有效性
            
        Args:
            ckpt_name: checkpoint模型名称
            vae_name: VAE模型名称
            **kwargs: 其他参数
                
        Returns:
            True: 输入有效
            str: 错误信息（输入无效时）
        """
        # 验证checkpoint是否存在
        checkpoint_list = folder_paths.get_filename_list("checkpoints")
        if not checkpoint_list:
            return "没有可用的checkpoint模型"
            
        if ckpt_name not in checkpoint_list:
            logger.warning(f"checkpoint '{ckpt_name}' 不存在，将使用默认checkpoint '{checkpoint_list[0]}'")
            # ComfyUI会自动使用列表中的第一个值
            return True
            
        # 验证VAE是否存在（如果不是Baked VAE）
        if vae_name != "Baked VAE":
            vae_list = folder_paths.get_filename_list("vae")
            if vae_name not in vae_list:
                logger.warning(f"VAE '{vae_name}' 不存在，将使用Baked VAE")
                return True
            
        return True

    def load_checkpoint(self, ckpt_name, vae_name, clip_skip):
        """
        加载checkpoint、VAE和CLIP

        Args:
            ckpt_name: checkpoint模型名称
            vae_name: VAE模型名称
            clip_skip: CLIP跳过层数

        Returns:
            tuple: (MODEL, CLIP, VAE, model_name, vae_name, clip_skip)
        """
        try:
            logger.info(f"开始加载checkpoint: {ckpt_name}, VAE: {vae_name}, CLIP Skip: {clip_skip}")

            # 获取checkpoint文件路径并加载
            ckpt_path = folder_paths.get_full_path_or_raise("checkpoints", ckpt_name)
            out = comfy.sd.load_checkpoint_guess_config(
                ckpt_path,
                output_vae=True,
                output_clip=True,
                embedding_directory=folder_paths.get_folder_paths("embeddings")
            )

            model, clip, vae = out[:3]
            logger.info("checkpoint加载成功")

            # 如果选择了自定义VAE（不是Baked VAE），则加载自定义VAE
            if vae_name != "Baked VAE":
                logger.info(f"加载自定义VAE: {vae_name}")
                vae_path = folder_paths.get_full_path_or_raise("vae", vae_name)
                vae = comfy.sd.VAE(sd=comfy.utils.load_torch_file(vae_path))
                logger.info("自定义VAE加载成功")

            # 应用CLIP跳过层设置
            if clip_skip < -1:
                logger.info(f"应用CLIP跳过层设置: {clip_skip}")
                clip = clip.clone()
                clip.clip_layer(clip_skip)
                logger.info("CLIP跳过层设置应用成功")

            logger.info(f"checkpoint加载完成: {ckpt_name}")
            return (model, clip, vae, ckpt_name, vae_name, clip_skip)

        except Exception as e:
            error_msg = f"checkpoint加载失败: {ckpt_name}, 错误: {str(e)}"
            logger.error(error_msg)
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
