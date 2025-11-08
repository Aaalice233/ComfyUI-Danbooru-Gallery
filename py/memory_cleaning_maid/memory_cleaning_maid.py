"""
内存清理女仆 (Memory Cleaning Maid)
一个可爱又专业的内存管理节点～♪

基于 ComfyUI-FreeMemory 改进
支持 ANY 类型输入输出，女仆风格日志输出
"""

import torch
import gc
import psutil
import os
import ctypes
import comfy.model_management as mm


class AlwaysEqualProxy(str):
    """
    万能类型代理类
    用于绕过 ComfyUI 的类型检查，允许接收任意类型的输入

    借鉴自 ComfyUI-Easy-Use
    """
    def __eq__(self, _):
        return True

    def __ne__(self, _):
        return False


# 定义万能类型
any_type = AlwaysEqualProxy("*")


class MemoryCleaningMaid:
    """
    内存清理女仆节点

    功能：
    - 支持任意类型数据的传递（ANY 类型）
    - 清理 GPU 显存和系统内存
    - 提供普通模式和激进模式
    - 女仆风格的可爱日志输出
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "anything": (any_type, {}),  # 万能输入，接收任意类型
                "aggressive": ("BOOLEAN", {"default": False})  # 激进模式开关
            }
        }

    RETURN_TYPES = (any_type,)  # 万能输出，返回任意类型
    RETURN_NAMES = ("anything",)
    FUNCTION = "clean_memory"
    CATEGORY = "danbooru"

    def clean_memory(self, anything, aggressive=False):
        """
        执行内存清理并传递数据

        Args:
            anything: 任意类型的输入数据
            aggressive: 是否使用激进模式

        Returns:
            原样返回输入数据
        """
        # 女仆开始工作啦～
        if aggressive:
            print("⚡ 主人，激进模式启动！女仆会更认真地清理的！(`･ω･´)")
        else:
            print("主人，女仆开始清理内存了哦～♪")

        # 执行清理
        self.free_gpu_vram(aggressive)
        self.free_system_ram(aggressive)

        print("✨ 清理完成！女仆的工作完美结束～(｡♥‿♥｡)")

        # 原样返回数据，不做任何修改
        return (anything,)

    def free_gpu_vram(self, aggressive):
        """
        清理 GPU 显存

        普通模式：仅清空 CUDA 缓存
        激进模式：卸载所有模型 + 软清空缓存 + 清空 CUDA 缓存

        Args:
            aggressive: 是否使用激进模式
        """
        if torch.cuda.is_available():
            initial_memory = torch.cuda.memory_allocated()

            if aggressive:
                # 激进模式：卸载所有模型
                mm.unload_all_models()
                mm.soft_empty_cache()

            # 清空 CUDA 缓存
            torch.cuda.empty_cache()

            final_memory = torch.cuda.memory_allocated()
            memory_freed = initial_memory - final_memory

            # 女仆报告清理成果～
            print(f"🎀 GPU显存清理完成！初始: {initial_memory/1e9:.2f} GB → "
                  f"当前: {final_memory/1e9:.2f} GB，为主人释放了 {memory_freed/1e9:.2f} GB呢！"
                  f"(๑•̀ㅂ•́)و✧")
        else:
            # 没有 GPU 的情况
            print("主人，这台机器没有GPU呢～女仆只能清理系统内存了 (´；ω；`)")

    def free_system_ram(self, aggressive):
        """
        清理系统内存

        基础：Python 垃圾回收
        激进模式：
          - Linux: 清空系统缓存 (sync + drop_caches)
          - Windows: 清空工作集 (EmptyWorkingSet)

        Args:
            aggressive: 是否使用激进模式
        """
        initial_memory = psutil.virtual_memory().percent

        # 执行垃圾回收
        collected = gc.collect()
        print(f"🧹 垃圾回收器收集了 {collected} 个对象，女仆好努力呢～(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧")

        if aggressive:
            # 激进模式：系统级清理
            if os.name == 'posix':  # Unix/Linux
                try:
                    print("🐧 女仆正在清理Linux系统缓存～(清理中...)")
                    os.system('sync')
                    with open('/proc/sys/vm/drop_caches', 'w') as f:
                        f.write('3')
                    print("✓ Linux系统缓存清理完成！")
                except Exception as e:
                    print(f"⚠ 系统缓存清理失败: {str(e)} (可能需要管理员权限哦)")
            elif os.name == 'nt':  # Windows
                try:
                    print("🪟 女仆正在清理Windows工作集～(整理中...)")
                    ctypes.windll.psapi.EmptyWorkingSet(
                        ctypes.windll.kernel32.GetCurrentProcess()
                    )
                    print("✓ Windows工作集清理完成！")
                except Exception as e:
                    print(f"⚠ 工作集清理失败: {str(e)}")

        final_memory = psutil.virtual_memory().percent
        memory_freed = initial_memory - final_memory

        # 女仆报告系统内存清理成果～
        print(f"💾 系统内存清理完成！从 {initial_memory:.2f}% 降到了 {final_memory:.2f}%，"
              f"主人满意吗？(｡♥‿♥｡)")


# 节点映射
NODE_CLASS_MAPPINGS = {
    "MemoryCleaningMaid": MemoryCleaningMaid,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MemoryCleaningMaid": "内存清理女仆 (Memory Cleaning Maid)",
}
