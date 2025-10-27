from nodes import PreviewImage


class SimpleImageCompare(PreviewImage):
    """简易图像对比节点 - 性能优化版"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "image_a": ("IMAGE",),
                "image_b": ("IMAGE",),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "compare_images"
    OUTPUT_NODE = True
    CATEGORY = "image"
    DESCRIPTION = "通过滑动对比两张图像"

    def compare_images(self,
                       image_a=None,
                       image_b=None,
                       filename_prefix="simple_compare.",
                       prompt=None,
                       extra_pnginfo=None):

        result = {"ui": {"a_images": [], "b_images": []}}

        if image_a is not None and len(image_a) > 0:
            result['ui']['a_images'] = self.save_images(
                image_a, filename_prefix, prompt, extra_pnginfo
            )['ui']['images']

        if image_b is not None and len(image_b) > 0:
            result['ui']['b_images'] = self.save_images(
                image_b, filename_prefix, prompt, extra_pnginfo
            )['ui']['images']

        return result
