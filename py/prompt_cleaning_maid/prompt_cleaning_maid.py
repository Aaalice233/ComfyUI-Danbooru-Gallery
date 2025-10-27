import re

LORA_PATTERN = re.compile(r"<lora:[^>]+>")

class PromptCleaningMaid:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "string": ("STRING", {"forceInput": True}),
                "清理逗号 (cleanup_commas)": ("BOOLEAN", {"default": True, "tooltip": "清理多余的逗号（如果两个逗号之间没有标签）"}),
                "清理空白 (cleanup_whitespace)": ("BOOLEAN", {"default": True, "tooltip": "清理首尾空白和多余的空白字符"}),
                "移除LoRA标签 (remove_lora_tags)": ("BOOLEAN", {"default": False, "tooltip": "完全移除字符串中的 LoRA 标签"}),
                "清理换行 (cleanup_newlines)": (["否 (false)", "空格 (space)", "逗号 (comma)"], {"default": "否 (false)", "tooltip": "将换行符 (\\n) 替换为空格或逗号"}),
                "修复括号 (fix_brackets)": (["否 (false)", "圆括号 (parenthesis)", "方括号 (brackets)", "两者 (both)"], {"default": "两者 (both)", "tooltip": "移除不匹配的括号"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("string",)
    FUNCTION = "process"
    CATEGORY = "danbooru"

    @staticmethod
    def _remove_unmatched(s: str, open_ch: str, close_ch: str) -> str:
        """Removes unmatched brackets of one type while preserving valid pairs."""
        stack = []
        remove_idx = set()

        for i, ch in enumerate(s):
            if ch == open_ch:
                stack.append(i)
            elif ch == close_ch:
                if stack:
                    stack.pop()  # matched → keep both
                else:
                    remove_idx.add(i)  # unmatched close → remove later

        # any opens still in stack are unmatched → remove them
        remove_idx.update(stack)

        # build cleaned string
        return "".join(ch for i, ch in enumerate(s) if i not in remove_idx)

    @staticmethod
    def process(string, **kwargs):
        # 获取参数
        cleanup_commas = kwargs.get("清理逗号 (cleanup_commas)", True)
        cleanup_whitespace = kwargs.get("清理空白 (cleanup_whitespace)", True)
        remove_lora_tags = kwargs.get("移除LoRA标签 (remove_lora_tags)", False)
        cleanup_newlines = kwargs.get("清理换行 (cleanup_newlines)", "否 (false)")
        fix_brackets = kwargs.get("修复括号 (fix_brackets)", "两者 (both)")

        # 将中英双语选项值映射回英文值
        cleanup_newlines_map = {
            "否 (false)": "false",
            "空格 (space)": "space",
            "逗号 (comma)": "comma"
        }
        fix_brackets_map = {
            "否 (false)": "false",
            "圆括号 (parenthesis)": "(parenthesis)",
            "方括号 (brackets)": "[brackets]",
            "两者 (both)": "([both])"
        }

        cleanup_newlines = cleanup_newlines_map.get(cleanup_newlines, cleanup_newlines)
        fix_brackets = fix_brackets_map.get(fix_brackets, fix_brackets)

        # Stage 1: Remove LoRA tags
        if remove_lora_tags:
            string = re.sub(LORA_PATTERN, "", string)

        # Stage 2: Replace newlines with space
        if cleanup_newlines == "space":
            string = string.replace("\n", " ")
        elif cleanup_newlines == "comma":
            string = string.replace("\n", ", ")

        # Stage 3: Remove empty comma sections
        if cleanup_commas:
            # Iteratively remove leading commas
            while re.match(r"^[ \t]*,[ \t]*", string):
                string = re.sub(r"^[ \t]*,[ \t]*", "", string)

            # Iteratively remove trailing commas
            while re.search(r"[ \t]*,[ \t]*$", string):
                string = re.sub(r"[ \t]*,[ \t]*$", "", string)

            # Remove empty comma sections inside the string
            while re.search(r",[ \t]*,", string):
                string = re.sub(r",[ \t]*,", ",", string)

        # Stage 4: Fix stray brackets
        if fix_brackets != "false":
            if fix_brackets in ("(parenthesis)", "([both])"):
                string = PromptCleaningMaid._remove_unmatched(string, "(", ")")
            if fix_brackets in ("[brackets]", "([both])"):
                string = PromptCleaningMaid._remove_unmatched(string, "[", "]")

        # Stage 5: Whitespace cleanup
        if cleanup_whitespace:
            string = string.strip(" \t")
            string = re.sub(r"[ \t]{2,}", " ", string)              # collapse spaces/tabs
            string = re.sub(r"[ \t]*,[ \t]*", ", ", string)         # normalize comma spacing

        return (string,)
