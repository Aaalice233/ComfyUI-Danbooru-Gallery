#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
元数据深度对比脚本 (Metadata Deep Comparison Script)
用于对比分析 PNG 图片中的元数据差异
"""

from PIL import Image
import sys
import os
from typing import Optional

# 设置 UTF-8 编码输出（Windows 兼容）
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def read_png_metadata(image_path: str) -> dict[str, str]:
    """
    读取并显示 PNG 图片的所有元数据

    Args:
        image_path: PNG 图片路径

    Returns:
        包含所有元数据的字典
    """
    if not os.path.exists(image_path):
        print(f"❌ 文件不存在: {image_path}")
        return {}

    try:
        img = Image.open(image_path)

        # 获取所有文本块
        metadata = {}
        if hasattr(img, 'text'):
            metadata = img.text.copy()

        print(f"\n{'='*80}")
        print(f"📁 文件: {os.path.basename(image_path)}")
        print(f"{'='*80}")
        print(f"📊 图片尺寸: {img.size[0]}x{img.size[1]}")
        print(f"📝 元数据字段数量: {len(metadata)}")
        print(f"\n{'─'*80}")

        # 显示所有字段
        for key, value in metadata.items():
            if key == "parameters":
                print(f"\n🔑 字段: {key}")
                print(f"📏 长度: {len(value)} 字符")
                print(f"📄 内容:\n{value}")
            else:
                print(f"\n🔑 字段: {key}")
                if len(value) > 200:
                    print(f"📏 长度: {len(value)} 字符 (内容过长，仅显示前200字符)")
                    print(f"📄 内容:\n{value[:200]}...")
                else:
                    print(f"📏 长度: {len(value)} 字符")
                    print(f"📄 内容:\n{value}")

        print(f"\n{'='*80}\n")

        img.close()
        return metadata

    except Exception as e:
        print(f"❌ 读取元数据失败: {e}")
        return {}


def visualize_invisible(text: str) -> str:
    """
    可视化不可见字符

    Args:
        text: 原始文本

    Returns:
        可视化后的文本
    """
    return (text
            .replace('\n', '↵\n')
            .replace('\r', '⏎')
            .replace('\t', '→')
            .replace(' ', '·'))


def compare_parameters(params1: str, params2: str,
                       name1: str = "LoRA Manager",
                       name2: str = "SaveImagePlus") -> None:
    """
    详细对比 parameters 字段

    Args:
        params1: 第一个 parameters 字符串
        params2: 第二个 parameters 字符串
        name1: 第一个来源名称
        name2: 第二个来源名称
    """
    print(f"\n{'='*80}")
    print(f"🔍 详细对比分析")
    print(f"{'='*80}")

    # 1. 长度对比
    print(f"\n📏 长度对比:")
    print(f"  {name1}: {len(params1)} 字符")
    print(f"  {name2}: {len(params2)} 字符")
    print(f"  差异: {abs(len(params1) - len(params2))} 字符")

    # 2. 行数对比
    lines1 = params1.split('\n')
    lines2 = params2.split('\n')
    print(f"\n📄 行数对比:")
    print(f"  {name1}: {len(lines1)} 行")
    print(f"  {name2}: {len(lines2)} 行")
    print(f"  差异: {abs(len(lines1) - len(lines2))} 行")

    # 3. 逐行对比
    print(f"\n📋 逐行对比:")
    max_lines = max(len(lines1), len(lines2))

    differences_found = False
    for i in range(max_lines):
        line1 = lines1[i] if i < len(lines1) else None
        line2 = lines2[i] if i < len(lines2) else None

        if line1 == line2:
            # 相同的行
            if line1:  # 不显示空行
                print(f"  ✅ 第{i+1}行: {line1[:60]}{'...' if len(line1) > 60 else ''}")
        else:
            differences_found = True
            print(f"\n  ❌ 第{i+1}行差异:")
            if line1 is None:
                print(f"    {name1}: (不存在)")
                print(f"    {name2}: {line2}")
            elif line2 is None:
                print(f"    {name1}: {line1}")
                print(f"    {name2}: (不存在)")
            else:
                print(f"    {name1}: {line1}")
                print(f"    {name2}: {line2}")

                # 显示不可见字符
                if line1.strip() == line2.strip():
                    print(f"    ℹ️  内容相同但有不可见字符差异:")
                    print(f"    {name1}: {visualize_invisible(line1)}")
                    print(f"    {name2}: {visualize_invisible(line2)}")

    if not differences_found:
        print(f"  ✅ 所有行完全相同！")

    # 4. 关键字段检查
    print(f"\n🔑 关键字段检查:")
    key_fields = [
        "Negative prompt:",
        "Steps:",
        "Sampler:",
        "CFG scale:",
        "Seed:",
        "Size:",
        "Model:",
        "Lora hashes:",
    ]

    for field in key_fields:
        in_params1 = field in params1
        in_params2 = field in params2

        if in_params1 and in_params2:
            print(f"  ✅ {field} 两者都包含")
        elif in_params1:
            print(f"  ⚠️  {field} 仅 {name1} 包含")
        elif in_params2:
            print(f"  ⚠️  {field} 仅 {name2} 包含")
        else:
            print(f"  ❌ {field} 两者都不包含")

    # 5. 字节级差异
    print(f"\n🔬 字节级差异分析:")
    if params1 == params2:
        print(f"  ✅ 完全相同（字节级别）")
    else:
        # 找出第一个不同的位置
        min_len = min(len(params1), len(params2))
        first_diff = -1
        for i in range(min_len):
            if params1[i] != params2[i]:
                first_diff = i
                break

        if first_diff >= 0:
            print(f"  ❌ 第一个差异位置: 第 {first_diff} 个字符")
            start = max(0, first_diff - 20)
            end = min(min_len, first_diff + 20)
            print(f"  上下文 ({name1}):")
            print(f"    ...{params1[start:end]}...")
            print(f"  上下文 ({name2}):")
            print(f"    ...{params2[start:end]}...")
            print(f"  字符对比:")
            print(f"    {name1}[{first_diff}]: '{params1[first_diff]}' (ASCII {ord(params1[first_diff])})")
            print(f"    {name2}[{first_diff}]: '{params2[first_diff]}' (ASCII {ord(params2[first_diff])})")
        elif len(params1) != len(params2):
            print(f"  ⚠️  前 {min_len} 个字符相同，但长度不同")

    print(f"\n{'='*80}\n")


def main():
    """主函数"""
    print("\n" + "="*80)
    print("🔍 PNG 元数据深度对比工具")
    print("="*80)

    if len(sys.argv) < 2:
        print("\n使用方法:")
        print("  单文件模式: python debug_metadata.py <图片路径>")
        print("  对比模式:   python debug_metadata.py <图片1> <图片2>")
        print("\n示例:")
        print('  python debug_metadata.py "output/image1.png"')
        print('  python debug_metadata.py "output/image1.png" "output/image2.png"')
        sys.exit(1)

    # 单文件模式
    if len(sys.argv) == 2:
        image_path = sys.argv[1]
        metadata = read_png_metadata(image_path)

        if metadata and "parameters" in metadata:
            print("\n💡 提示: 可以使用对比模式查看两个图片的差异")

    # 对比模式
    elif len(sys.argv) >= 3:
        image1 = sys.argv[1]
        image2 = sys.argv[2]

        # 读取两个图片的元数据
        metadata1 = read_png_metadata(image1)
        metadata2 = read_png_metadata(image2)

        # 对比 parameters 字段
        if "parameters" in metadata1 and "parameters" in metadata2:
            name1 = os.path.basename(image1).split('_')[0]  # 使用文件名前缀作为标识
            name2 = os.path.basename(image2).split('_')[0]
            compare_parameters(
                metadata1["parameters"],
                metadata2["parameters"],
                name1=name1,
                name2=name2
            )
        elif "parameters" not in metadata1:
            print(f"⚠️  警告: 第一个图片没有 'parameters' 字段")
        elif "parameters" not in metadata2:
            print(f"⚠️  警告: 第二个图片没有 'parameters' 字段")

    print("✨ 分析完成！")


if __name__ == "__main__":
    main()
