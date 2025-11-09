#!/usr/bin/env python3
"""
批量替换JS文件中的console调用为logger系统

功能：
1. 自动检测并添加logger导入语句
2. 批量替换console.log/error/warn/debug为logger调用
3. 支持单个文件或整个目录处理
4. 生成替换报告

使用方法：
    python tools/replace_console_to_logger.py <文件或目录路径> [--dry-run]

示例：
    # 处理单个文件
    python tools/replace_console_to_logger.py js/native-execution/execution-engine.js

    # 处理整个目录
    python tools/replace_console_to_logger.py js/native-execution

    # 预览模式（不实际修改文件）
    python tools/replace_console_to_logger.py js/native-execution --dry-run
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple, Dict

# 注意：不使用插件的logger系统，避免触发插件初始化
# from py.utils.logger import get_logger
# logger = get_logger(__name__)

# 使用简单的打印函数代替logger
def _safe_print(msg):
    """安全打印，处理Windows的GBK编码问题"""
    try:
        print(msg)
    except UnicodeEncodeError:
        # Windows命令行可能无法显示emoji等特殊字符，替换为?
        print(msg.encode('gbk', errors='replace').decode('gbk'))

def log_info(msg):
    _safe_print(f"[INFO] {msg}")

def log_warning(msg):
    _safe_print(f"[WARNING] {msg}")

def log_error(msg):
    _safe_print(f"[ERROR] {msg}")

def log_debug(msg):
    # Debug信息默认不打印，可以通过环境变量控制
    if os.environ.get("DEBUG"):
        _safe_print(f"[DEBUG] {msg}")


class ConsoleToLoggerReplacer:
    """Console到Logger的批量替换器"""

    def __init__(self, dry_run: bool = False, js_root: Path = None):
        self.dry_run = dry_run
        # JS根目录，用于计算相对路径
        self.js_root = js_root or Path(__file__).parent.parent / "js"
        self.stats = {
            "files_processed": 0,
            "files_modified": 0,
            "files_skipped": 0,
            "console_log_replaced": 0,
            "console_error_replaced": 0,
            "console_warn_replaced": 0,
            "console_debug_replaced": 0,
            "imports_added": 0
        }

    def process_file(self, file_path: Path) -> Tuple[bool, str]:
        """
        处理单个JS文件

        Returns:
            (是否修改, 修改信息)
        """
        try:
            # 文件大小检查（跳过超过10MB的异常大文件）
            file_size = file_path.stat().st_size
            if file_size > 10 * 1024 * 1024:  # 10MB
                log_warning(f"⚠️ 跳过超大文件（{file_size / 1024 / 1024:.2f}MB）: {file_path}")
                self.stats['files_skipped'] += 1
                return False, f"文件过大（{file_size / 1024 / 1024:.2f}MB），已跳过"

            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()

            # 处理内容
            modified_content, changes = self._process_content(original_content, file_path)

            # 如果内容没有变化，跳过
            if modified_content == original_content:
                return False, "无需修改"

            # 统计变化
            change_summary = []
            if changes['import_added']:
                change_summary.append("✅ 添加logger导入")
                self.stats['imports_added'] += 1

            if changes['console_log'] > 0:
                change_summary.append(f"console.log → logger.info: {changes['console_log']}处")
                self.stats['console_log_replaced'] += changes['console_log']

            if changes['console_error'] > 0:
                change_summary.append(f"console.error → logger.error: {changes['console_error']}处")
                self.stats['console_error_replaced'] += changes['console_error']

            if changes['console_warn'] > 0:
                change_summary.append(f"console.warn → logger.warn: {changes['console_warn']}处")
                self.stats['console_warn_replaced'] += changes['console_warn']

            if changes['console_debug'] > 0:
                change_summary.append(f"console.debug → logger.debug: {changes['console_debug']}处")
                self.stats['console_debug_replaced'] += changes['console_debug']

            # 写入文件（如果不是dry-run模式）
            if not self.dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                log_info(f"✅ 已修改: {file_path}")
            else:
                log_info(f"🔍 [预览] 将修改: {file_path}")

            self.stats['files_modified'] += 1
            return True, "; ".join(change_summary)

        except Exception as e:
            log_error(f"❌ 处理文件失败: {file_path}: {e}")
            return False, f"错误: {e}"

    def _process_content(self, content: str, file_path: Path) -> Tuple[str, Dict]:
        """
        处理文件内容

        Returns:
            (修改后的内容, 变化统计)
        """
        changes = {
            'import_added': False,
            'console_log': 0,
            'console_error': 0,
            'console_warn': 0,
            'console_debug': 0
        }

        # 1. 检测是否已导入logger
        has_logger_import = self._has_logger_import(content)

        # 2. 检测是否有console调用
        has_console_calls = bool(re.search(r'console\.(log|error|warn|debug)\s*\(', content))

        # 如果没有console调用，直接返回
        if not has_console_calls:
            return content, changes

        # 3. 提取组件名（从文件名或已有的COMPONENT_NAME）
        component_name = self._extract_component_name(content, file_path)

        # 4. 添加logger导入（如果需要）
        if not has_logger_import:
            content = self._add_logger_import(content, component_name, file_path)
            changes['import_added'] = True

        # 5. 替换console调用
        # 替换 console.log -> logger.info
        content, count = re.subn(
            r'\bconsole\.log\s*\(',
            'logger.info(',
            content
        )
        changes['console_log'] = count

        # 替换 console.error -> logger.error
        content, count = re.subn(
            r'\bconsole\.error\s*\(',
            'logger.error(',
            content
        )
        changes['console_error'] = count

        # 替换 console.warn -> logger.warn
        content, count = re.subn(
            r'\bconsole\.warn\s*\(',
            'logger.warn(',
            content
        )
        changes['console_warn'] = count

        # 替换 console.debug -> logger.debug
        content, count = re.subn(
            r'\bconsole\.debug\s*\(',
            'logger.debug(',
            content
        )
        changes['console_debug'] = count

        return content, changes

    def _has_logger_import(self, content: str) -> bool:
        """检测是否已导入logger"""
        # 检查是否有 import { createLogger } 或 const logger
        return bool(
            re.search(r'import\s+\{[^}]*createLogger[^}]*\}\s+from', content) or
            re.search(r'const\s+logger\s*=\s*createLogger\s*\(', content)
        )

    def _extract_component_name(self, content: str, file_path: Path) -> str:
        """提取组件名称"""
        # 优先从已有的COMPONENT_NAME常量提取
        match = re.search(r'const\s+COMPONENT_NAME\s*=\s*[\'"]([^\'"]+)[\'"]', content)
        if match:
            return match.group(1)

        # 否则从文件名提取（去掉.js后缀，转为snake_case）
        filename = file_path.stem  # 不带扩展名的文件名
        # 转为snake_case
        component_name = re.sub(r'([a-z])([A-Z])', r'\1_\2', filename).lower()
        component_name = component_name.replace('-', '_')
        return component_name

    def _calculate_logger_import_path(self, file_path: Path) -> str:
        """
        动态计算logger_client.js的相对导入路径

        Args:
            file_path: JS文件的绝对或相对路径

        Returns:
            相对导入路径，例如 '../global/logger_client.js' 或 './global/logger_client.js'
        """
        try:
            # 转换为绝对路径
            abs_file_path = file_path.resolve()
            abs_js_root = self.js_root.resolve()

            # 计算文件相对于js根目录的路径
            rel_path = abs_file_path.relative_to(abs_js_root)

            # 计算深度（不包括文件本身）
            # 例如：js/global/debug.js 的深度是1，js/multi_character_editor/editor.js 的深度是1
            depth = len(rel_path.parents) - 1

            if depth == 0:
                # 文件直接在js根目录下（极少见）
                return './global/logger_client.js'
            else:
                # 文件在子目录中，需要上溯depth层
                # 例如：depth=1 → '../global/logger_client.js'
                # depth=2 → '../../global/logger_client.js'
                prefix = '../' * depth
                return f'{prefix}global/logger_client.js'

        except ValueError:
            # 文件不在js_root下，使用默认值
            log_warning(f"⚠️ 文件 {file_path} 不在JS根目录 {self.js_root} 下，使用默认路径")
            return '../global/logger_client.js'

    def _add_logger_import(self, content: str, component_name: str, file_path: Path) -> str:
        """添加logger导入语句"""
        # 动态计算logger_client.js的导入路径
        logger_import_path = self._calculate_logger_import_path(file_path)

        # 查找import语句的位置
        import_pattern = r'^import\s+.*?from\s+[\'"].*?[\'"];?\s*$'
        import_matches = list(re.finditer(import_pattern, content, re.MULTILINE))

        if import_matches:
            # 在最后一个import语句后插入
            last_import = import_matches[-1]
            insert_pos = last_import.end()

            logger_import = f"\nimport {{ createLogger }} from '{logger_import_path}';\n\n// 创建logger实例\nconst logger = createLogger('{component_name}');\n"

            content = content[:insert_pos] + logger_import + content[insert_pos:]
        else:
            # 如果没有import语句，在文件开头插入
            # 跳过文件头部的注释和空白行
            comment_pattern = r'^(?:/\*[\s\S]*?\*/\s*|//.*\n)*'
            match = re.match(comment_pattern, content)
            if match:
                insert_pos = match.end()
                # 确保在注释后插入import前有换行
                logger_import = f"\nimport {{ createLogger }} from '{logger_import_path}';\n\n// 创建logger实例\nconst logger = createLogger('{component_name}');\n\n"
            else:
                insert_pos = 0
                logger_import = f"import {{ createLogger }} from '{logger_import_path}';\n\n// 创建logger实例\nconst logger = createLogger('{component_name}');\n\n"

            content = content[:insert_pos] + logger_import + content[insert_pos:]

        return content

    def process_directory(self, dir_path: Path) -> None:
        """递归处理目录中的所有JS文件"""
        # 收集所有JS文件，排除logger_client.js本身
        all_js_files = list(dir_path.rglob('*.js'))
        js_files = [f for f in all_js_files if 'logger_client.js' not in f.name]

        if not js_files:
            log_warning(f"⚠️ 目录 {dir_path} 中没有找到JS文件")
            return

        total_files = len(js_files)
        log_info(f"📂 找到 {total_files} 个JS文件（已排除logger_client.js）")
        log_info("")

        for idx, js_file in enumerate(js_files, 1):
            # 进度显示
            progress = f"[{idx}/{total_files}]"
            log_info(f"{progress} 处理: {js_file.relative_to(dir_path)}")

            self.stats['files_processed'] += 1
            modified, info = self.process_file(js_file)

            if modified:
                log_info(f"  ✅ {info}")
            else:
                log_debug(f"  ⊘  {info}")

            log_info("")  # 空行分隔

    def print_summary(self) -> None:
        """打印替换统计报告"""
        log_info("=" * 70)
        log_info("📊 替换统计报告")
        log_info("=" * 70)
        log_info(f"处理文件总数: {self.stats['files_processed']}")
        log_info(f"修改文件数量: {self.stats['files_modified']}")
        log_info(f"跳过文件数量: {self.stats['files_skipped']}")
        log_info(f"添加导入语句: {self.stats['imports_added']}")
        log_info("")
        log_info("替换详情:")
        log_info(f"  console.log   → logger.info : {self.stats['console_log_replaced']} 处")
        log_info(f"  console.error → logger.error: {self.stats['console_error_replaced']} 处")
        log_info(f"  console.warn  → logger.warn : {self.stats['console_warn_replaced']} 处")
        log_info(f"  console.debug → logger.debug: {self.stats['console_debug_replaced']} 处")

        total_replacements = (
            self.stats['console_log_replaced'] +
            self.stats['console_error_replaced'] +
            self.stats['console_warn_replaced'] +
            self.stats['console_debug_replaced']
        )
        log_info(f"\n总替换数: {total_replacements} 处")
        log_info("=" * 70)


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(
        description="批量替换JS文件中的console调用为logger系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        'path',
        type=str,
        help='要处理的文件或目录路径'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='预览模式，不实际修改文件'
    )
    parser.add_argument(
        '--js-root',
        type=str,
        default=None,
        help='JS文件的根目录，用于计算logger导入的相对路径（默认：tools/../js）'
    )

    args = parser.parse_args()

    # 解析路径
    target_path = Path(args.path)
    if not target_path.exists():
        log_error(f"❌ 路径不存在: {target_path}")
        sys.exit(1)

    # 解析js_root路径
    js_root = Path(args.js_root) if args.js_root else None

    # 创建替换器
    replacer = ConsoleToLoggerReplacer(dry_run=args.dry_run, js_root=js_root)

    # 打印模式信息
    if args.dry_run:
        log_info("🔍 运行模式: 预览（不会修改文件）")
    else:
        log_info("✏️  运行模式: 实际修改文件")

    log_info("=" * 70)

    # 处理文件或目录
    if target_path.is_file():
        if target_path.suffix != '.js':
            log_error(f"❌ 不是JavaScript文件: {target_path}")
            sys.exit(1)

        log_info(f"📄 处理单个文件: {target_path}")
        replacer.stats['files_processed'] += 1
        modified, info = replacer.process_file(target_path)

        if modified:
            log_info(f"✅ {info}")
        else:
            log_info(f"⊘ {info}")

    elif target_path.is_dir():
        log_info(f"📂 处理目录: {target_path}")
        replacer.process_directory(target_path)

    # 打印统计报告
    replacer.print_summary()

    if args.dry_run:
        log_info("\n💡 提示: 这是预览模式，文件未被修改。移除 --dry-run 参数以实际修改文件。")


if __name__ == "__main__":
    main()
