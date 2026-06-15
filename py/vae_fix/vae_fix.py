"""
VAE 图像批次修复节点 (VAE Image Batch Fix)

Wan 系 VAE（含 Qwen-Image VAE，anima 模型用的就是它）在 ComfyUI 里被当成视频 VAE：
VAE.encode() 把 N 张独立图 reshape 成「1 个 N 帧视频」（comfy/sd.py:1034），
导致一批 N 张图编码后塌成 1 张。把 vae.not_video 置 True，编码改走 unsqueeze(2)
分支，N 保留在批次维、每张 T=1，N 张各自独立编码。

只影响编码（decode 不读 not_video），生成阶段不受影响。
"""

import sys


def _dbg(msg):
    print(f"[VAEImageBatchFix] {msg}", file=sys.stderr, flush=True)


class VAEImageBatchFix:
    RETURN_TYPES = ("VAE",)
    RETURN_NAMES = ("vae",)
    FUNCTION = "fix"
    CATEGORY = "danbooru"

    DESCRIPTION = (
        "修复 Wan/Qwen-Image 系 VAE 在放大时把图像批次当视频帧、N 张塌成 1 张的问题。"
        "接在 VAELoader 之后，整条放大流程共用即可。只影响编码，不影响生成。"
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "vae": ("VAE",),
            },
            "optional": {
                "enable": ("BOOLEAN", {"default": True, "label_on": "启用", "label_off": "禁用"}),
            },
        }

    def fix(self, vae, enable=True):
        had_attr = hasattr(vae, "not_video")
        latent_dim = getattr(vae, "latent_dim", None)

        if not enable:
            _dbg(f"已禁用，原样透传 (latent_dim={latent_dim}, not_video={getattr(vae, 'not_video', 'N/A')})")
            return (vae,)

        if not had_attr:
            _dbg(f"该 VAE 无 not_video 属性 (latent_dim={latent_dim})，可能不是 Wan 系 VAE，原样透传")
            return (vae,)

        if latent_dim != 3:
            _dbg(f"latent_dim={latent_dim} 非 3，编码不会走视频分支，无需修复，原样透传")
            return (vae,)

        old = vae.not_video
        vae.not_video = True
        _dbg(f"已置 not_video: {old} -> True (latent_dim=3)，批次图将按 N 张独立编码")
        return (vae,)


NODE_CLASS_MAPPINGS = {
    "VAEImageBatchFix": VAEImageBatchFix,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "VAEImageBatchFix": "VAE 图像批次修复 (VAE Image Batch Fix)",
}
