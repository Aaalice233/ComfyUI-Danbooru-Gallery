"""
Translation data loader
Loads and integrates translation data from multiple sources
"""

import json
import csv
from pathlib import Path
from typing import Dict, Optional, List, Set


class TranslationLoader:
    """Load and manage translation data"""

    def __init__(self, zh_cn_dir: Optional[str] = None):
        """
        Initialize translation loader

        Args:
            zh_cn_dir: Path to zh_cn directory (auto-detect if None)
        """
        if zh_cn_dir is None:
            # Auto-detect zh_cn directory
            # From py/global/translation to py/ then to danbooru_gallery/zh_cn
            current_dir = Path(__file__).parent  # py/global/translation
            py_dir = current_dir.parent.parent   # py/
            zh_cn_dir = py_dir / "danbooru_gallery" / "zh_cn"

        self.zh_cn_dir = Path(zh_cn_dir)

        # Translation mappings
        self.en_to_cn: Dict[str, str] = {}  # English -> Chinese
        self.cn_to_en: Dict[str, str] = {}  # Chinese -> English

        # Loaded flag
        self._loaded = False

    def _normalize_tag(self, tag: str) -> str:
        """Normalize tag name (lowercase, strip)"""
        return tag.lower().strip()

    def _load_json_translations(self):
        """Load translations from all_tags_cn.json"""
        json_file = self.zh_cn_dir / "all_tags_cn.json"

        if not json_file.exists():
            print(f"[Translation] ⚠️ File not found: {json_file}")
            return

        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            for en_tag, cn_trans in data.items():
                en_tag_norm = self._normalize_tag(en_tag)
                cn_trans_norm = cn_trans.strip()

                self.en_to_cn[en_tag_norm] = cn_trans_norm
                # Also add reverse mapping
                if cn_trans_norm:
                    self.cn_to_en[cn_trans_norm] = en_tag_norm

            print(f"[Translation] ✓ Loaded {len(data)} translations from JSON")

        except Exception as e:
            print(f"[Translation] ❌ Error loading JSON: {e}")

    def _load_csv_translations(self, csv_file: Path, reverse: bool = False):
        """
        Load translations from CSV file

        Args:
            csv_file: Path to CSV file
            reverse: If True, first column is CN, second is EN
        """
        if not csv_file.exists():
            print(f"[Translation] ⚠️ File not found: {csv_file}")
            return

        try:
            count = 0
            with open(csv_file, 'r', encoding='utf-8-sig') as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) < 2:
                        continue

                    if reverse:
                        # Chinese, English
                        cn_trans = row[0].strip()
                        en_tag = self._normalize_tag(row[1])
                    else:
                        # English, Chinese
                        en_tag = self._normalize_tag(row[0])
                        cn_trans = row[1].strip()

                    if en_tag and cn_trans:
                        # Don't overwrite existing translations
                        if en_tag not in self.en_to_cn:
                            self.en_to_cn[en_tag] = cn_trans
                        if cn_trans not in self.cn_to_en:
                            self.cn_to_en[cn_trans] = en_tag
                        count += 1

            print(f"[Translation] ✓ Loaded {count} translations from {csv_file.name}")

        except Exception as e:
            print(f"[Translation] ❌ Error loading CSV {csv_file.name}: {e}")

    def load_all(self):
        """Load all translation files"""
        if self._loaded:
            return

        print(f"[Translation] 📚 Loading translation data from {self.zh_cn_dir}...")

        # Load in priority order (later sources don't overwrite earlier ones)
        self._load_json_translations()
        self._load_csv_translations(self.zh_cn_dir / "danbooru.csv", reverse=False)
        self._load_csv_translations(self.zh_cn_dir / "wai_characters.csv", reverse=True)

        self._loaded = True
        print(f"[Translation] ✅ Total: {len(self.en_to_cn)} EN->CN, {len(self.cn_to_en)} CN->EN")

    def get_chinese(self, english_tag: str) -> Optional[str]:
        """
        Get Chinese translation for English tag

        Args:
            english_tag: English tag name

        Returns:
            Chinese translation or None
        """
        if not self._loaded:
            self.load_all()

        tag_norm = self._normalize_tag(english_tag)

        # Try exact match
        if tag_norm in self.en_to_cn:
            return self.en_to_cn[tag_norm]

        # Try with underscores replaced with spaces
        tag_space = tag_norm.replace('_', ' ')
        if tag_space in self.en_to_cn:
            return self.en_to_cn[tag_space]

        # Try with spaces replaced with underscores
        tag_under = tag_norm.replace(' ', '_')
        if tag_under in self.en_to_cn:
            return self.en_to_cn[tag_under]

        return None

    def get_english(self, chinese_text: str) -> Optional[str]:
        """
        Get English tag for Chinese text

        Args:
            chinese_text: Chinese text

        Returns:
            English tag or None
        """
        if not self._loaded:
            self.load_all()

        text_norm = chinese_text.strip()

        return self.cn_to_en.get(text_norm)

    def search_chinese(self, query: str, limit: int = 50) -> List[tuple[str, str]]:
        """
        Search Chinese translations by query

        Args:
            query: Search query (Chinese)
            limit: Maximum results

        Returns:
            List of (english_tag, chinese_translation) tuples
        """
        if not self._loaded:
            self.load_all()

        query_norm = query.strip().lower()
        results = []

        for cn_text, en_tag in self.cn_to_en.items():
            cn_lower = cn_text.lower()

            # Exact match
            if cn_lower == query_norm:
                results.append((en_tag, cn_text, 10))
            # Starts with
            elif cn_lower.startswith(query_norm):
                results.append((en_tag, cn_text, 8))
            # Contains
            elif query_norm in cn_lower:
                results.append((en_tag, cn_text, 4))

        # Sort by score descending
        results.sort(key=lambda x: x[2], reverse=True)

        # Return without score
        return [(en, cn) for en, cn, _ in results[:limit]]

    def add_translations_to_tags(self, tags: List[Dict]) -> List[Dict]:
        """
        Add Chinese translations to tag dictionaries

        Args:
            tags: List of tag dictionaries with 'tag' field

        Returns:
            List of tag dictionaries with 'translation_cn' field added
        """
        if not self._loaded:
            self.load_all()

        for tag_info in tags:
            tag_name = tag_info.get('tag', '')
            if tag_name:
                translation = self.get_chinese(tag_name)
                tag_info['translation_cn'] = translation

        return tags

    def get_stats(self) -> Dict:
        """Get translation statistics"""
        if not self._loaded:
            self.load_all()

        return {
            'en_to_cn_count': len(self.en_to_cn),
            'cn_to_en_count': len(self.cn_to_en),
            'loaded': self._loaded
        }


# Global translation loader instance
_translation_loader = None


def get_translation_loader() -> TranslationLoader:
    """Get global translation loader instance"""
    global _translation_loader
    if _translation_loader is None:
        _translation_loader = TranslationLoader()
    return _translation_loader


def test_translation_loader():
    """Test the translation loader"""
    loader = TranslationLoader()
    loader.load_all()

    # Test EN -> CN
    print("\nTest EN -> CN:")
    test_tags = ["1girl", "solo", "long_hair", "white_hair", "red_eyes"]
    for tag in test_tags:
        cn = loader.get_chinese(tag)
        print(f"  {tag} -> {cn}")

    # Test CN -> EN
    print("\nTest CN -> EN:")
    test_cn = ["1个女孩", "独自", "长发"]
    for cn in test_cn:
        en = loader.get_english(cn)
        print(f"  {cn} -> {en}")

    # Test search
    print("\nTest CN search:")
    results = loader.search_chinese("白发", limit=5)
    for en, cn in results:
        print(f"  {en} -> {cn}")

    # Test stats
    print("\nStats:")
    stats = loader.get_stats()
    print(f"  EN->CN: {stats['en_to_cn_count']}")
    print(f"  CN->EN: {stats['cn_to_en_count']}")


if __name__ == "__main__":
    test_translation_loader()
