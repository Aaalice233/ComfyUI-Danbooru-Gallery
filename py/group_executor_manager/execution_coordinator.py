"""
全局执行协调器 - Global Execution Coordinator
负责协调所有组执行请求，确保单一执行语义和防止重复执行
"""

import json
import time
import hashlib
import threading
from typing import Dict, List, Optional, Tuple
from ..utils.logger import get_logger

logger = get_logger(__name__)


class ExecutionHistoryEntry:
    """执行历史记录条目"""
    def __init__(self, execution_id: str, config_hash: str, timestamp: float):
        self.execution_id = execution_id
        self.config_hash = config_hash
        self.timestamp = timestamp
        self.status = "pending"  # pending, running, completed, failed, cancelled


class GlobalExecutionCoordinator:
    """
    全局执行协调器
    
    职责：
    1. 生成稳定的execution_id（基于配置哈希）
    2. 检测重复请求（5秒内相同配置）
    3. 管理执行权限（全局互斥锁）
    4. 维护执行历史记录
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """单例模式"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """初始化协调器"""
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        
        # 核心属性
        self.current_execution_id: Optional[str] = None
        self.execution_lock = threading.Lock()
        
        # 执行历史（用于去重）
        self.execution_history: Dict[str, ExecutionHistoryEntry] = {}
        self.history_lock = threading.Lock()
        
        # 配置缓存
        self.last_config_hash: Optional[str] = None
        self.last_request_time: float = 0
        
        # 限制
        self.max_history_entries = 1000
        self.duplicate_detection_window = 5.0  # 5秒内重复请求检测窗口
        
        logger.info("[GlobalExecutionCoordinator] ✅ 全局执行协调器已初始化")
    
    def generate_stable_execution_id(self, config_data: List[Dict]) -> Tuple[str, str]:
        """
        基于配置内容生成稳定的execution_id
        
        Args:
            config_data: 组配置数据列表
            
        Returns:
            (execution_id, config_hash) 元组
        """
        try:
            # 序列化配置（排序键确保一致性）
            config_str = json.dumps(config_data, sort_keys=True, ensure_ascii=False)
            
            # 计算SHA256哈希
            config_hash = hashlib.sha256(config_str.encode('utf-8')).hexdigest()
            
            # 截取前16位作为短哈希
            short_hash = config_hash[:16]
            
            # 生成execution_id: exec_hash_{short_hash}_t_{timestamp}
            timestamp = int(time.time() * 1000)  # 毫秒级时间戳
            execution_id = f"exec_hash_{short_hash}_t_{timestamp}"
            
            logger.debug(f"[GlobalExecutionCoordinator] 📝 生成execution_id: {execution_id}")
            logger.debug(f"[GlobalExecutionCoordinator] 🔑 配置哈希: {config_hash}")
            
            return execution_id, config_hash
            
        except Exception as e:
            logger.error(f"[GlobalExecutionCoordinator] ❌ 生成execution_id失败: {e}")
            # 回退到时间戳方案
            fallback_id = f"exec_fallback_{int(time.time())}_{id(config_data)}"
            return fallback_id, ""
    
    def is_duplicate_request(self, config_hash: str, execution_id: str) -> Tuple[bool, str]:
        """
        检测是否为重复请求
        
        Args:
            config_hash: 配置哈希值
            execution_id: 执行ID
            
        Returns:
            (is_duplicate, reason) 元组
        """
        current_time = time.time()
        
        with self.history_lock:
            # 检查1: 是否有正在执行的任务
            if self.current_execution_id is not None:
                # 检查是否是同一个execution_id（续传场景）
                if self.current_execution_id == execution_id:
                    logger.debug(f"[GlobalExecutionCoordinator] ✅ 续传执行: {execution_id}")
                    return False, ""
                else:
                    logger.warning(f"[GlobalExecutionCoordinator] 🚫 拒绝：已有执行任务正在进行")
                    logger.warning(f"   当前执行: {self.current_execution_id}")
                    logger.warning(f"   新请求: {execution_id}")
                    return True, f"已有执行任务正在进行: {self.current_execution_id}"
            
            # 检查2: 时间窗口内的重复配置
            if config_hash == self.last_config_hash:
                time_since_last = current_time - self.last_request_time
                if time_since_last < self.duplicate_detection_window:
                    logger.warning(f"[GlobalExecutionCoordinator] 🚫 拒绝：重复请求")
                    logger.warning(f"   配置哈希: {config_hash}")
                    logger.warning(f"   距上次请求: {time_since_last:.2f}秒")
                    logger.warning(f"   检测窗口: {self.duplicate_detection_window}秒")
                    return True, f"重复请求（{time_since_last:.1f}秒前刚提交，请等待）"
            
            # 检查3: 历史记录中是否有running状态的相同配置
            for entry in self.execution_history.values():
                if entry.config_hash == config_hash and entry.status == "running":
                    logger.warning(f"[GlobalExecutionCoordinator] 🚫 拒绝：相同配置正在执行")
                    logger.warning(f"   执行ID: {entry.execution_id}")
                    return True, f"相同配置正在执行: {entry.execution_id}"
            
            # 更新最近请求记录
            self.last_config_hash = config_hash
            self.last_request_time = current_time
            
            logger.info(f"[GlobalExecutionCoordinator] ✅ 通过重复检测: {execution_id}")
            return False, ""
    
    def acquire_execution_permission(self, execution_id: str, config_hash: str) -> bool:
        """
        尝试获取执行权限
        
        Args:
            execution_id: 执行ID
            config_hash: 配置哈希
            
        Returns:
            是否成功获取权限
        """
        with self.execution_lock:
            # 检查是否已有执行任务
            if self.current_execution_id is not None and self.current_execution_id != execution_id:
                logger.warning(f"[GlobalExecutionCoordinator] 🔒 获取权限失败：锁已被占用")
                logger.warning(f"   当前持有者: {self.current_execution_id}")
                logger.warning(f"   请求者: {execution_id}")
                return False
            
            # 获取权限
            self.current_execution_id = execution_id
            
            # 记录到历史
            with self.history_lock:
                self.execution_history[execution_id] = ExecutionHistoryEntry(
                    execution_id=execution_id,
                    config_hash=config_hash,
                    timestamp=time.time()
                )
                self.execution_history[execution_id].status = "running"
                
                # 清理过期历史记录
                self._cleanup_history()
            
            logger.info(f"[GlobalExecutionCoordinator] 🔓 获取执行权限成功: {execution_id}")
            return True
    
    def release_execution_permission(self, execution_id: str, status: str = "completed"):
        """
        释放执行权限
        
        Args:
            execution_id: 执行ID
            status: 最终状态（completed, failed, cancelled）
        """
        with self.execution_lock:
            if self.current_execution_id == execution_id:
                self.current_execution_id = None
                logger.info(f"[GlobalExecutionCoordinator] 🔓 释放执行权限: {execution_id} (状态: {status})")
            else:
                logger.warning(f"[GlobalExecutionCoordinator] ⚠️ 释放权限失败：execution_id不匹配")
                logger.warning(f"   当前持有者: {self.current_execution_id}")
                logger.warning(f"   请求释放: {execution_id}")
        
        # 更新历史状态
        with self.history_lock:
            if execution_id in self.execution_history:
                self.execution_history[execution_id].status = status
    
    def cancel_all_pending(self):
        """取消所有待处理的请求"""
        with self.history_lock:
            cancelled_count = 0
            for entry in self.execution_history.values():
                if entry.status == "pending":
                    entry.status = "cancelled"
                    cancelled_count += 1
            
            if cancelled_count > 0:
                logger.info(f"[GlobalExecutionCoordinator] 🛑 已取消 {cancelled_count} 个待处理请求")
    
    def get_execution_status(self, execution_id: str) -> Optional[str]:
        """
        获取执行状态
        
        Args:
            execution_id: 执行ID
            
        Returns:
            状态字符串或None
        """
        with self.history_lock:
            entry = self.execution_history.get(execution_id)
            return entry.status if entry else None
    
    def _cleanup_history(self):
        """清理过期的历史记录（内部方法，需要持有history_lock）"""
        if len(self.execution_history) <= self.max_history_entries:
            return
        
        # 按时间戳排序，保留最新的记录
        sorted_entries = sorted(
            self.execution_history.items(),
            key=lambda x: x[1].timestamp,
            reverse=True
        )
        
        # 保留最新的max_history_entries条记录
        self.execution_history = dict(sorted_entries[:self.max_history_entries])
        
        logger.debug(f"[GlobalExecutionCoordinator] 🧹 清理历史记录，保留 {self.max_history_entries} 条")
    
    def force_release_all(self):
        """强制释放所有锁（用于紧急恢复）"""
        with self.execution_lock:
            if self.current_execution_id:
                logger.warning(f"[GlobalExecutionCoordinator] ⚠️ 强制释放锁: {self.current_execution_id}")
                self.current_execution_id = None
        
        with self.history_lock:
            for entry in self.execution_history.values():
                if entry.status == "running":
                    entry.status = "cancelled"
        
        logger.warning("[GlobalExecutionCoordinator] 🛑 强制释放所有锁完成")
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        with self.history_lock:
            total = len(self.execution_history)
            status_counts = {}
            
            for entry in self.execution_history.values():
                status = entry.status
                status_counts[status] = status_counts.get(status, 0) + 1
            
            return {
                "total_executions": total,
                "current_execution": self.current_execution_id,
                "status_counts": status_counts,
                "last_config_hash": self.last_config_hash,
                "last_request_time": self.last_request_time
            }


# 全局单例实例
_global_coordinator = GlobalExecutionCoordinator()


def get_coordinator() -> GlobalExecutionCoordinator:
    """获取全局协调器实例"""
    return _global_coordinator
