"""
简易通知节点 (Simple Notify)
结合系统通知和音效播放功能的二合一节点
"""


# Hack: string type that is always equal in not equal comparisons
class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False


# Our any instance wants to be a wildcard string
any_typ = AnyType("*")


class SimpleNotify:
    """
    简易通知节点
    结合了系统通知和音效播放功能
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "any": (any_typ, {}),
                "message": ("STRING", {
                    "default": "任务已完成",
                    "tooltip": "通知消息内容"
                }),
                "volume": ("FLOAT", {
                    "min": 0,
                    "max": 1,
                    "step": 0.1,
                    "default": 0.5,
                    "tooltip": "音效音量 (0-1)"
                }),
                "enable_notification": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "是否启用系统通知"
                }),
                "enable_sound": ("BOOLEAN", {
                    "default": True,
                    "tooltip": "是否启用音效"
                }),
            }
        }

    FUNCTION = "notify"
    INPUT_IS_LIST = True
    OUTPUT_IS_LIST = (True,)
    OUTPUT_NODE = True
    RETURN_TYPES = (any_typ,)
    RETURN_NAMES = ("any",)

    CATEGORY = "danbooru"

    def IS_CHANGED(self, **kwargs):
        return float("NaN")

    def notify(self, any, message, volume, enable_notification, enable_sound):
        """
        执行通知功能

        Args:
            any: 任意类型输入，用于传递数据
            message: 通知消息内容
            volume: 音效音量
            enable_notification: 是否启用系统通知
            enable_sound: 是否启用音效

        Returns:
            返回输入的any值，同时传递UI参数用于前端处理
        """
        # 提取列表中的第一个值（因为INPUT_IS_LIST=True）
        message_val = message[0] if isinstance(message, list) else message
        volume_val = volume[0] if isinstance(volume, list) else volume
        enable_notification_val = enable_notification[0] if isinstance(enable_notification, list) else enable_notification
        enable_sound_val = enable_sound[0] if isinstance(enable_sound, list) else enable_sound

        return {
            "ui": {
                "message": [message_val],
                "volume": [volume_val],
                "enable_notification": [enable_notification_val],
                "enable_sound": [enable_sound_val],
                "mode": ["always"],  # 固定为always模式
                "file": ["notify.mp3"]  # 固定音频文件
            },
            "result": (any,)
        }


# 节点映射函数
def get_node_class_mappings():
    """返回节点类映射"""
    return {
        "SimpleNotify": SimpleNotify
    }


def get_node_display_name_mappings():
    """返回节点显示名称映射"""
    return {
        "SimpleNotify": "简易通知 (Simple Notify)"
    }


# 全局映射变量
NODE_CLASS_MAPPINGS = get_node_class_mappings()
NODE_DISPLAY_NAME_MAPPINGS = get_node_display_name_mappings()
