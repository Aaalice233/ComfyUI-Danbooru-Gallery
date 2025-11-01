"""
Communication module - 处理Krita与ComfyUI之间的数据传输
"""

import tempfile
import os
import time
from pathlib import Path
from typing import Optional, Tuple
from krita import Krita, InfoObject
from PyQt5.QtGui import QImage
from PyQt5.QtCore import QByteArray
from .logger import get_logger

# 获取logger实例
logger = get_logger()

try:
    import requests
except ImportError:
    logger.warning("requests模块未找到，HTTP通信功能已禁用")
    requests = None


class KritaCommunication:
    """处理Krita与ComfyUI之间的通信"""

    def __init__(self, comfyui_url: str = "http://127.0.0.1:8188"):
        self.comfyui_url = comfyui_url
        self.temp_dir = Path(tempfile.gettempdir()) / "open_in_krita"
        self.temp_dir.mkdir(exist_ok=True)

    def export_current_image(self) -> Optional[Path]:
        """
        导出当前Krita文档为PNG图像（零拷贝，高性能，参考krita-ai-diffusion实现）

        Returns:
            Path: 临时文件路径，失败返回None
        """
        try:
            app = Krita.instance()
            doc = app.activeDocument()
            if not doc:
                logger.error("✗ 没有活动文档")
                return None

            logger.info(f"正在导出文档: {doc.name()}")

            # 🔍 诊断日志：检查批处理模式状态（在导出时）
            logger.info(f"📋 导出时批处理模式状态:")
            logger.info(f"  - 应用批处理模式: {app.batchmode()}")
            logger.info(f"  - 文档批处理模式: {doc.batchmode()}")

            # 获取文档尺寸
            width = doc.width()
            height = doc.height()
            logger.info(f"文档尺寸: {width}x{height}")

            # 获取像素数据（直接从文档获取，包含所有可见图层的合并结果）
            logger.info("获取像素数据...")
            pixel_data: QByteArray = doc.pixelData(0, 0, width, height)

            if not pixel_data or pixel_data.size() == 0:
                logger.error("✗ 像素数据为空")
                return None

            expected_size = width * height * 4  # BGRA/ARGB，每像素4字节
            actual_size = pixel_data.size()
            logger.info(f"像素数据大小: {actual_size} 字节 (期望: {expected_size} 字节)")

            # ✅ 零拷贝：直接使用QByteArray创建QImage（参考krita-ai-diffusion实现）
            # Krita使用BGRA格式，QImage.Format_ARGB32可以直接处理
            stride = width * 4
            qimage = QImage(pixel_data, width, height, stride, QImage.Format_ARGB32)

            if qimage.isNull():
                logger.error("✗ QImage创建失败")
                return None

            logger.info(f"✓ QImage创建成功 ({width}x{height})")

            # 保存为PNG
            temp_file = self.temp_dir / f"krita_export_{os.getpid()}.png"
            logger.info(f"保存图像到: {temp_file.name}")

            # 🔍 诊断日志：保存前的批处理模式状态
            logger.info(f"🔍 保存图像前批处理模式: app={app.batchmode()}, doc={doc.batchmode()}")

            success = qimage.save(str(temp_file), 'PNG')

            # 🔍 诊断日志：保存后的状态
            logger.info(f"🔍 保存图像后批处理模式: app={app.batchmode()}, doc={doc.batchmode()}")
            logger.info(f"🔍 QImage.save()返回值: {success}")

            if success and temp_file.exists():
                file_size = temp_file.stat().st_size
                logger.info(f"✓ 图像导出成功: {temp_file.name} ({file_size} 字节)")
                return temp_file
            else:
                logger.error("✗ 图像保存失败")
                return None

        except Exception as e:
            logger.error(f"✗ 导出图像时发生错误: {e}")
            import traceback
            traceback.print_exc()
            return None

    def export_selection_mask(self, selection=None) -> Optional[Path]:
        """
        导出选区为蒙版PNG - 导出全图尺寸蒙版（选区内白色，选区外黑色）

        Args:
            selection: 选区对象（可选）。如果提供，使用该选区；否则获取当前文档的选区

        Returns:
            Path: 蒙版文件路径，无选区或失败返回None
        """
        try:
            app = Krita.instance()
            doc = app.activeDocument()
            if not doc:
                logger.error("✗ 没有活动文档")
                return None

            # 获取文档尺寸
            doc_width = doc.width()
            doc_height = doc.height()
            logger.info(f"文档尺寸: {doc_width}x{doc_height}")

            # 🔍 诊断日志：检查批处理模式状态
            logger.info(f"📋 导出蒙版时批处理模式状态:")
            logger.info(f"  - 应用批处理模式: {app.batchmode()}")
            logger.info(f"  - 文档批处理模式: {doc.batchmode()}")

            # 如果没有传入选区，则从当前文档获取
            if selection is None:
                selection = doc.selection()
                if not selection:
                    logger.warning("⚠ 当前文档没有选区")
                    return None
                logger.info("使用当前文档的选区")
            else:
                logger.info("使用传入的选区对象")

            # 获取选区边界（使用selection的直接方法，参考krita-ai-diffusion）
            sel_x = selection.x()
            sel_y = selection.y()
            sel_w = selection.width()
            sel_h = selection.height()
            logger.info(f"选区边界: x={sel_x}, y={sel_y}, w={sel_w}, h={sel_h}")

            if sel_w <= 0 or sel_h <= 0:
                logger.error("✗ 选区边界无效")
                return None

            # ✅ 使用零拷贝方式创建全图尺寸蒙版（参考krita-ai-diffusion）
            logger.info(f"创建全图尺寸蒙版: {doc_width}x{doc_height}")

            # 获取选区的像素数据（整个文档尺寸的选区数据）
            # 选区内的部分是255（白色），选区外的部分是0（黑色）
            logger.info(f"获取选区像素数据...")
            pixel_data: QByteArray = selection.pixelData(0, 0, doc_width, doc_height)

            if not pixel_data or pixel_data.size() == 0:
                logger.error("✗ 选区像素数据为空")
                return None

            expected_size = doc_width * doc_height
            actual_size = pixel_data.size()
            logger.info(f"像素数据大小: {actual_size} 字节 (期望: {expected_size} 字节)")

            # ✅ 零拷贝：创建全0的bytearray，复制选区数据
            logger.info("使用零拷贝方式创建蒙版...")
            mask_bytes = bytearray(doc_width * doc_height)

            # 将选区数据复制到bytearray中
            for i in range(min(actual_size, len(mask_bytes))):
                value = pixel_data.at(i)
                mask_bytes[i] = value if isinstance(value, int) else ord(value)

            # 包装成QByteArray
            qbyte_array = QByteArray(mask_bytes)

            # 零拷贝创建QImage（直接使用QByteArray，无需逐像素复制）
            stride = doc_width  # 每行字节数（灰度图每像素1字节）
            mask_image = QImage(qbyte_array, doc_width, doc_height, stride, QImage.Format_Grayscale8)

            if mask_image.isNull():
                logger.error("✗ 蒙版QImage创建失败")
                return None

            logger.info(f"✓ 蒙版图像创建成功 ({doc_width}x{doc_height})")

            # 保存为PNG
            temp_file = self.temp_dir / f"krita_mask_{os.getpid()}.png"
            logger.info(f"保存蒙版到: {temp_file.name}")

            # 🔍 诊断日志：保存前的批处理模式状态
            logger.info(f"🔍 保存蒙版前批处理模式: app={app.batchmode()}, doc={doc.batchmode()}")

            success = mask_image.save(str(temp_file), 'PNG')

            # 🔍 诊断日志：保存后的状态
            logger.info(f"🔍 保存蒙版后批处理模式: app={app.batchmode()}, doc={doc.batchmode()}")
            logger.info(f"🔍 QImage.save()返回值: {success}")

            if success and temp_file.exists():
                file_size = temp_file.stat().st_size
                logger.info(f"✓ 蒙版导出成功: {temp_file.name} ({file_size} 字节)")
                return temp_file
            else:
                logger.error("✗ 蒙版保存失败")
                return None

        except Exception as e:
            logger.error(f"✗ 导出蒙版时发生错误: {e}")
            import traceback
            traceback.print_exc()
            return None

    def send_to_comfyui(self, node_id: str = None) -> bool:
        """
        发送当前图像和蒙版到ComfyUI

        Args:
            node_id: 目标ComfyUI节点ID（可选）

        Returns:
            bool: 发送成功返回True
        """
        if not requests:
            logger.error("requests模块不可用")
            return False

        try:
            # 导出图像
            image_path = self.export_current_image()
            if not image_path:
                return False

            # 导出蒙版（可能为空）
            mask_path = self.export_selection_mask()

            # 准备发送数据
            url = f"{self.comfyui_url}/open_in_krita/receive_data"
            files = {
                'image': open(image_path, 'rb')
            }

            data = {}
            if node_id:
                data['node_id'] = node_id

            # 如果有蒙版，添加到files
            if mask_path:
                files['mask'] = open(mask_path, 'rb')

            # 发送POST请求
            logger.info(f"发送数据到ComfyUI: {url}")
            response = requests.post(url, files=files, data=data, timeout=10)

            # 关闭文件
            files['image'].close()
            if 'mask' in files:
                files['mask'].close()

            if response.status_code == 200:
                logger.info("✓ 数据发送成功")
                return True
            else:
                logger.error(f"✗ 发送失败: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"✗ 发送数据时出错: {e}")
            return False

    def get_current_krita_data(self) -> Tuple[Optional[Path], Optional[Path]]:
        """
        获取当前Krita活动文档的图像和选区蒙版（无感导出，不影响选区）

        Returns:
            Tuple[Optional[Path], Optional[Path]]: (image_path, mask_path)，无数据返回(None, None)
        """
        try:
            app = Krita.instance()
            doc = app.activeDocument()
            if not doc:
                logger.error("✗ 没有活动文档")
                return (None, None)

            logger.info(f"===== 开始获取Krita数据: {doc.name()} =====")

            # 🔍 诊断日志：记录初始状态
            logger.info(f"📋 文档信息:")
            logger.info(f"  - 文档名称: {doc.name()}")
            logger.info(f"  - 文档路径: {doc.fileName() if doc.fileName() else '(临时文件)'}")
            try:
                is_modified = doc.modified()
                logger.info(f"  - 文档修改状态: {is_modified}")
            except Exception as e:
                logger.warning(f"  - 无法获取文档修改状态: {e}")

            # ✅ 保存当前状态，防止弹窗和选区丢失
            # 1. 保存并启用批处理模式（同时设置应用级别和文档级别）
            logger.info("🔧 保存批处理模式状态...")

            # 应用级别批处理模式
            original_app_batchmode = app.batchmode()
            logger.info(f"  - 应用批处理模式（原始）: {original_app_batchmode}")
            app.setBatchmode(True)
            logger.info(f"  - 应用批处理模式（设置后）: {app.batchmode()}")

            # 文档级别批处理模式
            original_doc_batchmode = doc.batchmode()
            logger.info(f"  - 文档批处理模式（原始）: {original_doc_batchmode}")
            doc.setBatchmode(True)
            logger.info(f"  - 文档批处理模式（设置后）: {doc.batchmode()}")

            logger.info("✓ 已启用批处理模式（应用+文档，禁止所有弹窗）")

            # 2. 保存当前选区（防止被操作影响）
            saved_selection = None
            if doc.selection():
                saved_selection = doc.selection().duplicate()
                logger.info("✓ 已保存当前选区")

            try:
                # 使用新的export_current_image方法（无感导出，不触发对话框）
                image_file = self.export_current_image()

                if not image_file:
                    logger.error("✗ 图像导出失败")
                    return (None, None)

                logger.info(f"✓ 图像已导出: {image_file.name} ({image_file.stat().st_size} 字节)")

                # 尝试导出选区蒙版
                mask_file = None
                current_selection = doc.selection()

                if current_selection:
                    logger.info("✓ 检测到选区，正在导出蒙版...")
                    # 使用duplicate()创建副本，不影响原始选区
                    selection_copy = current_selection.duplicate()
                    mask_file = self.export_selection_mask(selection_copy)

                    if mask_file:
                        logger.info(f"✓ 蒙版导出成功: {mask_file.name}")
                    else:
                        logger.warning("⚠ 蒙版导出失败")
                else:
                    logger.warning("⚠ 当前文档没有选区，将返回空蒙版")

                logger.info(f"===== Krita数据获取完成 =====")
                return (image_file, mask_file)

            finally:
                # ✅ 恢复状态（无论成功失败都要执行）
                # 3. 恢复选区
                if saved_selection:
                    doc.setSelection(saved_selection)
                    logger.info("✓ 已恢复选区")

                # 4. 恢复批处理模式（应用+文档）
                logger.info("🔧 恢复批处理模式...")
                doc.setBatchmode(original_doc_batchmode)
                logger.info(f"  - 文档批处理模式已恢复: {doc.batchmode()}")
                app.setBatchmode(original_app_batchmode)
                logger.info(f"  - 应用批处理模式已恢复: {app.batchmode()}")
                logger.info("✓ 已恢复批处理模式（应用+文档）")

        except Exception as e:
            logger.error(f"✗ 获取Krita数据时出错: {e}")
            import traceback
            traceback.print_exc()
            return (None, None)

    def cleanup_temp_files(self):
        """清理临时文件"""
        try:
            for file in self.temp_dir.glob("*"):
                if file.is_file():
                    file.unlink()
            logger.info("临时文件已清理")
        except Exception as e:
            logger.error(f"清理临时文件失败: {e}")


# 全局通信实例
_comm = None

def get_communication() -> KritaCommunication:
    """获取全局通信实例"""
    global _comm
    if _comm is None:
        _comm = KritaCommunication()
    return _comm
