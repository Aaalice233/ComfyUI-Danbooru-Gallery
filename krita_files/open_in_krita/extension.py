"""
Extension module - Krita扩展主类
"""

import tempfile
import os
from pathlib import Path
from krita import Extension, Krita, Document
from PyQt5.QtWidgets import QAction, QMessageBox
from PyQt5.QtCore import QFileSystemWatcher, QTimer
from .communication import get_communication


class OpenInKritaExtension(Extension):
    """Open In Krita扩展 - 处理与ComfyUI的交互"""

    def __init__(self, parent):
        super().__init__(parent)
        self.comm = get_communication()
        self.watcher = None
        self.monitor_dir = Path(tempfile.gettempdir()) / "open_in_krita"
        self.monitor_dir.mkdir(exist_ok=True)
        self.processed_files = set()  # 跟踪已处理的文件，避免重复打开
        print("[OpenInKrita] Extension initialized")
        print(f"[OpenInKrita] Monitoring directory: {self.monitor_dir}")

    def setup(self):
        """设置扩展（当Krita启动时调用）"""
        # 启动目录监控
        self._setup_directory_watcher()
        print("[OpenInKrita] Directory watcher started")

    def _setup_directory_watcher(self):
        """设置目录监控"""
        if self.watcher is None:
            self.watcher = QFileSystemWatcher()
            self.watcher.addPath(str(self.monitor_dir))
            self.watcher.directoryChanged.connect(self._on_directory_changed)
            print(f"[OpenInKrita] Watching directory: {self.monitor_dir}")

    def _on_directory_changed(self, path):
        """目录内容改变时的回调"""
        # 使用延迟检查，避免文件正在写入时就打开
        QTimer.singleShot(300, self._check_new_files)

    def _check_new_files(self):
        """检查新文件并自动打开"""
        try:
            # 只处理PNG文件，排除mask文件
            png_files = [
                f for f in self.monitor_dir.glob("comfyui_*.png")
                if "_mask" not in f.name and f not in self.processed_files
            ]

            if not png_files:
                return

            # 按修改时间排序，处理最新的
            png_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

            for png_file in png_files[:1]:  # 只处理最新的一个
                print(f"[OpenInKrita] New file detected: {png_file.name}")
                self.processed_files.add(png_file)

                # 打开文件
                doc = Krita.instance().openDocument(str(png_file))
                if doc:
                    Krita.instance().activeWindow().addView(doc)
                    print(f"[OpenInKrita] Opened: {png_file.name}")

                    # Hook文档保存事件
                    self._hook_document_save(doc, png_file)
                else:
                    print(f"[OpenInKrita] Failed to open: {png_file.name}")

        except Exception as e:
            print(f"[OpenInKrita] Error checking new files: {e}")

    def _hook_document_save(self, doc: Document, original_path: Path):
        """Hook文档保存事件，自动导出选区为mask"""
        def on_save():
            try:
                print(f"[OpenInKrita] Document saved: {doc.name()}")

                # 检查是否有选区
                selection = doc.selection()
                if selection:
                    # 导出选区为mask文件
                    mask_path = original_path.parent / f"{original_path.stem}_mask{original_path.suffix}"
                    print(f"[OpenInKrita] Exporting selection mask to: {mask_path.name}")

                    # 导出选区（使用communication模块的方法）
                    exported_mask = self.comm.export_selection_mask()
                    if exported_mask:
                        # 将导出的mask文件重命名为正确的名称
                        import shutil
                        shutil.move(str(exported_mask), str(mask_path))
                        print(f"[OpenInKrita] Mask saved: {mask_path.name}")
                    else:
                        print("[OpenInKrita] Failed to export mask")
                else:
                    print("[OpenInKrita] No selection found, skipping mask export")

            except Exception as e:
                print(f"[OpenInKrita] Error in save hook: {e}")

        # 连接保存信号
        doc.saved.connect(on_save)

    def createActions(self, window):
        """创建菜单动作"""
        # 创建"发送到ComfyUI"动作
        action = window.createAction(
            "open_in_krita_send",
            "Send to ComfyUI",  # 菜单项名称
            "tools/scripts"     # 菜单位置
        )
        action.triggered.connect(self.send_to_comfyui)
        print("[OpenInKrita] Menu action created")

    def send_to_comfyui(self):
        """发送当前图像和选区到ComfyUI"""
        print("[OpenInKrita] Sending data to ComfyUI...")

        # 检查是否有活动文档
        doc = Krita.instance().activeDocument()
        if not doc:
            self.show_message("No Document", "Please open a document first.")
            return

        # 尝试发送数据
        success = self.comm.send_to_comfyui()

        if success:
            self.show_message("Success", "Image and selection sent to ComfyUI successfully!")
        else:
            self.show_message("Error", "Failed to send data to ComfyUI. Make sure ComfyUI is running.")

    def show_message(self, title: str, message: str):
        """显示消息对话框"""
        try:
            msg_box = QMessageBox()
            msg_box.setWindowTitle(title)
            msg_box.setText(message)
            msg_box.exec_()
        except Exception as e:
            print(f"[OpenInKrita] Error showing message: {e}")
            # 如果对话框失败，至少打印到控制台
            print(f"[OpenInKrita] {title}: {message}")
