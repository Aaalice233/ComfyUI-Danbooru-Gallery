"""
提示词规范化模块
提供统一的提示词格式化功能，包括下划线转空格、权重语法标准化、括号转义等
"""

import re


class PromptFormatter:
    """提示词格式化器"""

    # 预编译正则表达式以提升性能
    WEIGHT_PATTERN = re.compile(r'^([a-zA-Z0-9_\-\s]+):(\d*\.?\d+|:)$')
    # 智能逗号分割：考虑括号嵌套
    COMMA_SPLIT_PATTERN = re.compile(r'[,，]+')

    @classmethod
    def format_prompt(cls, prompt: str) -> str:
        """完整规范化流程 - 最终版"""
        if not prompt or not prompt.strip():
            return prompt

        # 1. 智能逗号分割成独立标签（兼容中英文逗号，考虑括号嵌套）
        raw_tags = cls._smart_comma_split(prompt)

        tags = []
        for tag in raw_tags:
            tag = tag.strip()
            if not tag:
                continue

            # 2. 对每个标签单独处理
            processed_tag = cls._process_single_tag(tag)
            tags.append(processed_tag)

        # 3. 重新用英文逗号和空格连接
        return ', '.join(tags)

    @classmethod
    def format_prompts_batch(cls, prompts: list) -> list:
        """批量规范化提示词列表"""
        return [cls.format_prompt(prompt) for prompt in prompts]

    @staticmethod
    def _smart_comma_split(prompt: str) -> list:
        """智能逗号分割，考虑括号嵌套"""
        if not prompt:
            return []

        result = []
        current = ""
        bracket_depth = 0

        for char in prompt:
            if char in '([{':
                bracket_depth += 1
            elif char in ')]}':
                bracket_depth = max(0, bracket_depth - 1)
            elif char in ',，' and bracket_depth == 0:
                # 只在括号外部分割逗号
                result.append(current)
                current = ""
                continue

            current += char

        if current:
            result.append(current)

        return result

    @staticmethod
    def _process_single_tag(tag: str) -> str:
        """处理单个标签 - 包含权重语法补全"""

        # 步骤1: 下划线转空格
        tag = tag.replace('_', ' ')

        # 步骤2: 权重语法检测和补全（先处理权重语法，避免干扰括号判断）
        tag = PromptFormatter._normalize_weight_syntax(tag)

        # 步骤3: 智能括号转义 + 统一空格插入（在权重语法处理之后）
        tag = PromptFormatter._escape_brackets_in_tag(tag)

        return tag

    @staticmethod
    def _normalize_weight_syntax(tag: str) -> str:
        """标准化权重语法 - 为不合规的权重语法添加括号"""

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
    def _escape_brackets_in_tag(tag: str) -> str:
        """在标签中智能转义括号 + 统一空格插入"""
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
                            result.append(f'\\\\({bracket_content}\\\\)')
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

    @staticmethod
    def _should_escape_bracket(content: str) -> bool:
        """判断括号内容是否需要转义"""
        # 基于实际使用场景：转义括号主要用于 角色名称(系列名称) 结构
        # 转义括号内的内容不应该包含权重语法

        # 已转义的括号内容
        if '\\(' in content or '\\)' in content:
            return False

        # 如果包含权重语法或多标签语法，说明这不是正常的角色系列格式，不需要转义
        if ':' in content or ',' in content:
            return False

        # 普通的系列名称需要转义（角色名称(系列名称)等）
        return True


# 便捷函数
def format_prompt(prompt: str) -> str:
    """便捷的格式化函数"""
    return PromptFormatter.format_prompt(prompt)


if __name__ == "__main__":
    # 基于实际使用场景的测试用例 - 修正版
    test_cases = [
        "1girl, long hair",
        "narmaya(granblue fantasy), hakurei_reimu(touhou_project)",  # 正确的角色(系列)格式
        "character name:1.2",  # 权重语法补全
        "test:0.8, simple_tag, complex(description here)",  # 普通描述需要转义
        "1girl,long hair，character_name:1.2, narmaya(good fantasy)",
        "(1girl), simple(name), weight(1girl:1.0)",  # 孤立括号测试
        "(tag1,tag2,tag3:1.2), normal_tag",  # 孤立的多标签权重语法
        "(tag1,tag2:0.8), (tag3,tag4:1.5)",  # 多个多标签权重语法
        "remilia_scarlet(touhou_project), flandre_scarlet(touhou_project)",  # 实际角色用法
        "1girl, smile, (blue_eyes:1.2), (long_hair:1.1), masterpiece",  # 实际权重语法用法
        "character(tag3:1.2), another_tag",  # 漏逗号的情况，不应该转义
        "name(series:1.0), normal_tag",  # 漏逗号的情况，不应该转义
        "test(complex, description), normal",  # 多描述内容，不应该转义
        "tag1(tag2,tag3), normal"  # 多标签描述，不应该转义
    ]

    for test in test_cases:
        result = format_prompt(test)
        print(f"输入: {test}")
        print(f"输出: {result}")
        print("-" * 60)