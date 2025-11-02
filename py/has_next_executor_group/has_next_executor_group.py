"""
后续执行组是否有效节点 (Has Next Executor Group)
检测组执行管理器中当前组之后是否还有待执行的组
"""

import json
import os

# 全局变量：存储组内节点都被禁用的组列表（由前端扩展自动同步）
_disabled_node_groups = set()


class HasNextExecutorGroup:
    """
    后续执行组是否有效节点
    与组执行管理器联动,判断当前执行组之后是否还有下一个组会被执行
    """

    RETURN_TYPES = ("STRING", "BOOLEAN")
    RETURN_NAMES = ("next_groups", "has_next")
    FUNCTION = "check_next_group"
    CATEGORY = "danbooru"
    OUTPUT_NODE = False
    OUTPUT_IS_LIST = (False, False)

    DESCRIPTION = (
        "检测组执行管理器配置中,当前执行组之后是否还有待执行的组。"
        "支持排除组配置,被排除的组不会被计入。"
        "注意:此节点仅检查组配置,不检查组内节点是否被静音/bypass。"
    )

    @classmethod
    def INPUT_TYPES(cls):
        """定义输入参数类型"""
        return {
            "required": {},
            "optional": {},
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        """
        总是执行,确保每次执行都能获取最新的组状态
        """
        import time
        return str(time.time())

    def check_next_group(self, unique_id=None):
        """
        检查是否有下一个执行组

        Returns:
            tuple: (next_groups: str, has_next: bool)
                - next_groups: 所有后续要执行的组名,每行一个
                - has_next: 是否还有下一个组
        """
        try:
            # 1. 获取当前正在执行的组名
            from ..image_cache_manager.image_cache_manager import cache_manager
            current_group = cache_manager.current_group_name

            print(f"\n[HasNextExecutorGroup] ┌─ 开始检测")
            print(f"[HasNextExecutorGroup] │  当前组: {current_group or '(未设置)'}")

            # 2. 获取组执行管理器的配置
            from ..group_executor_manager.group_executor_manager import get_group_config
            groups_config = get_group_config()

            print(f"[HasNextExecutorGroup] │  配置组数: {len(groups_config)}")

            # 3. 排除组配置已从工作流序列化中获取（前端维护）
            # 注意：排除组现在由前端通过 widget 管理，不再从 setting.json 读取
            excluded_groups = []
            print(f"[HasNextExecutorGroup] │  排除组数: {len(excluded_groups)}")
            if excluded_groups:
                print(f"[HasNextExecutorGroup] │  排除组: {', '.join(excluded_groups)}")

            # 4. 如果当前没有执行组或没有配置,返回False
            if not current_group or not groups_config:
                print(f"[HasNextExecutorGroup] └─ 结果: 无后续组 (当前组或配置为空)")
                return ("", False)

            # 5. 找到当前组在配置中的索引
            current_index = -1
            for i, group in enumerate(groups_config):
                if group.get('group_name') == current_group:
                    current_index = i
                    break

            # 6. 如果当前组不在配置中,返回False
            if current_index == -1:
                print(f"[HasNextExecutorGroup] └─ 结果: 无后续组 (当前组不在配置中)")
                return ("", False)

            # 7. 收集后续所有有效组(跳过排除组和被静音的组)
            next_groups = []
            for i in range(current_index + 1, len(groups_config)):
                group_name = groups_config[i].get('group_name', '')

                # 跳过排除组
                if group_name in excluded_groups:
                    print(f"[HasNextExecutorGroup] │  跳过排除组: {group_name}")
                    continue

                # 跳过组内节点都被禁用的组
                if group_name in _disabled_node_groups:
                    print(f"[HasNextExecutorGroup] │  跳过组内节点都被禁用的组: {group_name}")
                    continue

                # 跳过空组名
                if not group_name:
                    continue

                next_groups.append(group_name)

            # 8. 生成输出
            has_next = len(next_groups) > 0
            next_groups_text = "\n".join(next_groups) if next_groups else ""

            print(f"[HasNextExecutorGroup] └─ 结果: {'有' if has_next else '无'}后续组")
            if next_groups:
                print(f"[HasNextExecutorGroup]    后续组: {', '.join(next_groups)}")

            return (next_groups_text, has_next)

        except Exception as e:
            error_msg = f"HasNextExecutorGroup 执行错误: {str(e)}"
            print(f"\n[HasNextExecutorGroup] ❌ {error_msg}")
            import traceback
            traceback.print_exc()

            # 返回错误状态
            return ("", False)


# 节点映射 - 用于ComfyUI注册
NODE_CLASS_MAPPINGS = {
    "HasNextExecutorGroup": HasNextExecutorGroup,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "HasNextExecutorGroup": "后续执行组是否有效 (Has Next Executor Group)",
}


# ✅ 添加API端点 - 用于前端同步组内节点被禁用状态
try:
    from server import PromptServer
    from aiohttp import web

    routes = PromptServer.instance.routes

    @routes.post('/danbooru_gallery/has_next/sync_disabled_node_groups')
    async def sync_disabled_node_groups_api(request):
        """接收前端同步的组内节点都被禁用的组列表（由 has_next 前端扩展自动调用）"""
        try:
            global _disabled_node_groups
            data = await request.json()
            disabled_groups = data.get('disabled_groups', [])

            # print(f"\n[HasNextExecutorGroup API] 📥 接收组内节点都被禁用的组列表")
            # print(f"[HasNextExecutorGroup API] 📦 被禁用组数量: {len(disabled_groups)}")
            # if disabled_groups:
            #     print(f"[HasNextExecutorGroup API] 📦 被禁用组: {', '.join(disabled_groups)}")

            # 更新全局被禁用组列表
            _disabled_node_groups = set(disabled_groups)

            return web.json_response({
                "status": "success",
                "message": f"已同步 {len(disabled_groups)} 个被禁用组"
            })

        except Exception as e:
            error_msg = f"[HasNextExecutorGroup API] 同步被禁用组错误: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return web.json_response({
                "status": "error",
                "message": str(e)
            }, status=500)

    print("[HasNextExecutorGroup] ✅ API端点已注册")

except ImportError as e:
    print(f"[HasNextExecutorGroup] 警告: 无法导入PromptServer或web模块，API端点将不可用: {e}")
