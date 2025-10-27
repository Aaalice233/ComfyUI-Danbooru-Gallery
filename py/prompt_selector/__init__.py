# -*- coding: utf-8 -*-

from .prompt_selector import PromptSelector

NODE_CLASS_MAPPINGS = {
    "PromptSelector": PromptSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptSelector": "提示词选择器 (Prompt Selector)",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]