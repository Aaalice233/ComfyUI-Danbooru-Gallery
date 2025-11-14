"""
配置管理API端点
Configuration Management API Endpoints

提供config.json的读取和更新HTTP接口
"""

from aiohttp import web
from server import PromptServer
from .config_manager import config_manager
from .logger import get_logger

logger = get_logger(__name__)

def setup_config_api():
    """设置配置管理API端点"""
    
    @PromptServer.instance.routes.get("/danbooru/config/get")
    async def get_config_value(request):
        """
        获取配置项的值
        
        Query参数:
            path: 配置路径，如 "ui.show_toast_notifications"
            default: 默认值（可选）
        
        响应:
            {
                "success": true,
                "path": "ui.show_toast_notifications",
                "value": true
            }
        """
        try:
            path = request.query.get('path')
            if not path:
                return web.json_response({
                    "success": False,
                    "error": "缺少path参数"
                }, status=400)
            
            default_value = request.query.get('default')
            # 尝试解析default为JSON值
            if default_value is not None:
                try:
                    import json
                    default_value = json.loads(default_value)
                except:
                    pass  # 保持字符串值
            
            value = config_manager.get_value(path, default=default_value)
            
            logger.info(f"[ConfigAPI] GET 配置项: {path} = {value}")
            
            return web.json_response({
                "success": True,
                "path": path,
                "value": value
            })
        
        except Exception as e:
            logger.error(f"[ConfigAPI] ❌ GET配置失败: {e}")
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    @PromptServer.instance.routes.post("/danbooru/config/update")
    async def update_config_value(request):
        """
        更新配置项的值
        
        POST Body:
            {
                "path": "ui.show_toast_notifications",
                "value": false
            }
        
        响应:
            {
                "success": true,
                "message": "配置已更新",
                "path": "ui.show_toast_notifications",
                "value": false
            }
        """
        try:
            data = await request.json()
            path = data.get('path')
            value = data.get('value')
            
            if not path:
                return web.json_response({
                    "success": False,
                    "error": "缺少path参数"
                }, status=400)
            
            if value is None:
                return web.json_response({
                    "success": False,
                    "error": "缺少value参数"
                }, status=400)
            
            success = config_manager.set_value(path, value)
            
            if success:
                logger.info(f"[ConfigAPI] ✅ 更新配置: {path} = {value}")
                return web.json_response({
                    "success": True,
                    "message": "配置已更新",
                    "path": path,
                    "value": value
                })
            else:
                logger.error(f"[ConfigAPI] ❌ 更新配置失败: {path}")
                return web.json_response({
                    "success": False,
                    "error": "配置更新失败"
                }, status=500)
        
        except Exception as e:
            logger.error(f"[ConfigAPI] ❌ 更新配置异常: {e}")
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    @PromptServer.instance.routes.get("/danbooru/config/all")
    async def get_all_config(request):
        """
        获取全部配置
        
        响应:
            {
                "success": true,
                "config": { ... }
            }
        """
        try:
            config = config_manager.get_all()
            
            logger.info(f"[ConfigAPI] GET 全部配置")
            
            return web.json_response({
                "success": True,
                "config": config
            })
        
        except Exception as e:
            logger.error(f"[ConfigAPI] ❌ GET全部配置失败: {e}")
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    logger.info("[ConfigAPI] 配置管理API端点已注册")
