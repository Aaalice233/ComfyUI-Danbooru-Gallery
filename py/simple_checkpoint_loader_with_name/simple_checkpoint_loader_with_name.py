"""
简易Checkpoint加载器（Simple Checkpoint Loader）
基于Checkpoint Loader with Name节点，增加了VAE自定义选项
"""

import folder_paths
import comfy.sd

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
    DESCRIPTION = "加载diffusion模型checkpoint，支持使用内置VAE或自定义VAE"

    def load_checkpoint(self, ckpt_name, vae_name, clip_skip):
        # 加载checkpoint
        ckpt_path = folder_paths.get_full_path_or_raise("checkpoints", ckpt_name)
        out = comfy.sd.load_checkpoint_guess_config(
            ckpt_path,
            output_vae=True,
            output_clip=True,
            embedding_directory=folder_paths.get_folder_paths("embeddings")
        )

        model, clip, vae = out[:3]

        # 如果选择了自定义VAE（不是Baked VAE），则加载自定义VAE
        if vae_name != "Baked VAE":
            vae_path = folder_paths.get_full_path_or_raise("vae", vae_name)
            vae = comfy.sd.VAE(sd=comfy.utils.load_torch_file(vae_path))

        # 应用CLIP跳过层设置
        if clip_skip < -1:
            clip = clip.clone()
            clip.clip_layer(clip_skip)

        return (model, clip, vae, ckpt_name, vae_name)


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
