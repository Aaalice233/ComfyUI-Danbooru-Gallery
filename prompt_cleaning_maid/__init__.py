# Prompt Cleaning Maid - 提示词清洁女仆
# 节点注册

from .prompt_cleaning_maid import PromptCleaningMaid

# 节点注册
NODE_CLASS_MAPPINGS = {
    "PromptCleaningMaid": PromptCleaningMaid
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptCleaningMaid": "提示词清洁女仆 (Prompt Cleaning Maid)"
}

print("[PromptCleaningMaid] 节点已加载")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
