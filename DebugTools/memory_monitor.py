"""
内存监控节点 - Memory Monitor Node
实时监控系统内存和VRAM使用情况，提供内存优化建议
"""

import sys
import os
import time
import torch
import psutil
import platform
from typing import Dict, Any, Optional

CATEGORY_TYPE = "Danbooru/Debug"


class MemoryMonitor:
    """
    内存监控节点 - 监控系统内存和VRAM使用情况
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "monitor_level": (["basic", "detailed", "full"], {
                    "default": "basic",
                    "tooltip": "监控级别：basic=基础信息，detailed=详细信息，full=完整信息"
                }),
                "auto_optimize": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "是否自动执行内存优化"
                }),
                "warning_threshold": ("FLOAT", {
                    "default": 0.85,
                    "min": 0.5,
                    "max": 0.95,
                    "step": 0.05,
                    "tooltip": "内存警告阈值（0.5-0.95）"
                })
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("memory_report", "optimization_suggestions")
    FUNCTION = "monitor_memory"
    CATEGORY = CATEGORY_TYPE
    OUTPUT_NODE = True

    def monitor_memory(self, monitor_level, auto_optimize, warning_threshold, prompt=None, extra_pnginfo=None):
        """
        监控内存使用情况并生成报告

        Args:
            monitor_level: 监控级别
            auto_optimize: 是否自动优化
            warning_threshold: 警告阈值

        Returns:
            内存报告和优化建议
        """
        try:
            print(f"[MemoryMonitor] ========== 开始内存监控 ==========")
            print(f"[MemoryMonitor] 监控级别: {monitor_level}")
            print(f"[MemoryMonitor] 自动优化: {auto_optimize}")
            print(f"[MemoryMonitor] 警告阈值: {warning_threshold * 100:.1f}%")

            # 收集系统信息
            system_info = self._get_system_info()
            memory_info = self._get_memory_info()
            vram_info = self._get_vram_info()

            # 生成报告
            report = self._generate_report(system_info, memory_info, vram_info, monitor_level)

            # 检查警告状态
            warnings = self._check_warnings(memory_info, vram_info, warning_threshold)

            # 生成优化建议
            suggestions = self._generate_suggestions(memory_info, vram_info, warnings, auto_optimize)

            # 自动优化（如果启用）
            if auto_optimize:
                self._auto_optimize(memory_info, vram_info, warning_threshold)

            # 合并报告
            full_report = report
            if warnings:
                full_report += "\n\n⚠️ 警告:\n" + "\n".join(warnings)

            print(f"[MemoryMonitor] ========== 监控完成 ==========")
            print(f"[MemoryMonitor] 系统内存使用率: {memory_info['percent']:.1f}%")
            print(f"[MemoryMonitor] VRAM使用率: {vram_info['percent']:.1f}%")

            return (full_report, suggestions)

        except Exception as e:
            error_msg = f"内存监控失败: {str(e)}"
            print(f"[MemoryMonitor] [FAILED] {error_msg}")
            import traceback
            print(f"[MemoryMonitor] 堆栈追踪:\n{traceback.format_exc()}")

            return (f"监控失败: {error_msg}", "请检查系统环境和PyTorch安装")

    def _get_system_info(self) -> Dict[str, Any]:
        """获取系统基本信息"""
        try:
            return {
                "platform": platform.system(),
                "processor": platform.processor(),
                "python_version": platform.python_version(),
                "torch_version": torch.__version__,
                "cuda_available": torch.cuda.is_available(),
                "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
            }
        except Exception as e:
            print(f"[MemoryMonitor] 获取系统信息失败: {str(e)}")
            return {}

    def _get_memory_info(self) -> Dict[str, Any]:
        """获取系统内存信息"""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()

            return {
                "total_gb": memory.total / (1024**3),
                "available_gb": memory.available / (1024**3),
                "used_gb": memory.used / (1024**3),
                "percent": memory.percent,
                "swap_total_gb": swap.total / (1024**3),
                "swap_used_gb": swap.used / (1024**3),
                "swap_percent": swap.percent
            }
        except Exception as e:
            print(f"[MemoryMonitor] 获取内存信息失败: {str(e)}")
            return {"percent": 0, "available_gb": 0, "total_gb": 0}

    def _get_vram_info(self) -> Dict[str, Any]:
        """获取VRAM信息"""
        try:
            if not torch.cuda.is_available():
                return {"available_gb": 0, "used_gb": 0, "percent": 0, "device_name": "无CUDA设备"}

            device = torch.cuda.current_device()
            props = torch.cuda.get_device_properties(device)

            total_memory = props.total_memory / (1024**3)
            reserved_memory = torch.cuda.memory_reserved(device) / (1024**3)
            allocated_memory = torch.cuda.memory_allocated(device) / (1024**3)

            # 计算可用内存（估算）
            available_memory = total_memory - reserved_memory

            return {
                "device_name": props.name,
                "total_gb": total_memory,
                "allocated_gb": allocated_memory,
                "reserved_gb": reserved_memory,
                "available_gb": available_memory,
                "percent": (allocated_memory / total_memory) * 100 if total_memory > 0 else 0
            }
        except Exception as e:
            print(f"[MemoryMonitor] 获取VRAM信息失败: {str(e)}")
            return {"available_gb": 0, "used_gb": 0, "percent": 0, "device_name": "获取失败"}

    def _generate_report(self, system_info: Dict, memory_info: Dict, vram_info: Dict, level: str) -> str:
        """生成内存监控报告"""
        lines = ["📊 内存监控报告", "=" * 30]

        # 系统信息
        if system_info:
            lines.append("🖥️ 系统信息:")
            lines.append(f"  操作系统: {system_info.get('platform', '未知')}")
            lines.append(f"  Python版本: {system_info.get('python_version', '未知')}")
            lines.append(f"  PyTorch版本: {system_info.get('torch_version', '未知')}")
            lines.append("")

        # 系统内存
        if memory_info:
            lines.append("💾 系统内存:")
            lines.append(f"  总内存: {memory_info.get('total_gb', 0):.1f} GB")
            lines.append(f"  可用内存: {memory_info.get('available_gb', 0):.1f} GB")
            lines.append(f"  已用内存: {memory_info.get('used_gb', 0):.1f} GB ({memory_info.get('percent', 0):.1f}%)")

            if level in ["detailed", "full"]:
                lines.append(f"  交换内存: {memory_info.get('swap_used_gb', 0):.1f}/{memory_info.get('swap_total_gb', 0):.1f} GB ({memory_info.get('swap_percent', 0):.1f}%)")
            lines.append("")

        # VRAM信息
        if vram_info:
            lines.append("🎮 显存(VRAM):")
            lines.append(f"  设备: {vram_info.get('device_name', '未知')}")
            lines.append(f"  总显存: {vram_info.get('total_gb', 0):.1f} GB")

            if level in ["detailed", "full"]:
                lines.append(f"  已分配: {vram_info.get('allocated_gb', 0):.1f} GB")
                lines.append(f"  已预留: {vram_info.get('reserved_gb', 0):.1f} GB")
                lines.append(f"  可用显存: {vram_info.get('available_gb', 0):.1f} GB")

            lines.append(f"  使用率: {vram_info.get('percent', 0):.1f}%")
            lines.append("")

        # 时间戳
        lines.append(f"🕒 监控时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")

        return "\n".join(lines)

    def _check_warnings(self, memory_info: Dict, vram_info: Dict, threshold: float) -> list:
        """检查内存警告"""
        warnings = []

        # 系统内存警告
        if memory_info.get('percent', 0) > threshold * 100:
            warnings.append(f"系统内存使用率过高: {memory_info.get('percent', 0):.1f}% (阈值: {threshold*100:.1f}%)")

        if memory_info.get('available_gb', 0) < 2.0:
            warnings.append(f"可用内存过低: {memory_info.get('available_gb', 0):.1f} GB")

        # VRAM警告
        if vram_info.get('percent', 0) > threshold * 100:
            warnings.append(f"VRAM使用率过高: {vram_info.get('percent', 0):.1f}% (阈值: {threshold*100:.1f}%)")

        if vram_info.get('available_gb', 0) < 1.0:
            warnings.append(f"可用VRAM过低: {vram_info.get('available_gb', 0):.1f} GB")

        # 交换内存警告
        if memory_info.get('swap_percent', 0) > 50:
            warnings.append(f"交换内存使用率过高: {memory_info.get('swap_percent', 0):.1f}%")

        return warnings

    def _generate_suggestions(self, memory_info: Dict, vram_info: Dict, warnings: list, auto_optimize: bool) -> str:
        """生成优化建议"""
        suggestions = ["💡 内存优化建议", "=" * 30]

        # 系统内存建议
        mem_percent = memory_info.get('percent', 0)
        if mem_percent > 80:
            suggestions.append("🔥 系统内存紧急建议:")
            suggestions.append("  1. 立即关闭不必要的应用程序")
            suggestions.append("  2. 重启ComfyUI清理内存")
            suggestions.append("  3. 考虑使用更小的模型分辨率")
            suggestions.append("  4. 启用ComfyUI的--lowvram模式")
        elif mem_percent > 60:
            suggestions.append("⚠️ 系统内存建议:")
            suggestions.append("  1. 关闭后台应用程序")
            suggestions.append("  2. 使用较小的batch size")
            suggestions.append("  3. 定期重启ComfyUI")

        # VRAM建议
        vram_percent = vram_info.get('percent', 0)
        if vram_percent > 85:
            suggestions.append("🎮 VRAM紧急建议:")
            suggestions.append("  1. 启用--lowvram或--medvram模式")
            suggestions.append("  2. 使用较小的分辨率")
            suggestions.append("  3. 减少同时加载的模型数量")
            suggestions.append("  4. 启用模型卸载功能")
        elif vram_percent > 70:
            suggestions.append("🎮 VRAM建议:")
            suggestions.append("  1. 考虑使用--medvram模式")
            suggestions.append("  2. 优化工作流程减少内存占用")
            suggestions.append("  3. 使用内存高效的组件")

        # 通用建议
        suggestions.append("🔧 通用优化建议:")
        suggestions.append("  1. 定期清理ComfyUI缓存")
        suggestions.append("  2. 使用智能内存管理")
        suggestions.append("  3. 避免同时运行多个大型工作流")
        suggestions.append("  4. 监控内存使用趋势")

        if warnings:
            suggestions.append(f"\n⚠️ 发现 {len(warnings)} 个内存警告需要处理")

        if auto_optimize:
            suggestions.append(f"\n✅ 自动优化已启用，将自动执行内存清理")

        return "\n".join(suggestions)

    def _auto_optimize(self, memory_info: Dict, vram_info: Dict, threshold: float):
        """执行自动内存优化"""
        try:
            optimized = False

            # 系统内存过高时执行清理
            if memory_info.get('percent', 0) > threshold * 100:
                print(f"[MemoryMonitor] 执行系统内存优化...")

                # 清理Python垃圾回收
                import gc
                collected = gc.collect()
                print(f"[MemoryMonitor] 垃圾回收清理了 {collected} 个对象")

                # 清理CUDA缓存
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    print(f"[MemoryMonitor] 已清理CUDA缓存")

                optimized = True

            # VRAM过高时执行VRAM清理
            if vram_info.get('percent', 0) > threshold * 100:
                print(f"[MemoryMonitor] 执行VRAM优化...")

                if torch.cuda.is_available():
                    # 强制清理CUDA缓存
                    torch.cuda.empty_cache()
                    torch.cuda.synchronize()
                    print(f"[MemoryMonitor] 已强制清理VRAM")

                optimized = True

            if optimized:
                print(f"[MemoryMonitor] ✅ 自动内存优化完成")
            else:
                print(f"[MemoryMonitor] ℹ️ 内存使用正常，无需优化")

        except Exception as e:
            print(f"[MemoryMonitor] 自动优化失败: {str(e)}")


# 节点映射
def get_node_class_mappings():
    return {
        "MemoryMonitor": MemoryMonitor
    }

def get_node_display_name_mappings():
    return {
        "MemoryMonitor": "内存监控器 (Memory Monitor)"
    }

NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()


# 测试函数
def test_memory_monitor():
    """测试内存监控节点"""
    print(f"[MemoryMonitor.TEST] ========== 测试内存监控节点 ==========")

    try:
        monitor = MemoryMonitor()

        # 测试基础监控
        print(f"[MemoryMonitor.TEST] ----- 测试基础监控 -----")
        report, suggestions = monitor.monitor_memory("basic", False, 0.85)
        print(f"[MemoryMonitor.TEST] 基础监控报告长度: {len(report)} 字符")
        print(f"[MemoryMonitor.TEST] 建议长度: {len(suggestions)} 字符")

        # 测试详细监控
        print(f"[MemoryMonitor.TEST] ----- 测试详细监控 -----")
        report, suggestions = monitor.monitor_memory("detailed", True, 0.8)
        print(f"[MemoryMonitor.TEST] 详细监控报告长度: {len(report)} 字符")

        print(f"[MemoryMonitor.TEST] [SUCCESS] 内存监控节点测试通过")
        return True

    except Exception as e:
        print(f"[MemoryMonitor.TEST] [FAILED] 测试失败: {str(e)}")
        import traceback
        print(f"[MemoryMonitor.TEST] 堆栈追踪:\n{traceback.format_exc()}")
        return False


if __name__ == "__main__":
    print(f"[MemoryMonitor] ========== 内存监控模块加载完成 ==========")
    print(f"[MemoryMonitor] 节点信息:")
    print(f"[MemoryMonitor]   - 节点类: MemoryMonitor")
    print(f"[MemoryMonitor]   - 显示名称: 内存监控器 (Memory Monitor)")
    print(f"[MemoryMonitor]   - 类别: {CATEGORY_TYPE}")
    print(f"[MemoryMonitor]   - 功能: monitor_memory")
    print(f"[MemoryMonitor] ========== 模块信息完成 ==========")

    # 运行测试
    test_result = test_memory_monitor()
    if test_result:
        print(f"[MemoryMonitor] [SUCCESS] 自测试通过，内存监控节点已准备就绪")
    else:
        print(f"[MemoryMonitor] [FAILED] 自测试失败，请检查节点实现")