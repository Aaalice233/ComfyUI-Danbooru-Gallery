"""
PixelKSampleUpscalerSharpening - 带锐化功能的放大器提供者节点
作者：哈雷酱 (本小姐的优雅设计！)
"""

import comfy.samplers
try:
    # 尝试导入Impact Pack的调度器函数
    from impact.core import get_schedulers
except ImportError:
    # 如果Impact Pack未安装，使用ComfyUI的标准调度器
    def get_schedulers():
        return comfy.samplers.KSampler.SCHEDULERS

from .upscaler import PixelKSampleUpscalerWithSharpening


class PixelKSampleUpscalerSharpening:
    """
    PixelKSampleUpscalerProvider with Sharpening

    这是一个增强版的放大器提供者节点，集成了CAS锐化功能。

    核心特性：
    - 如果连接了upscale_model：使用模型放大（高质量，较慢）
    - 如果未连接模型：使用简单放大 + CAS锐化（快速方案）
    - 可选的锐化开关和强度控制

    类别：danbooru
    """

    upscale_methods = ["nearest-exact", "bilinear", "lanczos", "area"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # 基础放大参数
                "scale_method": (cls.upscale_methods,),
                "model": ("MODEL",),
                "vae": ("VAE",),

                # 采样参数
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 10000}),
                "cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0}),
                "sampler_name": (comfy.samplers.KSampler.SAMPLERS,),
                "scheduler": (get_schedulers(),),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),

                # VAE设置
                "use_tiled_vae": ("BOOLEAN", {"default": False}),
                "tile_size": ("INT", {"default": 512, "min": 320, "max": 4096, "step": 64}),

                # 锐化参数（本小姐的创新！）
                "enable_sharpening": ("BOOLEAN", {
                    "default": True,
                    "label_on": "enabled",
                    "label_off": "disabled"
                }),
                "sharpening_amount": ("FLOAT", {
                    "default": 0.6,
                    "min": 0.0,
                    "max": 1.0,
                    "step": 0.01
                }),
            },
            "optional": {
                # 可选的放大模型（如果提供，将不使用锐化）
                "upscale_model_opt": ("UPSCALE_MODEL",),
                "pk_hook_opt": ("PK_HOOK",),
                "scheduler_func_opt": ("SCHEDULER_FUNC",),
            }
        }

    RETURN_TYPES = ("UPSCALER",)
    RETURN_NAMES = ("upscaler",)
    FUNCTION = "create_upscaler"
    CATEGORY = "danbooru"

    def create_upscaler(self, scale_method, model, vae, seed, steps, cfg,
                       sampler_name, scheduler, positive, negative, denoise,
                       use_tiled_vae, tile_size, enable_sharpening, sharpening_amount,
                       upscale_model_opt=None, pk_hook_opt=None, scheduler_func_opt=None):
        """
        创建放大器实例

        Args:
            scale_method: 缩放方法
            model: ComfyUI模型
            vae: VAE模型
            seed: 随机种子
            steps: 采样步数
            cfg: CFG强度
            sampler_name: 采样器名称
            scheduler: 调度器
            positive: 正向条件
            negative: 负向条件
            denoise: 去噪强度
            use_tiled_vae: 是否使用分块VAE
            tile_size: 分块大小
            enable_sharpening: 是否启用锐化（仅在无放大模型时有效）
            sharpening_amount: 锐化强度 [0, 1]
            upscale_model_opt: 可选的放大模型
            pk_hook_opt: 可选的钩子
            scheduler_func_opt: 可选的调度器函数

        Returns:
            (upscaler,): 放大器实例元组
        """
        # 创建本小姐设计的优雅Upscaler实例
        upscaler = PixelKSampleUpscalerWithSharpening(
            scale_method=scale_method,
            model=model,
            vae=vae,
            seed=seed,
            steps=steps,
            cfg=cfg,
            sampler_name=sampler_name,
            scheduler=scheduler,
            positive=positive,
            negative=negative,
            denoise=denoise,
            use_tiled_vae=use_tiled_vae,
            upscale_model_opt=upscale_model_opt,
            pk_hook_opt=pk_hook_opt,
            tile_size=tile_size,
            scheduler_func=scheduler_func_opt,
            enable_sharpening=enable_sharpening,
            sharpening_amount=sharpening_amount
        )

        return (upscaler,)


# 节点类映射
NODE_CLASS_MAPPINGS = {
    "PixelKSampleUpscalerSharpening": PixelKSampleUpscalerSharpening
}

# 显示名称映射
NODE_DISPLAY_NAME_MAPPINGS = {
    "PixelKSampleUpscalerSharpening": "PixelKSampleUpscalerProvider(Sharpening)"
}
