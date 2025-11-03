#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
临时脚本：重新安装Krita插件（强制覆盖）
运行此脚本会调用ComfyUI的API来安装最新版本的Krita插件
"""

import requests
import json

def reinstall_plugin():
    """调用ComfyUI API重新安装Krita插件"""
    api_url = "http://127.0.0.1:8188/open_in_krita/reinstall_plugin"

    print("[Reinstall] 正在调用API重新安装Krita插件...")
    print(f"[Reinstall] API URL: {api_url}")

    try:
        response = requests.post(api_url, json={})

        if response.status_code == 200:
            data = response.json()
            status = data.get("status")
            message = data.get("message")
            pykrita_dir = data.get("pykrita_dir")
            version = data.get("version")

            if status == "success":
                print(f"[Reinstall] [OK] 成功: {message}")
                print(f"[Reinstall] 插件目录: {pykrita_dir}")
                print(f"[Reinstall] 版本: {version}")
                print("[Reinstall] [!] 请重启Krita以加载最新插件！")
                return True
            else:
                print(f"[Reinstall] [ERROR] 失败: {message}")
                return False
        else:
            print(f"[Reinstall] [ERROR] API调用失败: HTTP {response.status_code}")
            print(f"[Reinstall] 响应内容: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("[Reinstall] [ERROR] 无法连接到ComfyUI (http://127.0.0.1:8188)")
        print("[Reinstall] 请确保ComfyUI正在运行！")
        return False
    except Exception as e:
        print(f"[Reinstall] [ERROR] 异常: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Krita插件重新安装工具")
    print("=" * 60)
    reinstall_plugin()
    print("=" * 60)
