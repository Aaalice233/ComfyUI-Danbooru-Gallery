"""
调试监控工具 - 用于监控和诊断组执行管理器问题
"""

import sys
import os
import time
import torch
import json
from typing import Dict, Any, Optional, Tuple

# 常量定义
CATEGORY_TYPE = "Debug Tools"

class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False

any_typ = AnyType("*")

class DebugMonitor:
    """
    调试监控节点 - 提供系统状态监控和问题诊断
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "monitor_type": (["group_executor", "image_cache", "session_info", "execution_trace"], {"default": "group_executor", "tooltip": "监控类型选择"}),
                "refresh_interval": ("INT", {"default": 0, "min": 0, "max": 60, "step": 1, "tooltip": "刷新间隔（秒），0表示一次性监控"}),
            },
            "optional": {
                "input_data": (any_typ, {"tooltip": "可选的输入数据，用于追踪数据流"}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("monitor_output", "debug_log")
    FUNCTION = "monitor_system"
    CATEGORY = CATEGORY_TYPE
    OUTPUT_IS_LIST = (False, False)

    def monitor_system(self, monitor_type, refresh_interval, input_data=None, prompt=None, extra_pnginfo=None):
        """
        监控系统状态并生成调试信息
        """
        try:
            print(f"[DebugMonitor] ========== 开始系统监控 ==========")
            print(f"[DebugMonitor] 监控类型: {monitor_type}")
            print(f"[DebugMonitor] 刷新间隔: {refresh_interval}秒")
            print(f"[DebugMonitor] 时间戳: {time.time()}")

            # 生成监控数据
            monitor_output = ""
            debug_log = ""

            if monitor_type == "group_executor":
                monitor_output, debug_log = self._monitor_group_executor(prompt, extra_pnginfo)
            elif monitor_type == "image_cache":
                monitor_output, debug_log = self._monitor_image_cache()
            elif monitor_type == "session_info":
                monitor_output, debug_log = self._monitor_session_info()
            elif monitor_type == "execution_trace":
                monitor_output, debug_log = self._monitor_execution_trace(prompt, extra_pnginfo)
            else:
                monitor_output = "未知监控类型"
                debug_log = "请选择有效的监控类型"

            print(f"[DebugMonitor] ✓ 监控完成")

        except Exception as e:
            print(f"[DebugMonitor] ✗ 监控失败: {str(e)}")
            monitor_output = f"监控失败: {str(e)}"
            debug_log = f"错误详情: {str(e)}\n请检查系统状态和节点连接"

        return {"result": {"ui_data": {"monitor_output": monitor_output, "debug_log": debug_log}}}

    def _monitor_group_executor(self, prompt, extra_pnginfo) -> Tuple[str, str]:
        """监控组执行管理器状态"""
        output_lines = ["=== 组执行管理器状态监控 ==="]
        log_lines = []

        try:
            # 检查当前工作流中的组执行管理器节点
            gem_nodes = []
            if prompt:
                for node_id, node_data in prompt.items():
                    if node_data.get("class_type") == "GroupExecutorManager":
                        gem_nodes.append({
                            "id": node_id,
                            "title": node_data.get("inputs", {}).get("group_config", ""),
                            "enabled": True
                        })

            output_lines.append(f"发现 {len(gem_nodes)} 个组执行管理器节点")
            log_lines.append(f"GEM节点数量: {len(gem_nodes)}")

            for i, node in enumerate(gem_nodes):
                output_lines.append(f"  节点 {i+1}: ID={node['id']}")
                if node['title']:
                    output_lines.append(f"    配置: {node['title'][:100]}...")
                log_lines.append(f"GEM节点{i+1}详情: {node}")

            # 检查队列状态（模拟检查）
            output_lines.append("\n队列状态: 未知（需要ComfyUI API访问）")
            log_lines.append("队列状态检查: 需要前端API支持")

            monitor_output = "\n".join(output_lines)
            debug_log = "\n".join(log_lines)

        except Exception as e:
            monitor_output = f"组执行管理器监控失败: {str(e)}"
            debug_log = f"错误详情: {str(e)}"

        return monitor_output, debug_log

    def _monitor_image_cache(self) -> Tuple[str, str]:
        """监控图像缓存状态"""
        output_lines = ["=== 图像缓存状态监控 ==="]
        log_lines = []

        try:
            # 尝试导入缓存管理器
            from ..ImageCacheManager.image_cache_manager import cache_manager

            # 获取缓存信息
            cache_info = cache_manager.get_cache_info()
            session_info = cache_manager.get_session_info()

            output_lines.append(f"缓存数量: {cache_info['count']}")
            output_lines.append(f"缓存时间戳: {cache_info['timestamp']}")
            output_lines.append(f"元数据: {cache_info['metadata']}")

            output_lines.append(f"\n会话ID: {session_info['session_id']}")
            output_lines.append(f"会话持续时间: {session_info['session_duration_seconds']}秒")
            output_lines.append(f"保存次数: {session_info['execution_count']}")
            output_lines.append(f"获取次数: {session_info['get_count']}")
            output_lines.append(f"本次会话已保存: {session_info['has_saved_this_session']}")

            if session_info['pending_operations']:
                output_lines.append(f"\n进行中的操作: {len(session_info['pending_operations'])}")
                for op in session_info['pending_operations']:
                    output_lines.append(f"  - {op}")

            log_lines = [
                f"缓存详情: {json.dumps(cache_info, indent=2)}",
                f"会话详情: {json.dumps(session_info, indent=2)}"
            ]

            monitor_output = "\n".join(output_lines)
            debug_log = "\n".join(log_lines)

        except ImportError:
            monitor_output = "图像缓存管理器未找到"
            debug_log = "请检查ImageCacheManager模块是否正确安装"
        except Exception as e:
            monitor_output = f"图像缓存监控失败: {str(e)}"
            debug_log = f"错误详情: {str(e)}"

        return monitor_output, debug_log

    def _monitor_session_info(self) -> Tuple[str, str]:
        """监控会话信息"""
        output_lines = ["=== 会话信息监控 ==="]
        log_lines = []

        try:
            current_time = time.time()
            output_lines.append(f"当前时间: {current_time}")
            output_lines.append(f"Python版本: {sys.version}")
            output_lines.append(f"工作目录: {os.getcwd()}")

            # 尝试获取ComfyUI相关信息
            try:
                import folder_paths
                output_lines.append(f"ComfyUI临时目录: {folder_paths.get_temp_directory()}")
                output_lines.append(f"输出目录: {folder_paths.get_output_directory()}")
            except ImportError:
                output_lines.append("ComfyUI环境: 不在ComfyUI中运行")

            # 系统资源信息
            output_lines.append(f"\n系统资源:")
            try:
                import psutil
                memory = psutil.virtual_memory()
                output_lines.append(f"  内存使用: {memory.percent}% ({memory.used/1024/1024/1024:.1f}GB/{memory.total/1024/1024/1024:.1f}GB)")
                output_lines.append(f"  CPU使用: {psutil.cpu_percent()}%")
            except ImportError:
                output_lines.append("  psutil未安装，无法获取系统资源信息")

            log_lines = [
                f"会话开始时间: {current_time}",
                f"环境信息: Python {sys.version.split()[0]}",
                f"模块路径: {__file__}"
            ]

            monitor_output = "\n".join(output_lines)
            debug_log = "\n".join(log_lines)

        except Exception as e:
            monitor_output = f"会话信息监控失败: {str(e)}"
            debug_log = f"错误详情: {str(e)}"

        return monitor_output, debug_log

    def _monitor_execution_trace(self, prompt, extra_pnginfo) -> Tuple[str, str]:
        """监控执行追踪"""
        output_lines = ["=== 执行追踪监控 ==="]
        log_lines = []

        try:
            output_lines.append(f"工作流节点总数: {len(prompt) if prompt else 0}")

            if prompt:
                # 统计节点类型
                node_types = {}
                for node_id, node_data in prompt.items():
                    class_type = node_data.get("class_type", "Unknown")
                    node_types[class_type] = node_types.get(class_type, 0) + 1

                output_lines.append(f"\n节点类型统计:")
                for node_type, count in sorted(node_types.items()):
                    output_lines.append(f"  {node_type}: {count}")

                # 查找关键节点
                gem_nodes = [nid for nid, nd in prompt.items() if nd.get("class_type") == "GroupExecutorManager"]
                cache_get_nodes = [nid for nid, nd in prompt.items() if nd.get("class_type") == "ImageCacheGet"]
                cache_save_nodes = [nid for nid, nd in prompt.items() if nd.get("class_type") == "ImageCacheSave"]

                output_lines.append(f"\n关键节点:")
                output_lines.append(f"  组执行管理器: {len(gem_nodes)} 个")
                output_lines.append(f"  图像缓存获取: {len(cache_get_nodes)} 个")
                output_lines.append(f"  图像缓存保存: {len(cache_save_nodes)} 个")

                log_lines = [
                    f"节点类型分布: {json.dumps(node_types, indent=2)}",
                    f"关键节点ID: GEM={gem_nodes}, CacheGet={cache_get_nodes}, CacheSave={cache_save_nodes}"
                ]

            monitor_output = "\n".join(output_lines)
            debug_log = "\n".join(log_lines)

        except Exception as e:
            monitor_output = f"执行追踪监控失败: {str(e)}"
            debug_log = f"错误详情: {str(e)}"

        return monitor_output, debug_log

# 节点映射函数
def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "DebugMonitor": DebugMonitor
    }

def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "DebugMonitor": "Debug Monitor (调试监控)"
    }

# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()