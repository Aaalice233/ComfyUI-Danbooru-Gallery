"""
PixelKSampleUpscalerWithSharpening - 自带CAS锐化的放大器
作者：哈雷酱 (本小姐的完美作品！)
"""

import torch
import torch.nn.functional as F
import comfy.utils
import comfy.sample
import comfy.model_management
import nodes
import latent_preview


def apply_cas_sharpening(image: torch.Tensor, amount: float = 0.6) -> torch.Tensor:
    """
    应用Contrast Adaptive Sharpening (CAS)锐化算法

    基于AMD FidelityFX CAS算法实现

    Args:
        image: 输入图像张量 [B, H, W, C] 范围[0, 1]
        amount: 锐化强度 [0, 1]，默认0.6

    Returns:
        锐化后的图像张量 [B, H, W, C]
    """
    if amount <= 0:
        return image

    epsilon = 1e-5

    # 转换为 [B, C, H, W] 格式以便处理
    img = image.permute([0, 3, 1, 2])

    # Padding以处理边缘像素
    img = F.pad(img, pad=(1, 1, 1, 1))

    # 提取3x3邻域
    a = img[..., :-2, :-2]   # 左上
    b = img[..., :-2, 1:-1]  # 上
    c = img[..., :-2, 2:]    # 右上
    d = img[..., 1:-1, :-2]  # 左
    e = img[..., 1:-1, 1:-1] # 中心
    f = img[..., 1:-1, 2:]   # 右
    g = img[..., 2:, :-2]    # 左下
    h = img[..., 2:, 1:-1]   # 下
    i = img[..., 2:, 2:]     # 右下

    # 计算十字形邻域的对比度
    cross = (b, d, e, f, h)
    mn = torch.min(torch.min(torch.min(torch.min(b, d), e), f), h)
    mx = torch.max(torch.max(torch.max(torch.max(b, d), e), f), h)

    # 计算对角邻域
    mn2 = torch.min(torch.min(torch.min(a, c), g), i)
    mx2 = torch.max(torch.max(torch.max(a, c), g), i)

    # 合并对比度
    mx = mx + mx2
    mn = mn + mn2

    # 计算局部权重
    inv_mx = torch.reciprocal(mx + epsilon)
    amp = inv_mx * torch.minimum(mn, (2 - mx))

    # 应用锐化强度
    amp = torch.sqrt(amp)
    w = -amp * (amount * (1/5 - 1/8) + 1/8)
    div = torch.reciprocal(1 + 4*w)

    # 应用锐化滤波器
    output = ((b + d + f + h) * w + e) * div
    output = output.clamp(0, 1)

    # 转换回 [B, H, W, C] 格式
    output = output.permute([0, 2, 3, 1])

    return output


class PixelKSampleUpscalerWithSharpening:
    """
    带CAS锐化功能的像素放大器

    核心逻辑：
    - 如果提供了upscale_model：使用模型放大，不锐化
    - 如果没有模型且启用锐化：使用简单放大+CAS锐化（快速方案）
    - 如果没有模型且禁用锐化：仅简单放大
    """

    def __init__(self, scale_method, model, vae, seed, steps, cfg, sampler_name,
                 scheduler, positive, negative, denoise, use_tiled_vae,
                 upscale_model_opt=None, pk_hook_opt=None, tile_size=512,
                 scheduler_func=None, enable_sharpening=True, sharpening_amount=0.6):
        """
        初始化放大器

        Args:
            scale_method: 缩放方法 (nearest-exact, bilinear, lanczos, area)
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
            upscale_model_opt: 可选的放大模型（如果提供，将不使用锐化）
            pk_hook_opt: 可选的钩子
            tile_size: 分块大小
            scheduler_func: 可选的调度器函数
            enable_sharpening: 是否启用锐化（仅在无放大模型时有效）
            sharpening_amount: 锐化强度 [0, 1]
        """
        self.scale_method = scale_method
        self.model = model
        self.vae = vae
        self.seed = seed
        self.steps = steps
        self.cfg = cfg
        self.sampler_name = sampler_name
        self.scheduler = scheduler
        self.positive = positive
        self.negative = negative
        self.denoise = denoise
        self.is_tiled = use_tiled_vae
        self.tile_size = tile_size
        self.overlap = 64  # 分块重叠大小

        # 放大模型和锐化参数
        self.upscale_model = upscale_model_opt
        self.pk_hook = pk_hook_opt
        self.scheduler_func = scheduler_func
        self.enable_sharpening = enable_sharpening
        self.sharpening_amount = sharpening_amount

    def upscale(self, step_info, samples, upscale_factor, save_temp_prefix=None, unique_id=None):
        """
        按倍数执行放大操作（Impact Pack 兼容接口）

        Args:
            step_info: 步骤信息（用于进度显示）
            samples: 潜空间样本字典 {"samples": tensor}
            upscale_factor: 放大倍数
            save_temp_prefix: 临时文件保存前缀（可选）
            unique_id: 节点唯一ID（用于进度显示）

        Returns:
            放大后的潜空间样本字典
        """
        # 决定使用哪种放大策略
        use_model = self.upscale_model is not None
        use_sharpening = (not use_model) and self.enable_sharpening

        if use_model:
            # 策略1：使用放大模型（慢但高质量）
            return self._upscale_with_model(samples, upscale_factor, step_info, unique_id)
        elif use_sharpening:
            # 策略2：简单放大 + CAS锐化（快速方案）
            return self._upscale_with_sharpening(samples, upscale_factor, step_info, unique_id)
        else:
            # 策略3：仅简单放大
            return self._simple_upscale(samples, upscale_factor, step_info, unique_id)

    def upscale_shape(self, step_info, samples, w, h, save_temp_prefix=None, unique_id=None):
        """
        按目标尺寸执行放大操作（Impact Pack 兼容接口）

        Args:
            step_info: 步骤信息（用于进度显示）
            samples: 潜空间样本字典 {"samples": tensor}
            w: 目标宽度
            h: 目标高度
            save_temp_prefix: 临时文件保存前缀（可选）
            unique_id: 节点唯一ID（用于进度显示）

        Returns:
            放大后的潜空间样本字典
        """
        # 决定使用哪种放大策略
        use_model = self.upscale_model is not None
        use_sharpening = (not use_model) and self.enable_sharpening

        if use_model:
            # 策略1：使用放大模型（慢但高质量）
            return self._upscale_shape_with_model(samples, w, h, step_info, unique_id)
        elif use_sharpening:
            # 策略2：简单放大 + CAS锐化（快速方案）
            return self._upscale_shape_with_sharpening(samples, w, h, step_info, unique_id)
        else:
            # 策略3：仅简单放大
            return self._upscale_shape_simple(samples, w, h, step_info, unique_id)

    def _upscale_with_model(self, samples, upscale_factor, step_info=None, unique_id=None):
        """使用放大模型进行放大（原始流程，不锐化）"""
        # 钩子：设置步骤信息
        if self.pk_hook is not None and hasattr(self.pk_hook, 'set_steps'):
            self.pk_hook.set_steps(step_info)

        # 解码潜空间到像素空间 [B, H, W, C]
        if self.is_tiled:
            pixels = nodes.VAEDecodeTiled().decode(self.vae, samples, self.tile_size, self.overlap)[0]
        else:
            pixels = nodes.VAEDecode().decode(self.vae, samples)[0]

        # 钩子：解码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_decode'):
            pixels = self.pk_hook.post_decode(pixels)

        # 计算目标尺寸（pixels 是 [B, H, W, C]）
        height = pixels.shape[1]
        width = pixels.shape[2]
        target_width = max(1, round(width * upscale_factor))
        target_height = max(1, round(height * upscale_factor))

        # 使用放大模型节点（接受和返回 [B, H, W, C]）
        upscaler = nodes.NODE_CLASS_MAPPINGS['ImageUpscaleWithModel']()
        if hasattr(upscaler, 'execute'):
            pixels = upscaler.execute(self.upscale_model, pixels)[0]
        else:
            pixels = upscaler.upscale(self.upscale_model, pixels)[0]

        # 如果尺寸不匹配，使用scale_method调整到目标尺寸
        if pixels.shape[2] != target_width or pixels.shape[1] != target_height:
            pixels = nodes.ImageScale().upscale(pixels, self.scale_method, int(target_width), int(target_height), False)[0]

        # 钩子：上采样后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_upscale'):
            pixels = self.pk_hook.post_upscale(pixels)

        # 编码回潜空间（pixels 是 [B, H, W, C]）
        if self.is_tiled:
            upscaled_latent = nodes.VAEEncodeTiled().encode(self.vae, pixels, self.tile_size, self.overlap)[0]
        else:
            upscaled_latent = nodes.VAEEncode().encode(self.vae, pixels)[0]

        # 钩子：编码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_encode'):
            upscaled_latent = self.pk_hook.post_encode(upscaled_latent)

        # 钩子：采样前（修改所有采样参数）
        if self.pk_hook is not None:
            self.model, self.seed, self.steps, self.cfg, self.sampler_name, self.scheduler, \
            self.positive, self.negative, upscaled_latent, self.denoise = \
                self.pk_hook.pre_ksample(self.model, self.seed, self.steps, self.cfg,
                                        self.sampler_name, self.scheduler, self.positive,
                                        self.negative, upscaled_latent, self.denoise)

        # 保留 noise_mask
        if 'noise_mask' in samples:
            upscaled_latent['noise_mask'] = samples['noise_mask']

        # K-Sample处理
        result = self._ksample(upscaled_latent, step_info, unique_id)
        return result

    def _upscale_with_sharpening(self, samples, upscale_factor, step_info=None, unique_id=None):
        """使用简单放大 + CAS锐化（快速方案）"""
        # 钩子：设置步骤信息
        if self.pk_hook is not None and hasattr(self.pk_hook, 'set_steps'):
            self.pk_hook.set_steps(step_info)

        # 解码潜空间到像素空间 [B, H, W, C]
        if self.is_tiled:
            pixels = nodes.VAEDecodeTiled().decode(self.vae, samples, self.tile_size, self.overlap)[0]
        else:
            pixels = nodes.VAEDecode().decode(self.vae, samples)[0]

        # 钩子：解码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_decode'):
            pixels = self.pk_hook.post_decode(pixels)

        # 计算目标尺寸（pixels 是 [B, H, W, C]）
        height = pixels.shape[1]
        width = pixels.shape[2]
        target_width = max(1, round(width * upscale_factor))
        target_height = max(1, round(height * upscale_factor))

        # 简单放大（使用ImageScale节点）
        pixels = nodes.ImageScale().upscale(pixels, self.scale_method, int(target_width), int(target_height), False)[0]

        # 应用CAS锐化
        pixels = apply_cas_sharpening(pixels, self.sharpening_amount)

        # 钩子：上采样后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_upscale'):
            pixels = self.pk_hook.post_upscale(pixels)

        # 编码回潜空间（pixels 是 [B, H, W, C]）
        if self.is_tiled:
            upscaled_latent = nodes.VAEEncodeTiled().encode(self.vae, pixels, self.tile_size, self.overlap)[0]
        else:
            upscaled_latent = nodes.VAEEncode().encode(self.vae, pixels)[0]

        # 钩子：编码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_encode'):
            upscaled_latent = self.pk_hook.post_encode(upscaled_latent)

        # 钩子：采样前（修改所有采样参数）
        if self.pk_hook is not None:
            self.model, self.seed, self.steps, self.cfg, self.sampler_name, self.scheduler, \
            self.positive, self.negative, upscaled_latent, self.denoise = \
                self.pk_hook.pre_ksample(self.model, self.seed, self.steps, self.cfg,
                                        self.sampler_name, self.scheduler, self.positive,
                                        self.negative, upscaled_latent, self.denoise)

        # 保留 noise_mask
        if 'noise_mask' in samples:
            upscaled_latent['noise_mask'] = samples['noise_mask']

        # K-Sample处理
        result = self._ksample(upscaled_latent, step_info, unique_id)
        return result

    def _simple_upscale(self, samples, upscale_factor, step_info=None, unique_id=None):
        """仅使用简单放大（无模型，无锐化）"""
        # 钩子：设置步骤信息
        if self.pk_hook is not None and hasattr(self.pk_hook, 'set_steps'):
            self.pk_hook.set_steps(step_info)

        # 解码潜空间到像素空间 [B, H, W, C]
        if self.is_tiled:
            pixels = nodes.VAEDecodeTiled().decode(self.vae, samples, self.tile_size, self.overlap)[0]
        else:
            pixels = nodes.VAEDecode().decode(self.vae, samples)[0]

        # 钩子：解码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_decode'):
            pixels = self.pk_hook.post_decode(pixels)

        # 计算目标尺寸（pixels 是 [B, H, W, C]）
        height = pixels.shape[1]
        width = pixels.shape[2]
        target_width = max(1, round(width * upscale_factor))
        target_height = max(1, round(height * upscale_factor))

        # 简单放大（使用ImageScale节点）
        pixels = nodes.ImageScale().upscale(pixels, self.scale_method, int(target_width), int(target_height), False)[0]

        # 钩子：上采样后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_upscale'):
            pixels = self.pk_hook.post_upscale(pixels)

        # 编码回潜空间（pixels 是 [B, H, W, C]）
        if self.is_tiled:
            upscaled_latent = nodes.VAEEncodeTiled().encode(self.vae, pixels, self.tile_size, self.overlap)[0]
        else:
            upscaled_latent = nodes.VAEEncode().encode(self.vae, pixels)[0]

        # 钩子：编码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_encode'):
            upscaled_latent = self.pk_hook.post_encode(upscaled_latent)

        # 钩子：采样前（修改所有采样参数）
        if self.pk_hook is not None:
            self.model, self.seed, self.steps, self.cfg, self.sampler_name, self.scheduler, \
            self.positive, self.negative, upscaled_latent, self.denoise = \
                self.pk_hook.pre_ksample(self.model, self.seed, self.steps, self.cfg,
                                        self.sampler_name, self.scheduler, self.positive,
                                        self.negative, upscaled_latent, self.denoise)

        # 保留 noise_mask
        if 'noise_mask' in samples:
            upscaled_latent['noise_mask'] = samples['noise_mask']

        # K-Sample处理
        result = self._ksample(upscaled_latent, step_info, unique_id)
        return result

    # ========== upscale_shape 版本的方法 ==========

    def _upscale_shape_with_model(self, samples, w, h, step_info=None, unique_id=None):
        """使用放大模型按目标尺寸放大（不锐化）"""
        # 钩子：设置步骤信息
        if self.pk_hook is not None and hasattr(self.pk_hook, 'set_steps'):
            self.pk_hook.set_steps(step_info)

        # 解码潜空间到像素空间 [B, H, W, C]
        if self.is_tiled:
            pixels = nodes.VAEDecodeTiled().decode(self.vae, samples, self.tile_size, self.overlap)[0]
        else:
            pixels = nodes.VAEDecode().decode(self.vae, samples)[0]

        # 钩子：解码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_decode'):
            pixels = self.pk_hook.post_decode(pixels)

        # 使用放大模型节点（接受和返回 [B, H, W, C]）
        upscaler = nodes.NODE_CLASS_MAPPINGS['ImageUpscaleWithModel']()
        if hasattr(upscaler, 'execute'):
            pixels = upscaler.execute(self.upscale_model, pixels)[0]
        else:
            pixels = upscaler.upscale(self.upscale_model, pixels)[0]

        # 如果尺寸不匹配，使用scale_method调整到目标尺寸
        if pixels.shape[2] != w or pixels.shape[1] != h:
            pixels = nodes.ImageScale().upscale(pixels, self.scale_method, int(w), int(h), False)[0]

        # 钩子：上采样后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_upscale'):
            pixels = self.pk_hook.post_upscale(pixels)

        # 编码回潜空间（pixels 是 [B, H, W, C]）
        if self.is_tiled:
            upscaled_latent = nodes.VAEEncodeTiled().encode(self.vae, pixels, self.tile_size, self.overlap)[0]
        else:
            upscaled_latent = nodes.VAEEncode().encode(self.vae, pixels)[0]

        # 钩子：编码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_encode'):
            upscaled_latent = self.pk_hook.post_encode(upscaled_latent)

        # 钩子：采样前（修改所有采样参数）
        if self.pk_hook is not None:
            self.model, self.seed, self.steps, self.cfg, self.sampler_name, self.scheduler, \
            self.positive, self.negative, upscaled_latent, self.denoise = \
                self.pk_hook.pre_ksample(self.model, self.seed, self.steps, self.cfg,
                                        self.sampler_name, self.scheduler, self.positive,
                                        self.negative, upscaled_latent, self.denoise)

        # 保留 noise_mask
        if 'noise_mask' in samples:
            upscaled_latent['noise_mask'] = samples['noise_mask']

        # K-Sample处理
        result = self._ksample(upscaled_latent, step_info, unique_id)
        return result

    def _upscale_shape_with_sharpening(self, samples, w, h, step_info=None, unique_id=None):
        """使用简单放大按目标尺寸放大 + CAS锐化（快速方案）"""
        # 钩子：设置步骤信息
        if self.pk_hook is not None and hasattr(self.pk_hook, 'set_steps'):
            self.pk_hook.set_steps(step_info)

        # 解码潜空间到像素空间 [B, H, W, C]
        if self.is_tiled:
            pixels = nodes.VAEDecodeTiled().decode(self.vae, samples, self.tile_size, self.overlap)[0]
        else:
            pixels = nodes.VAEDecode().decode(self.vae, samples)[0]

        # 钩子：解码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_decode'):
            pixels = self.pk_hook.post_decode(pixels)

        # 简单放大到目标尺寸（使用ImageScale节点）
        pixels = nodes.ImageScale().upscale(pixels, self.scale_method, int(w), int(h), False)[0]

        # 应用CAS锐化
        pixels = apply_cas_sharpening(pixels, self.sharpening_amount)

        # 钩子：上采样后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_upscale'):
            pixels = self.pk_hook.post_upscale(pixels)

        # 编码回潜空间（pixels 是 [B, H, W, C]）
        if self.is_tiled:
            upscaled_latent = nodes.VAEEncodeTiled().encode(self.vae, pixels, self.tile_size, self.overlap)[0]
        else:
            upscaled_latent = nodes.VAEEncode().encode(self.vae, pixels)[0]

        # 钩子：编码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_encode'):
            upscaled_latent = self.pk_hook.post_encode(upscaled_latent)

        # 钩子：采样前（修改所有采样参数）
        if self.pk_hook is not None:
            self.model, self.seed, self.steps, self.cfg, self.sampler_name, self.scheduler, \
            self.positive, self.negative, upscaled_latent, self.denoise = \
                self.pk_hook.pre_ksample(self.model, self.seed, self.steps, self.cfg,
                                        self.sampler_name, self.scheduler, self.positive,
                                        self.negative, upscaled_latent, self.denoise)

        # 保留 noise_mask
        if 'noise_mask' in samples:
            upscaled_latent['noise_mask'] = samples['noise_mask']

        # K-Sample处理
        result = self._ksample(upscaled_latent, step_info, unique_id)
        return result

    def _upscale_shape_simple(self, samples, w, h, step_info=None, unique_id=None):
        """仅使用简单放大按目标尺寸放大（无模型，无锐化）"""
        # 钩子：设置步骤信息
        if self.pk_hook is not None and hasattr(self.pk_hook, 'set_steps'):
            self.pk_hook.set_steps(step_info)

        # 解码潜空间到像素空间 [B, H, W, C]
        if self.is_tiled:
            pixels = nodes.VAEDecodeTiled().decode(self.vae, samples, self.tile_size, self.overlap)[0]
        else:
            pixels = nodes.VAEDecode().decode(self.vae, samples)[0]

        # 钩子：解码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_decode'):
            pixels = self.pk_hook.post_decode(pixels)

        # 简单放大到目标尺寸（使用ImageScale节点）
        pixels = nodes.ImageScale().upscale(pixels, self.scale_method, int(w), int(h), False)[0]

        # 钩子：上采样后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_upscale'):
            pixels = self.pk_hook.post_upscale(pixels)

        # 编码回潜空间（pixels 是 [B, H, W, C]）
        if self.is_tiled:
            upscaled_latent = nodes.VAEEncodeTiled().encode(self.vae, pixels, self.tile_size, self.overlap)[0]
        else:
            upscaled_latent = nodes.VAEEncode().encode(self.vae, pixels)[0]

        # 钩子：编码后
        if self.pk_hook is not None and hasattr(self.pk_hook, 'post_encode'):
            upscaled_latent = self.pk_hook.post_encode(upscaled_latent)

        # 钩子：采样前（修改所有采样参数）
        if self.pk_hook is not None:
            self.model, self.seed, self.steps, self.cfg, self.sampler_name, self.scheduler, \
            self.positive, self.negative, upscaled_latent, self.denoise = \
                self.pk_hook.pre_ksample(self.model, self.seed, self.steps, self.cfg,
                                        self.sampler_name, self.scheduler, self.positive,
                                        self.negative, upscaled_latent, self.denoise)

        # 保留 noise_mask
        if 'noise_mask' in samples:
            upscaled_latent['noise_mask'] = samples['noise_mask']

        # K-Sample处理
        result = self._ksample(upscaled_latent, step_info, unique_id)
        return result

    def _ksample(self, samples, step_info=None, unique_id=None):
        """执行K-Sample采样

        Args:
            samples: 潜空间字典 {"samples": tensor, "noise_mask": optional}
            step_info: 步骤信息
            unique_id: 节点唯一ID（用于进度和预览显示）

        Returns:
            处理后的潜空间字典 {"samples": tensor, "noise_mask": optional}
        """
        device = comfy.model_management.get_torch_device()

        # 从字典中提取 tensor 和 noise_mask
        latent_tensor = samples["samples"].to(device)
        noise_mask = samples.get("noise_mask", None)

        # 准备采样参数
        if self.scheduler_func is not None:
            sigmas = self.scheduler_func(self.model.model, self.steps)
            disable_noise = False
        else:
            sigmas = None
            disable_noise = False

        # 创建预览回调（用于显示采样预览和进度）
        x0_output = {}
        preview_callback = latent_preview.prepare_callback(self.model, self.steps, x0_output)

        # 执行采样
        latent_tensor = comfy.sample.sample(
            self.model,
            comfy.sample.prepare_noise(latent_tensor, self.seed),
            self.steps,
            self.cfg,
            self.sampler_name,
            self.scheduler,
            self.positive,
            self.negative,
            latent_tensor,
            denoise=self.denoise,
            disable_noise=disable_noise,
            start_step=0,
            last_step=self.steps,
            force_full_denoise=True,
            noise_mask=noise_mask,  # 传递 noise_mask
            sigmas=sigmas,
            callback=preview_callback,  # 传递预览回调
            disable_pbar=False,
            seed=self.seed  # 传递种子
        )

        # 包装成字典并保留 noise_mask
        result = {"samples": latent_tensor}
        if noise_mask is not None:
            result['noise_mask'] = noise_mask

        return result
