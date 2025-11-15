import re

# 导入提示词格式化模块
from ..utils.prompt_formatter import PromptFormatter

LORA_PATTERN = re.compile(r"<lora:[^>]+>")

# 特殊语法关键字列表 - 需要保护括号不被转义
SYNTAX_KEYWORDS = [
    'COUPLE', 'MASK', 'FEATHER', 'FILL', 'AND', 'BREAK',
    'couple', 'mask', 'feather', 'fill', 'and', 'break'
]

# 特殊语法模式 - 用于精确匹配语法结构
SYNTAX_PATTERNS = [
    re.compile(r'\bCOUPLE\s+MASK\s*\(', re.IGNORECASE),  # COUPLE MASK(...)
    re.compile(r'\bMASK\s*\(', re.IGNORECASE),            # MASK(...)
    re.compile(r'\bFEATHER\s*\(', re.IGNORECASE),         # FEATHER(...)
    re.compile(r'\bFILL\s*\(', re.IGNORECASE),            # FILL(...)
]

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
                "提示词格式化 (prompt_formatting)": ("BOOLEAN", {"default": True, "tooltip": "启用完整的提示词格式化：下划线转空格、权重语法补全、智能括号转义、漏逗号检测等"}),
                "下划线转空格 (underscore_to_space)": ("BOOLEAN", {"default": True, "tooltip": "将下划线转换为空格"}),
                "权重语法补全 (complete_weight_syntax)": ("BOOLEAN", {"default": True, "tooltip": "为不合规的权重语法添加括号，如 tag:1.2 → (tag:1.2)"}),
                "智能括号转义 (smart_bracket_escaping)": ("BOOLEAN", {"default": True, "tooltip": "智能转义括号，区分权重语法和角色系列名称，并检测漏逗号情况"}),
                "标准化逗号 (standardize_commas)": ("BOOLEAN", {"default": True, "tooltip": "将逗号标准化为英文逗号+空格格式"}),
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
        # 获取原有功能参数
        cleanup_commas = kwargs.get("清理逗号 (cleanup_commas)", True)
        cleanup_whitespace = kwargs.get("清理空白 (cleanup_whitespace)", True)
        remove_lora_tags = kwargs.get("移除LoRA标签 (remove_lora_tags)", False)
        cleanup_newlines = kwargs.get("清理换行 (cleanup_newlines)", "否 (false)")
        fix_brackets = kwargs.get("修复括号 (fix_brackets)", "两者 (both)")

        # 获取新的格式化参数
        prompt_formatting = kwargs.get("提示词格式化 (prompt_formatting)", True)
        underscore_to_space = kwargs.get("下划线转空格 (underscore_to_space)", True)
        complete_weight_syntax = kwargs.get("权重语法补全 (complete_weight_syntax)", True)
        smart_bracket_escaping = kwargs.get("智能括号转义 (smart_bracket_escaping)", True)
        standardize_commas = kwargs.get("标准化逗号 (standardize_commas)", True)

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

        # Stage 1: Remove LoRA tags (原有功能)
        if remove_lora_tags:
            string = re.sub(LORA_PATTERN, "", string)

        # Stage 2: Replace newlines with space (原有功能)
        if cleanup_newlines == "space":
            string = string.replace("\n", " ")
        elif cleanup_newlines == "comma":
            string = string.replace("\n", ", ")

        # Stage 3: 高级提示词格式化 (本小姐的完美格式化逻辑!)
        if prompt_formatting:
            # 应用完整的PromptFormatter格式化
            # 由于原版PromptFormatter是固定的格式化流程，我们需要根据用户选择的选项来定制
            string = PromptCleaningMaid._apply_custom_formatting(
                string,
                underscore_to_space,
                complete_weight_syntax,
                smart_bracket_escaping,
                standardize_commas
            )

        # Stage 4: Remove empty comma sections (原有功能，但在高级格式化后可能不需要)
        if cleanup_commas and not prompt_formatting:
            # 只有在未启用高级格式化时才执行原有的逗号清理
            # Iteratively remove leading commas
            while re.match(r"^[ \t]*,[ \t]*", string):
                string = re.sub(r"^[ \t]*,[ \t]*", "", string)

            # Iteratively remove trailing commas
            while re.search(r"[ \t]*,[ \t]*$", string):
                string = re.sub(r"[ \t]*,[ \t]*$", "", string)

            # Remove empty comma sections inside the string
            while re.search(r",[ \t]*,", string):
                string = re.sub(r",[ \t]*,", ",", string)

        # Stage 5: Fix stray brackets (原有功能，但在高级格式化后可能不需要)
        if fix_brackets != "false" and not prompt_formatting:
            # 只有在未启用高级格式化时才执行原有的括号修复
            if fix_brackets in ("(parenthesis)", "([both])"):
                string = PromptCleaningMaid._remove_unmatched(string, "(", ")")
            if fix_brackets in ("[brackets]", "([both])"):
                string = PromptCleaningMaid._remove_unmatched(string, "[", "]")

        # Stage 6: Whitespace cleanup (原有功能)
        if cleanup_whitespace:
            string = string.strip(" \t")
            string = re.sub(r"[ \t]{2,}", " ", string)              # collapse spaces/tabs
            string = re.sub(r"[ \t]*,[ \t]*", ", ", string)         # normalize comma spacing

        return (string,)

    @staticmethod
    def _apply_custom_formatting(prompt: str, underscore_to_space: bool, complete_weight_syntax: bool,
                                smart_bracket_escaping: bool, standardize_commas: bool) -> str:
        """
        应用定制的格式化逻辑 - 本小姐的完美格式化！
        """
        if not prompt or not prompt.strip():
            return prompt

        # 阶段1：智能逗号分割成独立标签（兼容中英文逗号，考虑括号嵌套）
        raw_tags = PromptFormatter._smart_comma_split(prompt)

        tags = []
        for tag in raw_tags:
            tag = tag.strip()
            if not tag:
                continue

            # 阶段2：根据用户选择对每个标签单独处理
            processed_tag = PromptCleaningMaid._process_single_tag_custom(
                tag, underscore_to_space, complete_weight_syntax, smart_bracket_escaping
            )
            tags.append(processed_tag)

        # 阶段3：根据用户选择重新连接
        if standardize_commas:
            # 标准化：英文逗号+空格
            return ', '.join(tags)
        else:
            # 保持原有逗号格式（使用原始连接方式）
            return ','.join(tags)

    @staticmethod
    def _contains_special_syntax(tag: str) -> bool:
        """
        检测标签是否包含特殊语法（如 COUPLE MASK、FEATHER 等）
        如果包含特殊语法，则不应该对其括号进行转义
        """
        # 方法1: 检查是否匹配特殊语法模式
        for pattern in SYNTAX_PATTERNS:
            if pattern.search(tag):
                return True

        # 方法2: 检查是否包含语法关键字
        tag_upper = tag.upper()
        for keyword in SYNTAX_KEYWORDS:
            if keyword.upper() in tag_upper:
                return True

        return False

    @staticmethod
    def _process_single_tag_custom(tag: str, underscore_to_space: bool, complete_weight_syntax: bool,
                                 smart_bracket_escaping: bool) -> str:
        """处理单个标签 - 定制版格式化逻辑"""

        # 步骤1: 下划线转空格（如果启用）
        if underscore_to_space:
            tag = tag.replace('_', ' ')

        # 步骤2: 权重语法检测和补全（如果启用）
        if complete_weight_syntax:
            tag = PromptCleaningMaid._normalize_weight_syntax_custom(tag)

        # 步骤3: 智能括号转义（如果启用）
        # 但是！如果标签包含特殊语法（如 COUPLE MASK），则跳过括号转义
        if smart_bracket_escaping and not PromptCleaningMaid._contains_special_syntax(tag):
            tag = PromptCleaningMaid._escape_brackets_in_tag_custom(tag)

        return tag

    @staticmethod
    def _normalize_weight_syntax_custom(tag: str) -> str:
        """标准化权重语法 - 为不合规的权重语法添加括号"""
        # 使用PromptFormatter的正则表达式
        match = PromptFormatter.WEIGHT_PATTERN.match(tag.strip())
        if match:
            content = match.group(1).strip()
            weight = match.group(2)

            # 如果不是已经用括号包围的权重语法，则添加括号
            if weight == ':':
                return f'({content}:)'
            else:
                return f'({content}:{weight})'

        return tag

    @staticmethod
    def _escape_brackets_in_tag_custom(tag: str) -> str:
        """在标签中智能转义括号 - 定制版"""
        result = []
        i = 0

        while i < len(tag):
            if tag[i] == '(':
                # 查找对应的右括号
                bracket_depth = 1
                j = i + 1
                content_start = i + 1

                while j < len(tag) and bracket_depth > 0:
                    if tag[j] == '(':
                        bracket_depth += 1
                    elif tag[j] == ')':
                        bracket_depth -= 1
                    elif tag[j] == '\\':
                        j += 1  # 跳过已转义字符
                    j += 1

                if bracket_depth == 0:  # 找到匹配的右括号
                    bracket_content = tag[content_start:j-1]

                    # 检查括号前面的字符
                    has_word_before = False
                    if i > 0:
                        # 检查前面是否有非空白字符
                        for k in range(i-1, -1, -1):
                            if tag[k] not in [' ', '\t', '\n']:
                                has_word_before = True
                                break

                    # 情况1: 前面有单词
                    if has_word_before:
                        # 检查括号内容是否包含权重语法或多标签语法
                        # 如果包含，说明这是漏逗号的情况，需要分成两个标签
                        if ':' in bracket_content or ',' in bracket_content:
                            # 漏逗号：添加逗号分隔
                            result.append(', ')
                            result.append(f'({bracket_content})')
                        else:
                            # 正常的tag(content)格式：需要转义（系列名称等）
                            # 统一处理空格插入：所有括号前都检查是否需要空格
                            if tag[i-1] not in [' ', '\t', '\n']:
                                result.append(' ')
                            result.append(f'\\({bracket_content}\\)')
                        i = j

                    # 情况2: 前面没有单词（整个标签就是括号）
                    else:
                        if ':' in bracket_content:
                            # 权重语法：(content) - 保持括号，包括多标签权重语法
                            result.append(f'({bracket_content})')
                            i = j
                        else:
                            # 普通内容：移除括号，只保留内容
                            result.append(bracket_content)
                            i = j
                else:
                    # 不匹配的左括号，保持原样
                    result.append(tag[i])
                    i += 1
            else:
                result.append(tag[i])
                i += 1

        return ''.join(result)
