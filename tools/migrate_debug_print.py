#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
debug_print 到 logger 的自动迁移脚本

使用方法：
    python migrate_debug_print.py <文件路径>

功能：
    1. 将 debug_print(COMPONENT_NAME, ...) 替换为 logger.xxx(...)
    2. 根据消息中的emoji和关键词自动判断日志级别
    3. 保留 f-string 格式（简单可靠）
    4. 移除 [组件名] 前缀（logger会自动添加模块名）
"""

import re
import sys
import io
from pathlib import Path

# 修复Windows控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


# 日志级别映射规则（按优先级）
LOG_LEVEL_PATTERNS = [
    # ERROR - 最高优先级
    (r'❌|错误|失败|Error|Failed|Exception', 'error'),
    # WARNING
    (r'⚠️|警告|Warning', 'warning'),
    # INFO
    (r'✅|成功|完成|已|Completed|Success', 'info'),
    (r'✓', 'info'),
    # DEBUG - 默认级别
    (r'📦|📍|🎯|🔧|执行|开始|详情|检测|检查', 'debug'),
    (r'🚀|准备|正在', 'debug'),
]


def detect_log_level(message: str) -> str:
    """
    根据消息内容检测日志级别

    Args:
        message: 日志消息

    Returns:
        str: 日志级别 (debug/info/warning/error)
    """
    for pattern, level in LOG_LEVEL_PATTERNS:
        if re.search(pattern, message):
            return level

    # 默认使用 debug 级别（最详细）
    return 'debug'


def remove_component_prefix(message: str) -> str:
    """
    移除消息中的组件名前缀

    Args:
        message: 原始消息，如 "[GroupExecutorManager] 消息"

    Returns:
        str: 移除前缀后的消息，如 "消息"
    """
    # 移除 [XXX] 前缀
    message = re.sub(r'^\[[\w\s]+\]\s*', '', message)
    return message


def migrate_debug_print_call(match) -> str:
    """
    迁移单个 debug_print 调用

    策略：保留 f-string 原样，只移除组件名前缀

    例如：
        debug_print(COMPONENT_NAME, f"[XXX] ✅ msg {var}")
        → logger.info(f"✅ msg {var}")

    Args:
        match: 正则匹配对象

    Returns:
        str: 替换后的 logger 调用
    """
    indent = match.group(1)  # 缩进
    message = match.group(2).strip()  # 消息内容（完整的字符串表达式）

    # 检测日志级别（在移除前缀之前检测，确保能捕获所有emoji）
    level = detect_log_level(message)

    # 在字符串内部移除组件名前缀
    # 使用正则直接在整个message上操作，保持字符串结构完整
    #
    # 匹配模式：
    # - (f?["'])  : 捕获字符串开头（可选的f + 引号）
    # - \[[\w\s]+\]\s*  : 匹配并移除 [XXX] 前缀
    # - (.*?)  : 捕获剩余内容
    # - (["'])  : 捕获结束引号（需要与开头引号匹配）
    message_clean = re.sub(
        r'^(f?["\'])\[[\w\s]+\]\s*(.*?)(["\']\s*)$',
        r'\1\2\3',
        message,
        flags=re.DOTALL
    )

    # 如果没有匹配到前缀，保持原样
    if message_clean == message:
        # 可能没有前缀，直接使用
        pass

    # 构建新的 logger 调用
    result = f'{indent}logger.{level}({message_clean})'

    return result


def migrate_file(file_path: Path) -> bool:
    """
    迁移单个文件

    Args:
        file_path: 文件路径

    Returns:
        bool: 是否成功
    """
    print(f"正在迁移: {file_path}")

    try:
        # 读取文件
        content = file_path.read_text(encoding='utf-8')

        # 统计原始的 debug_print 调用次数
        original_count = len(re.findall(r'debug_print\s*\(', content))
        print(f"  找到 {original_count} 处 debug_print 调用")

        # 替换 debug_print 调用
        # 支持两种模式：
        # 1. debug_print(COMPONENT_NAME, f"..." 或 "...")
        # 2. debug_config.debug_print("component", f"..." 或 "...")

        pattern1 = r'^(\s*)debug_print\s*\(\s*COMPONENT_NAME\s*,\s*([^\)]+)\)'
        pattern2 = r'^(\s*)debug_config\.debug_print\s*\(\s*"[^"]+"\s*,\s*([^\)]+)\)'

        # 先处理第一种模式
        content_new = re.sub(
            pattern1,
            migrate_debug_print_call,
            content,
            flags=re.MULTILINE
        )

        # 再处理第二种模式
        content_new = re.sub(
            pattern2,
            migrate_debug_print_call,
            content_new,
            flags=re.MULTILINE
        )

        # 统计替换后的 logger 调用次数
        new_count = len(re.findall(r'logger\.(debug|info|warning|error)\s*\(', content_new))
        remaining = len(re.findall(r'debug_print\s*\(', content_new))

        print(f"  已转换 {new_count} 处为 logger 调用")
        print(f"  剩余 {remaining} 处 debug_print 调用（可能格式特殊）")

        # 写回文件
        file_path.write_text(content_new, encoding='utf-8')
        print(f"  ✅ 迁移完成")

        return True

    except Exception as e:
        print(f"  ❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    if len(sys.argv) < 2:
        print("用法: python migrate_debug_print.py <文件路径>")
        print("示例: python migrate_debug_print.py py/workflow_description/workflow_description.py")
        sys.exit(1)

    file_path = Path(sys.argv[1])

    if not file_path.exists():
        print(f"错误: 文件不存在: {file_path}")
        sys.exit(1)

    print("=" * 60)
    print("debug_print 到 logger 自动迁移脚本")
    print("=" * 60)

    success = migrate_file(file_path)

    print("=" * 60)
    if success:
        print("✅ 迁移完成！")
        print()
        print("下一步：")
        print("1. 检查文件中是否还有未处理的 debug_print 调用")
        print("2. 手动处理格式特殊的调用（如果有）")
        print("3. 运行 Python 检查语法：python -m py_compile <文件>")
        print("4. 测试功能是否正常")
    else:
        print("❌ 迁移失败，请检查错误信息")
        sys.exit(1)


if __name__ == '__main__':
    main()
