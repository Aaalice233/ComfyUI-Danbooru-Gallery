#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
临时脚本：重新安装Krita插件（强制覆盖）
运行此脚本会调用ComfyUI的API来安装最新版本的Krita插件
"""

import requests
import json
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

def reinstall_plugin():
    """调用ComfyUI API重新安装Krita插件"""
    api_url = "http://127.0.0.1:8188/open_in_krita/reinstall_plugin"

    logger.info("正在调用API重新安装Krita插件...")
    logger.info(f"[Reinstall] API URL: {api_url}")

    try:
        response = requests.post(api_url, json={})

        if response.status_code == 200:
            data = response.json()
            status = data.get("status")
            message = data.get("message")
            pykrita_dir = data.get("pykrita_dir")
            version = data.get("version")

            if status == "success":
                logger.info(f"[OK] 成功: {message}")
                logger.info(f"插件目录: {pykrita_dir}")
                logger.info(f"版本: {version}")
                logger.info("[!] 请重启Krita以加载最新插件！")
                return True
            else:
                logger.error(f"[ERROR] 失败: {message}")
                return False
        else:
            logger.error(f"[ERROR] API调用失败: HTTP {response.status_code}")
            logger.info(f"响应内容: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        logger.info("[ERROR] 无法连接到ComfyUI (http://127.0.0.1:8188)")
        logger.info("请确保ComfyUI正在运行！")
        return False
    except Exception as e:
        logger.error(f"[ERROR] 异常: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Krita插件重新安装工具")
    logger.info("=" * 60)
    reinstall_plugin()
    logger.info("=" * 60)
