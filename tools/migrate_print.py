#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
print() 到 logger 的自动迁移脚本

使用方法：
    python migrate_print.py <文件路径>

功能：
    1. 将 print(f"[模块名] 错误/警告/调试信息") 替换为 logger.xxx(...)
    2. 根据消息内容自动判断日志级别
    3. 移除 [模块名] 前缀（logger会自动添加模块名）
    4. 处理 traceback.print_exc() 为 logger.debug(traceback.format_exc())
"""

import re
import sys
import io
from pathlib import Path

# 修复Windows控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def migrate_print_calls(content: str) -> str:
    """
    迁移 print() 调用到 logger

    Args:
        content: 文件内容

    Returns:
        str: 迁移后的内容
    """
    # 1. 处理 traceback.print_exc() → logger.debug(traceback.format_exc())
    content = re.sub(
        r'(\s+)traceback\.print_exc\(\)',
        r'\1logger.debug(traceback.format_exc())',
        content
    )

    # 2. 处理 print(traceback.format_exc()) → logger.debug(traceback.format_exc())
    content = re.sub(
        r'(\s+)print\(traceback\.format_exc\(\)\)',
        r'\1logger.debug(traceback.format_exc())',
        content
    )

    # 3. 处理带模块名前缀的 print()
    # 模式: print(f"[ModuleName] <emoji/keyword> message")
    # 或: print("[ModuleName] <emoji/keyword> message")

    # 定义日志级别映射规则
    error_patterns = r'(❌|✗|错误|失败|Error|Failed|Exception|失败:|错误:)'
    warning_patterns = r'(⚠️|⚠|警告|Warning|warning:)'
    debug_patterns = r'(DEBUG|debug|详情)'

    def replace_print(match):
        indent = match.group(1)
        is_fstring = match.group(2) == 'f'
        quote = match.group(3)
        message = match.group(4)

        # 移除模块名前缀 [XXX]
        message_clean = re.sub(r'^\[[\w\s]+\]\s*', '', message)

        # 判断日志级别
        if re.search(error_patterns, message):
            level = 'error'
        elif re.search(warning_patterns, message):
            level = 'warning'
        elif re.search(debug_patterns, message):
            level = 'debug'
        else:
            # 默认info级别
            level = 'info'

        # 构建新的 logger 调用
        if is_fstring:
            result = f'{indent}logger.{level}(f{quote}{message_clean}{quote})'
        else:
            result = f'{indent}logger.{level}({quote}{message_clean}{quote})'

        return result

    # 匹配 print(f"...") 或 print("...")
    pattern = r'^(\s+)print\((f?)(["\'])([^\3]+?)\3\)'
    content = re.sub(pattern, replace_print, content, flags=re.MULTILINE)

    return content


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

        # 统计原始的 print 调用次数（排除注释和字符串中的）
        original_count = len(re.findall(r'^\s+print\(', content, re.MULTILINE))
        print(f"  找到 {original_count} 处 print 调用")

        # 执行迁移
        content_new = migrate_print_calls(content)

        # 统计替换后的情况
        new_logger_count = len(re.findall(r'logger\.(debug|info|warning|error)\s*\(', content_new))
        remaining_print = len(re.findall(r'^\s+print\(', content_new, re.MULTILINE))

        print(f"  已转换 {original_count - remaining_print} 处为 logger 调用")
        print(f"  剩余 {remaining_print} 处 print 调用（可能是测试代码或其他格式）")

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
        print("用法: python migrate_print.py <文件路径>")
        print("示例: python migrate_print.py py/text_cache_manager/text_cache_manager.py")
        sys.exit(1)

    file_path = Path(sys.argv[1])

    if not file_path.exists():
        print(f"错误: 文件不存在: {file_path}")
        sys.exit(1)

    print("=" * 60)
    print("print() 到 logger 自动迁移脚本")
    print("=" * 60)

    success = migrate_file(file_path)

    print("=" * 60)
    if success:
        print("✅ 迁移完成！")
        print()
        print("下一步：")
        print("1. 检查剩余的 print 调用是否需要手动处理")
        print("2. 运行 Python 检查语法：python -m py_compile <文件>")
        print("3. 测试功能是否正常")
    else:
        print("❌ 迁移失败，请检查错误信息")
        sys.exit(1)


if __name__ == '__main__':
    main()
