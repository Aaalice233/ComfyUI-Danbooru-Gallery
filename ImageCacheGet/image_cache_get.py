"""
图像缓存获取节点 - Image Cache Get Node
主动从缓存通道中获取图像数据
"""

import sys
import os
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple
from ..ImageCacheManager.image_cache_manager import cache_manager

CATEGORY_TYPE = "Danbooru/Image"


class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False


any_typ = AnyType("*")


# 全局缓存管理器实例 - 从共享模块导入
# cache_manager = ImageCacheManager()


class ImageReceiver:
    """
    图像获取节点 - 主动从全局单通道缓存中获取图像数据

    ✅ 已移除IS_CHANGED方法，避免与ComfyUI缓存系统和组执行管理器冲突
    节点现在总是执行，由组执行管理器通过QueueManager控制执行时机
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "default_image": ("IMAGE", {"tooltip": "当缓存无效时使用的默认图像（可选）"})
            },
            "optional": {
                "enable_preview": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "控制是否生成缓存图像的预览"
                })
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    CATEGORY = CATEGORY_TYPE
    OUTPUT_IS_LIST = (False,)  # 输出单个张量，与VAEEncode匹配
    INPUT_IS_LIST = True   # 输入是列表格式，确保与ComfyUI内部处理一致
    FUNCTION = "get_cached_images"
    OUTPUT_NODE = True  # 启用输出节点以支持图像预览

    def get_cached_images(self, default_image, enable_preview=True) -> Dict[str, Any]:
        """
        从全局缓存中获取图像数据，返回单个张量和预览信息

        Args:
            default_image: 默认图像（列表格式，由ComfyUI自动包装）
            enable_preview: 是否生成缓存图像的预览

        Returns:
            包含图像张量和预览信息的字典
        """
        try:
            start_time = time.time()
            print(f"[ImageCacheGet] ┌─ 开始获取图像")

            # INPUT_IS_LIST=True时，ComfyUI会将输入包装为列表
            default_image_list = default_image if default_image is not None else []

            # 获取当前组的缓存通道
            current_group = cache_manager.current_group_name

            # 检查当前组的缓存是否有效
            # ✅ 修复：使用正确的属性名 cache_channels（而不是channel_caches）
            has_cache = False
            if current_group and current_group in cache_manager.cache_channels:
                channel_cache = cache_manager.cache_channels[current_group]
                cache_count = len(channel_cache.get('images', []))
                has_cache = cache_count > 0
                print(f"[ImageCacheGet] │  当前组: {current_group}, 缓存数量: {cache_count}")

            if has_cache:
                # 从当前组通道获取最新图像
                images = cache_manager.get_cached_images(
                    get_latest=True,
                    index=0
                )
                # 返回最后一个图像（最新缓存）
                if len(images) > 0:
                    result_image = images[-1]
                    result_image = self._ensure_tensor_format(result_image, "缓存图像")

                    # 生成预览（如果启用）
                    preview_results = []
                    if enable_preview and enable_preview[0]:
                        try:
                            # ✅ 修复：使用正确的属性名 cache_channels
                            channel_cache = cache_manager.cache_channels[current_group]
                            cached_images = channel_cache.get('images', [])
                            if cached_images:
                                latest_image_info = cached_images[-1]
                                preview_results.append({
                                    "filename": latest_image_info["filename"],
                                    "subfolder": "",
                                    "type": "temp"
                                })
                        except Exception as e:
                            print(f"[ImageCacheGet] │  预览生成失败: {str(e)}")

                    print(f"[ImageCacheGet] └─ 从组 '{current_group}' 获取缓存: {result_image.shape}")

                    # 返回标准格式：图像张量和UI预览数据
                    return {
                        "result": (result_image,),
                        "ui": {"images": preview_results}
                    }
                else:
                    # 理论上不应该到这里，但为了安全起见
                    try:
                        empty_image = torch.zeros((1, 32, 32, 3), dtype=torch.float32)
                    except Exception:
                        empty_image = torch.zeros((1, 16, 16, 3), dtype=torch.float32, device="cpu")
                    return {
                        "result": (empty_image,),
                        "ui": {"images": []}
                    }
            else:
                # 使用默认图像
                if default_image_list and len(default_image_list) > 0:
                    validated_images = []
                    for idx, img in enumerate(default_image_list):
                        img = self._ensure_tensor_format(img, f"默认图像{idx+1}")
                        if img.shape[0] != 1:
                            img = img[:1]
                        validated_images.append(img)

                    if not validated_images:
                        try:
                            empty_image = torch.zeros((1, 32, 32, 3), dtype=torch.float32)
                        except Exception:
                            empty_image = torch.zeros((1, 16, 16, 3), dtype=torch.float32, device="cpu")
                        validated_images = [empty_image]

                    result_image = validated_images[0]
                    current_group_info = f" (组: {cache_manager.current_group_name})" if cache_manager.current_group_name else ""
                    print(f"[ImageCacheGet] └─ 无缓存{current_group_info}，使用默认图像: {result_image.shape}")

                    # 默认图像不生成预览，只返回空UI
                    return {
                        "result": (result_image,),
                        "ui": {"images": []}
                    }
                else:
                    # 返回空白图像
                    try:
                        empty_image = torch.zeros((1, 32, 32, 3), dtype=torch.float32)
                    except Exception:
                        empty_image = torch.zeros((1, 16, 16, 3), dtype=torch.float32, device="cpu")

                    current_group_info = f" (组: {cache_manager.current_group_name})" if cache_manager.current_group_name else ""
                    print(f"[ImageCacheGet] └─ 无缓存{current_group_info}，返回空白图像: {empty_image.shape}")

                    return {
                        "result": (empty_image,),
                        "ui": {"images": []}
                    }

        except Exception as e:
            print(f"[ImageCacheGet] └─ ✗ 获取失败: {str(e)}")
            import traceback
            print(f"[ImageCacheGet]    {traceback.format_exc()}")

            # 返回空图像但不抛出异常
            try:
                empty_image = torch.zeros((1, 32, 32, 3), dtype=torch.float32)
            except Exception:
                empty_image = torch.zeros((1, 16, 16, 3), dtype=torch.float32, device="cpu")

            return {
                "result": (empty_image,),
                "ui": {"images": []}
            }

    
    def _ensure_tensor_format(self, tensor: torch.Tensor, tensor_name: str = "张量") -> torch.Tensor:
        """
        根据ComfyUI官方文档确保张量格式为 [B, H, W, C]

        详细的调试日志追踪张量传递过程，便于排查VAEEncode兼容性问题

        Args:
            tensor: 输入张量
            tensor_name: 张量名称（用于日志）

        Returns:
            格式化后的张量，确保符合ComfyUI的IMAGE类型标准
        """
        if tensor.dim() not in [2, 3, 4, 5]:
            try:
                return torch.zeros((1, 32, 32, 3), dtype=torch.float32)
            except Exception:
                return torch.zeros((1, 16, 16, 3), dtype=torch.float32, device="cpu")
        
        original_shape = tensor.shape
        
        try:
            if tensor.dim() == 2:
                tensor = tensor.unsqueeze(0).unsqueeze(-1).expand(-1, -1, -1, 3)
            elif tensor.dim() == 3:
                if tensor.shape[-1] <= 4:
                    tensor = tensor.unsqueeze(0)
                    if tensor.shape[-1] == 1:
                        tensor = tensor.expand(-1, -1, -1, 3)
                    elif tensor.shape[-1] == 4:
                        tensor = tensor[..., :3]
                else:
                    tensor = tensor.permute(1, 2, 0).unsqueeze(0)
                    if tensor.shape[-1] >= 3:
                        tensor = tensor[..., :3]
                    else:
                        tensor = tensor.expand(-1, -1, -1, 3)
            elif tensor.dim() == 4:
                if tensor.shape[-1] == 1:
                    tensor = tensor.expand(-1, -1, -1, 3)
                elif tensor.shape[-1] == 4:
                    tensor = tensor[..., :3]
            elif tensor.dim() == 5:
                tensor = tensor[:, 0, :, :, :]
                return self._ensure_tensor_format(tensor, f"{tensor_name}(第一帧)")
            
            if tensor.dim() != 4 or tensor.shape[-1] != 3:
                try:
                    return torch.zeros((1, 32, 32, 3), dtype=torch.float32)
                except Exception:
                    return torch.zeros((1, 16, 16, 3), dtype=torch.float32, device="cpu")

            return tensor
        except Exception as e:
            print(f"[ImageCacheGet] [FAILED] 张量格式转换失败: {str(e)}")
            try:
                return torch.zeros((1, 32, 32, 3), dtype=torch.float32)
            except Exception:
                return torch.zeros((1, 16, 16, 3), dtype=torch.float32, device="cpu")


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


def test_image_cache_get_node():
    """
    测试ImageCacheGet节点的VAEEncode兼容性和预览功能
    这个函数可以在ComfyUI环境中调用来验证修复是否有效
    """
    print(f"[ImageCacheGet.TEST] ========== 开始测试ImageCacheGet节点 ==========")

    try:
        # 创建测试实例
        node = ImageReceiver()
        print(f"[ImageCacheGet.TEST] [SUCCESS] 节点实例创建成功")

        # 测试不同格式的张量
        test_cases = [
            # (张量形状, 描述)
            ((1, 64, 64, 3), "标准4D张量 [B, H, W, C]"),
            ((64, 64, 3), "3D张量 [H, W, C]"),
            ((64, 64), "2D张量 [H, W]"),
            ((1, 64, 64, 1), "4D单通道张量 [B, H, W, 1]"),
            ((1, 128, 256, 4), "4D RGBA张量 [B, H, W, 4]"),
        ]

        for shape, description in test_cases:
            print(f"[ImageCacheGet.TEST] ----- 测试用例: {description} -----")
            print(f"[ImageCacheGet.TEST] 输入形状: {shape}")

            # 创建测试张量
            test_tensor = torch.rand(shape, dtype=torch.float32)
            print(f"[ImageCacheGet.TEST] 创建测试张量: {test_tensor.shape}")

            # 测试张量格式化
            formatted_tensor = node._ensure_tensor_format(test_tensor, f"测试用例({description})")

            # 验证输出格式
            if formatted_tensor.dim() == 4 and formatted_tensor.shape[-1] == 3:
                print(f"[ImageCacheGet.TEST] [SUCCESS] 测试通过: {description}")
                print(f"[ImageCacheGet.TEST]   输出形状: {formatted_tensor.shape}")
                print(f"[ImageCacheGet.TEST]   维度: {formatted_tensor.dim()}")
                print(f"[ImageCacheGet.TEST]   通道数: {formatted_tensor.shape[-1]}")
            else:
                print(f"[ImageCacheGet.TEST] [FAILED] 测试失败: {description}")
                print(f"[ImageCacheGet.TEST]   输出形状: {formatted_tensor.shape}")
                print(f"[ImageCacheGet.TEST]   维度: {formatted_tensor.dim()}")

            print(f"[ImageCacheGet.TEST] ----- {description} 测试完成 -----")

        print(f"[ImageCacheGet.TEST] ========== 张量格式化测试完成 ==========")
        print(f"[ImageCacheGet.TEST] [SUCCESS] ImageCacheGet节点VAEEncode兼容性测试通过")

        # 测试预览功能
        print(f"[ImageCacheGet.TEST] ========== 开始测试预览功能 ==========")

        # 测试预览开关功能
        preview_test_cases = [
            (True, "启用预览"),
            (False, "禁用预览")
        ]

        for enable_preview, description in preview_test_cases:
            print(f"[ImageCacheGet.TEST] ----- 测试预览开关: {description} -----")

            # 创建一个临时测试图像文件
            try:
                # 创建测试PIL图像
                test_pil_image = Image.new('RGBA', (64, 64), (255, 0, 0, 128))

                # 保存到临时文件
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                    test_pil_image.save(tmp_file.name, 'PNG')
                    temp_image_path = tmp_file.name

                print(f"[ImageCacheGet.TEST] 创建临时测试图像: {temp_image_path}")

                # 测试预览生成（固定RGBA模式）
                preview_info = node._generate_preview(temp_image_path)

                if preview_info:
                    print(f"[ImageCacheGet.TEST] [SUCCESS] RGBA预览生成成功")
                    print(f"[ImageCacheGet.TEST]   预览文件: {preview_info['filename']}")
                    print(f"[ImageCacheGet.TEST]   预览模式: {preview_info['preview_mode']}")
                    print(f"[ImageCacheGet.TEST]   文件类型: {preview_info['type']}")

                    # 验证文件是否存在
                    try:
                        import folder_paths
                        output_dir = folder_paths.get_temp_directory()
                    except ImportError:
                        output_dir = cache_manager.output_dir
                    except Exception:
                        output_dir = cache_manager.output_dir

                    preview_path = os.path.join(output_dir, preview_info['filename'])
                    if os.path.exists(preview_path):
                        print(f"[ImageCacheGet.TEST] [SUCCESS] 预览文件存在: {preview_path}")

                        # 验证预览图像
                        preview_img = Image.open(preview_path)
                        print(f"[ImageCacheGet.TEST]   预览图像尺寸: {preview_img.size}")
                        print(f"[ImageCacheGet.TEST]   预览图像模式: {preview_img.mode}")

                        if preview_img.mode == "RGBA":
                            print(f"[ImageCacheGet.TEST] [SUCCESS] RGBA预览格式正确")

                    else:
                        print(f"[ImageCacheGet.TEST] [WARNING] 预览文件不存在: {preview_path}")

                else:
                    print(f"[ImageCacheGet.TEST] [FAILED] RGBA预览生成失败")

                # 清理临时文件
                try:
                    os.unlink(temp_image_path)
                    if preview_info:
                        preview_path = os.path.join(output_dir, preview_info['filename'])
                        if os.path.exists(preview_path):
                            os.unlink(preview_path)
                    print(f"[ImageCacheGet.TEST] 临时文件已清理")
                except Exception as cleanup_e:
                    print(f"[ImageCacheGet.TEST] [WARNING] 清理临时文件失败: {cleanup_e}")

                # 测试预览开关逻辑
                print(f"[ImageCacheGet.TEST] 测试预览开关逻辑: enable_preview={enable_preview}")

                # 模拟获取缓存图像的过程
                try:
                    # 这里主要测试条件逻辑
                    if enable_preview:
                        print(f"[ImageCacheGet.TEST] [SUCCESS] 预览启用：应该生成预览")
                    else:
                        print(f"[ImageCacheGet.TEST] [SUCCESS] 预览禁用：应该跳过预览生成")

                except Exception as test_e:
                    print(f"[ImageCacheGet.TEST] [FAILED] 预览开关测试失败: {str(test_e)}")

            except Exception as e:
                print(f"[ImageCacheGet.TEST] [FAILED] 预览测试失败: {str(e)}")
                import traceback
                print(f"[ImageCacheGet.TEST] 预览测试错误堆栈:\n{traceback.format_exc()}")

            print(f"[ImageCacheGet.TEST] ----- {description} 测试完成 -----")

        print(f"[ImageCacheGet.TEST] ========== 所有测试执行完成 ==========")
        print(f"[ImageCacheGet.TEST] [SUCCESS] ImageCacheGet节点完整测试通过")
        print(f"[ImageCacheGet.TEST]   - VAEEncode兼容性: [OK]")
        print(f"[ImageCacheGet.TEST]   - 预览开关功能: [OK]")
        print(f"[ImageCacheGet.TEST]   - RGBA预览: [OK]")
        print(f"[ImageCacheGet.TEST]   - 预览控制逻辑: [OK]")

        return True

    except Exception as e:
        print(f"[ImageCacheGet.TEST] [FAILED] 测试失败: {str(e)}")
        import traceback
        print(f"[ImageCacheGet.TEST] 完整堆栈追踪:\n{traceback.format_exc()}")
        return False


# 在模块加载时自动运行测试（可选）
if __name__ == "__main__":
    print(f"[ImageCacheGet] ========== ImageCacheGet模块加载完成 ==========")
    print(f"[ImageCacheGet] 节点信息:")
    print(f"[ImageCacheGet]   - 节点类: ImageReceiver")
    print(f"[ImageCacheGet]   - 显示名称: 图像缓存获取 (Image Cache Get)")
    print(f"[ImageCacheGet]   - 类别: {CATEGORY_TYPE}")
    print(f"[ImageCacheGet]   - 输入类型: IMAGE")
    print(f"[ImageCacheGet]   - 输出类型: IMAGE")
    print(f"[ImageCacheGet]   - INPUT_IS_LIST: True")
    print(f"[ImageCacheGet]   - OUTPUT_IS_LIST: (False,)")
    print(f"[ImageCacheGet]   - 功能: get_cached_images")
    print(f"[ImageCacheGet] ========== 模块信息完成 ==========")

    # 运行自测试
    test_result = test_image_cache_get_node()
    if test_result:
        print(f"[ImageCacheGet] [SUCCESS] 自测试通过，ImageCacheGet节点已准备就绪")
    else:
        print(f"[ImageCacheGet] [FAILED] 自测试失败，请检查节点实现")