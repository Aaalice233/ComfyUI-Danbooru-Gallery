"""
配置管理器
Configuration Manager

提供config.json的读取和更新功能
"""

import json
import os
from pathlib import Path
from ..utils.logger import get_logger

logger = get_logger(__name__)

class ConfigManager:
    """配置管理器类"""
    
    def __init__(self):
        # 获取插件根目录（当前文件在 py/utils/，需要向上两级）
        self.plugin_root = Path(__file__).parent.parent.parent
        self.config_path = self.plugin_root / "config.json"
        self._config_cache = None
        logger.info(f"[ConfigManager] 初始化，配置文件路径: {self.config_path}")
    
    def _load_config(self):
        """加载配置文件"""
        try:
            if not self.config_path.exists():
                logger.warning(f"[ConfigManager] 配置文件不存在: {self.config_path}")
                return {}
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logger.info(f"[ConfigManager] ✅ 配置文件加载成功")
                return config
        except json.JSONDecodeError as e:
            logger.error(f"[ConfigManager] ❌ 配置文件JSON格式错误: {e}")
            return {}
        except Exception as e:
            logger.error(f"[ConfigManager] ❌ 配置文件加载失败: {e}")
            return {}
    
    def _save_config(self, config):
        """保存配置文件"""
        try:
            # 确保目录存在
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # 保存配置（带缩进的格式化JSON）
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            # 更新缓存
            self._config_cache = config
            logger.info(f"[ConfigManager] ✅ 配置文件保存成功")
            return True
        except Exception as e:
            logger.error(f"[ConfigManager] ❌ 配置文件保存失败: {e}")
            return False
    
    def get_value(self, path, default=None):
        """
        获取配置项的值
        
        Args:
            path: 配置路径，使用点号分隔，如 "ui.show_toast_notifications"
            default: 默认值
        
        Returns:
            配置值或默认值
        """
        try:
            config = self._load_config()
            
            # 按点号分割路径
            keys = path.split('.')
            value = config
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    logger.info(f"[ConfigManager] 配置项不存在: {path}，使用默认值: {default}")
                    return default
            
            logger.info(f"[ConfigManager] 获取配置项: {path} = {value}")
            return value
        except Exception as e:
            logger.error(f"[ConfigManager] ❌ 获取配置项失败: {path}, 错误: {e}")
            return default
    
    def set_value(self, path, value):
        """
        设置配置项的值
        
        Args:
            path: 配置路径，使用点号分隔，如 "ui.show_toast_notifications"
            value: 要设置的值
        
        Returns:
            bool: 是否成功
        """
        try:
            config = self._load_config()
            
            # 按点号分割路径
            keys = path.split('.')
            
            # 递归创建嵌套字典
            current = config
            for i, key in enumerate(keys[:-1]):
                if key not in current:
                    current[key] = {}
                elif not isinstance(current[key], dict):
                    # 如果中间路径不是字典，覆盖为字典
                    current[key] = {}
                current = current[key]
            
            # 设置最终值
            final_key = keys[-1]
            current[final_key] = value
            
            # 保存配置
            success = self._save_config(config)
            if success:
                logger.info(f"[ConfigManager] ✅ 设置配置项: {path} = {value}")
            return success
        except Exception as e:
            logger.error(f"[ConfigManager] ❌ 设置配置项失败: {path}, 错误: {e}")
            return False
    
    def get_all(self):
        """获取全部配置"""
        return self._load_config()


# 全局单例
config_manager = ConfigManager()
