"""
文本缓存管理器 API 端点（扩展）
Text Cache Manager API Endpoints (Extensions)

只包含新增的API端点，避免与现有API冲突
"""

import json
import time
from aiohttp import web
from server import PromptServer
from .text_cache_manager import text_cache_manager
from ..utils.logger import get_logger

logger = get_logger(__name__)

def setup_text_cache_api():
    """
    设置文本缓存相关的扩展API端点
    包含工作流扫描和批量通道预注册功能
    注意：只注册新增的API端点，避免与现有API冲突
    """

    @PromptServer.instance.routes.post("/danbooru/text_cache/batch_ensure_channels")
    async def batch_ensure_text_cache_channels(request):
        """
        批量确保文本缓存通道存在的API端点
        用于工作流扫描后的批量预注册
        """
        try:
            data = await request.json()
            channel_names = data.get("channel_names", [])
            if not isinstance(channel_names, list):
                channel_names = [channel_names]

            logger.info(f"[TextCacheAPI] 开始批量预注册通道: {channel_names}")
            start_time = time.time()

            results = []
            success_count = 0
            failed_channels = []

            for channel_name in channel_names:
                try:
                    success = text_cache_manager.ensure_channel_exists(channel_name)
                    if success:
                        success_count += 1
                        logger.info(f"[TextCacheAPI] ✅ 通道预注册成功: {channel_name}")
                    else:
                        failed_channels.append(channel_name)
                        logger.error(f"[TextCacheAPI] ❌ 通道预注册失败: {channel_name}")

                    results.append({
                        "channel_name": channel_name,
                        "success": success
                    })
                except Exception as e:
                    failed_channels.append(channel_name)
                    logger.error(f"[TextCacheAPI] ❌ 通道预注册异常: {channel_name}, 错误: {e}")
                    results.append({
                        "channel_name": channel_name,
                        "success": False,
                        "error": str(e)
                    })

            duration = time.time() - start_time
            logger.info(f"[TextCacheAPI] 批量预注册完成: 成功{success_count}/{len(channel_names)}, 耗时{duration:.2f}s")

            return web.json_response({
                "status": "success",
                "total_channels": len(channel_names),
                "success_count": success_count,
                "failed_count": len(failed_channels),
                "failed_channels": failed_channels,
                "duration": round(duration, 2),
                "results": results
            })

        except Exception as e:
            logger.error(f"[TextCacheAPI] batch_ensure_channels 异常: {e}")
            return web.json_response({
                "status": "error",
                "error": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/danbooru/text_cache/scan_workflow")
    async def scan_workflow_channels(request):
        """
        扫描当前工作流中的所有文本缓存保存节点
        返回发现的通道名称列表
        """
        try:
            # 这里我们需要获取当前工作流的数据
            # ComfyUI的工作流数据存储在app.graph中，但这在服务器端不容易直接访问

            # 作为替代方案，我们接收前端传来的工作流数据
            data = await request.json()
            workflow_data = data.get("workflow", {})

            logger.info("[TextCacheAPI] 开始扫描工作流中的文本缓存保存节点")

            found_channels = []
            found_nodes = []

            # 遍历工作流中的所有节点
            nodes = workflow_data.get("nodes", [])
            for node in nodes:
                # 检查是否为GlobalTextCacheSave节点
                node_class = node.get("class_type", "")
                if node_class == "GlobalTextCacheSave":
                    # 获取节点的通道名称widget值
                    widgets_values = node.get("widgets_values", [])
                    if widgets_values:
                        # GlobalTextCacheSave的widget顺序：channel_name, monitor_node_id, monitor_widget_name
                        channel_name = widgets_values[0] if len(widgets_values) > 0 else "default"

                        if channel_name and channel_name.strip():
                            found_channels.append(channel_name)
                            found_nodes.append({
                                "id": node.get("id", "unknown"),
                                "title": node.get("title", "GlobalTextCacheSave"),
                                "channel_name": channel_name
                            })
                            logger.info(f"[TextCacheAPI] 发现文本缓存保存节点: ID={node.get('id')}, 通道={channel_name}")

            # 去重通道列表
            unique_channels = list(set(found_channels))

            logger.info(f"[TextCacheAPI] 工作流扫描完成: 发现{len(found_nodes)}个节点, {len(unique_channels)}个唯一通道")

            return web.json_response({
                "status": "success",
                "total_nodes": len(found_nodes),
                "unique_channels": unique_channels,
                "found_nodes": found_nodes
            })

        except Exception as e:
            logger.error(f"[TextCacheAPI] scan_workflow_channels 异常: {e}")
            return web.json_response({
                "status": "error",
                "error": str(e)
            }, status=500)

    @PromptServer.instance.routes.post("/danbooru/text_cache/sync_workflow_channels")
    async def sync_workflow_channels(request):
        """
        同步工作流通道到后端的完整流程：
        1. 扫描工作流中的Save节点
        2. 批量预注册发现的通道
        3. 返回同步结果
        """
        try:
            data = await request.json()
            workflow_data = data.get("workflow", {})

            logger.info("[TextCacheAPI] 开始工作流通道同步流程")
            start_time = time.time()

            # 步骤1: 扫描工作流
            nodes = workflow_data.get("nodes", [])
            found_channels = []
            found_nodes = []

            for node in nodes:
                node_class = node.get("class_type", "")
                if node_class == "GlobalTextCacheSave":
                    widgets_values = node.get("widgets_values", [])
                    if widgets_values:
                        channel_name = widgets_values[0] if len(widgets_values) > 0 else "default"
                        if channel_name and channel_name.strip():
                            found_channels.append(channel_name)
                            found_nodes.append({
                                "id": node.get("id", "unknown"),
                                "title": node.get("title", "GlobalTextCacheSave"),
                                "channel_name": channel_name
                            })

            unique_channels = list(set(found_channels))
            logger.info(f"[TextCacheAPI] 步骤1完成: 发现{len(found_nodes)}个节点, {len(unique_channels)}个唯一通道")

            # 步骤2: 批量预注册通道
            success_count = 0
            failed_channels = []

            for channel_name in unique_channels:
                try:
                    success = text_cache_manager.ensure_channel_exists(channel_name)
                    if success:
                        success_count += 1
                    else:
                        failed_channels.append(channel_name)
                except Exception as e:
                    failed_channels.append(channel_name)
                    logger.error(f"[TextCacheAPI] 通道预注册异常: {channel_name}, 错误: {e}")

            # 步骤3: 返回同步结果
            total_time = time.time() - start_time
            logger.info(f"[TextCacheAPI] 工作流通道同步完成: 成功{success_count}/{len(unique_channels)}, 耗时{total_time:.2f}s")

            return web.json_response({
                "status": "success",
                "sync_result": {
                    "total_nodes_found": len(found_nodes),
                    "unique_channels_found": len(unique_channels),
                    "successful_registrations": success_count,
                    "failed_registrations": len(failed_channels),
                    "failed_channels": failed_channels,
                    "sync_duration": round(total_time, 2),
                    "found_nodes": found_nodes
                },
                "message": f"工作流通道同步完成: {success_count}/{len(unique_channels)} 通道已注册"
            })

        except Exception as e:
            logger.error(f"[TextCacheAPI] sync_workflow_channels 异常: {e}")
            return web.json_response({
                "status": "error",
                "error": str(e)
            }, status=500)

    logger.info("[TextCacheAPI] 文本缓存扩展API端点已注册")

if __name__ == "__main__":
    setup_text_cache_api()