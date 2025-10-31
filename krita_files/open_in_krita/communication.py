"""
Communication module - 处理Krita与ComfyUI之间的数据传输
"""

import tempfile
import os
from pathlib import Path
from typing import Optional, Tuple
from krita import Krita, InfoObject

try:
    import requests
except ImportError:
    print("[OpenInKrita] Warning: requests module not found. HTTP communication disabled.")
    requests = None


class KritaCommunication:
    """处理Krita与ComfyUI之间的通信"""

    def __init__(self, comfyui_url: str = "http://127.0.0.1:8188"):
        self.comfyui_url = comfyui_url
        self.temp_dir = Path(tempfile.gettempdir()) / "open_in_krita"
        self.temp_dir.mkdir(exist_ok=True)

    def export_current_image(self) -> Optional[Path]:
        """
        导出当前Krita文档为PNG图像

        Returns:
            Path: 临时文件路径，失败返回None
        """
        try:
            doc = Krita.instance().activeDocument()
            if not doc:
                print("[OpenInKrita] No active document")
                return None

            # 创建临时文件
            temp_file = self.temp_dir / f"krita_export_{os.getpid()}.png"

            # 导出当前文档
            # flatten=True 合并所有图层，scaleTo参数可选
            success = doc.exportImage(str(temp_file), InfoObject())

            if success and temp_file.exists():
                print(f"[OpenInKrita] Image exported: {temp_file}")
                return temp_file
            else:
                print("[OpenInKrita] Image export failed")
                return None

        except Exception as e:
            print(f"[OpenInKrita] Error exporting image: {e}")
            return None

    def export_selection_mask(self) -> Optional[Path]:
        """
        导出当前选区为蒙版PNG

        Returns:
            Path: 蒙版文件路径，无选区或失败返回None
        """
        try:
            doc = Krita.instance().activeDocument()
            if not doc:
                return None

            selection = doc.selection()
            if not selection:
                print("[OpenInKrita] No selection found")
                return None

            # 获取选区的像素数据
            # 选区是一个灰度蒙版，白色表示选中区域
            bounds = selection.bounds()
            x, y, w, h = bounds.x(), bounds.y(), bounds.width(), bounds.height()

            if w <= 0 or h <= 0:
                print("[OpenInKrita] Invalid selection bounds")
                return None

            # 创建临时文档来保存选区
            mask_doc = Krita.instance().createDocument(
                w, h,
                "Selection Mask",
                "GRAYA",  # 灰度+Alpha
                "U8",     # 8位
                "",
                300.0
            )

            # 获取选区数据
            pixel_data = selection.pixelData(x, y, w, h)

            # 创建一个新图层并设置像素数据
            layer = mask_doc.createNode("Mask", "paintLayer")
            mask_doc.rootNode().addChildNode(layer, None)
            layer.setPixelData(pixel_data, 0, 0, w, h)

            # 导出蒙版
            temp_file = self.temp_dir / f"krita_mask_{os.getpid()}.png"
            success = mask_doc.exportImage(str(temp_file), InfoObject())

            # 关闭临时文档
            mask_doc.close()

            if success and temp_file.exists():
                print(f"[OpenInKrita] Mask exported: {temp_file}")
                return temp_file
            else:
                print("[OpenInKrita] Mask export failed")
                return None

        except Exception as e:
            print(f"[OpenInKrita] Error exporting mask: {e}")
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
            print("[OpenInKrita] requests module not available")
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
            print(f"[OpenInKrita] Sending data to ComfyUI: {url}")
            response = requests.post(url, files=files, data=data, timeout=10)

            # 关闭文件
            files['image'].close()
            if 'mask' in files:
                files['mask'].close()

            if response.status_code == 200:
                print("[OpenInKrita] Data sent successfully")
                return True
            else:
                print(f"[OpenInKrita] Send failed: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"[OpenInKrita] Error sending data: {e}")
            return False

    def cleanup_temp_files(self):
        """清理临时文件"""
        try:
            for file in self.temp_dir.glob("*"):
                if file.is_file():
                    file.unlink()
            print("[OpenInKrita] Temp files cleaned")
        except Exception as e:
            print(f"[OpenInKrita] Error cleaning temp files: {e}")


# 全局通信实例
_comm = None

def get_communication() -> KritaCommunication:
    """获取全局通信实例"""
    global _comm
    if _comm is None:
        _comm = KritaCommunication()
    return _comm
