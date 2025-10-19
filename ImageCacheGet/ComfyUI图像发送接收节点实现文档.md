# ComfyUI图像发送接收节点完整实现文档

## 1. 项目概述

### 1.1 节点功能
本项目为ComfyUI提供了一套完整的图像节点间传输解决方案，包含两个核心节点：

- **LG_ImageSender**: 图像发送节点，将图像和遮罩数据发送给接收节点
- **LG_ImageReceiver**: 图像接收节点，接收来自发送节点的图像数据

### 1.2 技术架构概览
```
图像张量(IMAGE) → LG_ImageSender → RGBA图像文件 → WebSocket事件 → LG_ImageReceiver → 图像张量(IMAGE)
```

核心技术栈：
- **后端**: Python + ComfyUI API + PromptServer WebSocket
- **前端**: JavaScript + LiteGraph + ComfyUI Web界面
- **通信**: WebSocket事件 + 临时文件系统

## 2. 核心实现原理

### 2.1 图像发送节点(LG_ImageSender)详细分析

#### 2.1.1 节点定义
```python
class LG_ImageSender:
    def __init__(self):
        self.output_dir = folder_paths.get_temp_directory()  # 临时目录
        self.type = "temp"
        self.compress_level = 1
        self.accumulated_results = []  # 累积结果存储
```

#### 2.1.2 输入参数配置
```python
@classmethod
def INPUT_TYPES(s):
    return {
        "required": {
            "images": ("IMAGE", {"tooltip": "要发送的图像"}),           # 图像输入
            "filename_prefix": ("STRING", {"default": "lg_send"}),     # 文件名前缀
            "link_id": ("INT", {"default": 1, "min": 0, "max": sys.maxsize, "step": 1}), # 连接ID
            "accumulate": ("BOOLEAN", {"default": False}),              # 累积模式
            "preview_rgba": ("BOOLEAN", {"default": True})              # 预览模式
        },
        "optional": {
            "masks": ("MASK", {"tooltip": "要发送的遮罩"}),             # 遮罩输入
            "signal_opt": (any_typ, {"tooltip": "信号输入"})            # 信号传递
        },
        "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}
    }
```

#### 2.1.3 核心处理流程
```python
def save_images(self, images, filename_prefix, link_id, accumulate, preview_rgba, masks=None, prompt=None, extra_pnginfo=None):
    timestamp = int(time.time() * 1000)  # 时间戳确保唯一性
    results = list()

    # 处理每个图像批次
    for idx, image_batch in enumerate(images):
        # 1. 图像格式转换
        image = image_batch.squeeze()  # 移除批次维度
        rgb_image = Image.fromarray(np.clip(255. * image.cpu().numpy(), 0, 255).astype(np.uint8))

        # 2. 遮罩处理
        if masks is not None and idx < len(masks):
            mask = masks[idx].squeeze()
            mask_img = Image.fromarray(np.clip(255. * (1 - mask.cpu().numpy()), 0, 255).astype(np.uint8))
        else:
            mask_img = Image.new('L', rgb_image.size, 255)  # 默认全透明白色遮罩

        # 3. 合并为RGBA
        r, g, b = rgb_image.convert('RGB').split()
        rgba_image = Image.merge('RGBA', (r, g, b, mask_img))

        # 4. 保存文件
        filename = f"{filename_prefix}_{link_id}_{timestamp}_{idx}.png"
        file_path = os.path.join(self.output_dir, filename)
        rgba_image.save(file_path, compress_level=self.compress_level)
```

#### 2.1.4 WebSocket通信机制
```python
# 5. 发送WebSocket事件
if send_results:
    print(f"[ImageSender] 发送 {len(send_results)} 张图像")
    PromptServer.instance.send_sync("img-send", {
        "link_id": link_id,           # 连接标识符
        "images": send_results        # 图像文件信息列表
    })
```

### 2.2 图像接收节点(LG_ImageReceiver)详细分析

#### 2.2.1 节点定义
```python
class LG_ImageReceiver:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("STRING", {"default": "", "multiline": False}),  # 文件名字符串
                "link_id": ("INT", {"default": 1, "min": 0, "max": sys.maxsize}) # 连接ID
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")  # 输出类型
    RETURN_NAMES = ("images", "masks")
    OUTPUT_IS_LIST = (True, True)     # 列表输出
```

#### 2.2.2 图像加载流程
```python
def load_image(self, image, link_id):
    # 1. 解析文件名字符串
    image_files = [x.strip() for x in image.split(',') if x.strip()]

    output_images = []
    output_masks = []

    # 2. 从临时目录加载文件
    temp_dir = folder_paths.get_temp_directory()
    for img_file in image_files:
        img_path = os.path.join(temp_dir, img_file)

        if not os.path.exists(img_path):
            print(f"[ImageReceiver] 文件不存在: {img_path}")
            continue

        img = Image.open(img_path)

        # 3. RGBA格式解析
        if img.mode == 'RGBA':
            r, g, b, a = img.split()
            # 重建RGB图像
            rgb_image = Image.merge('RGB', (r, g, b))
            image = np.array(rgb_image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]  # 添加批次维度

            # 重建遮罩 (注意反转)
            mask = np.array(a).astype(np.float32) / 255.0
            mask = torch.from_numpy(mask)[None,]
            mask = 1.0 - mask  # 遮罩反转
        else:
            # 处理RGB格式
            image = np.array(img.convert('RGB')).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]
            mask = torch.zeros((1, image.shape[1], image.shape[2]), dtype=torch.float32)

        output_images.append(image)
        output_masks.append(mask)

    return (output_images, output_masks)
```

## 3. 关键技术细节

### 3.1 文件命名和管理策略

#### 命名规则
```python
filename = f"{filename_prefix}_{link_id}_{timestamp}_{idx}.png"
# 示例: lg_send_1_1699123456789_0.png
```

- **filename_prefix**: 用户自定义前缀，默认"lg_send"
- **link_id**: 连接标识符，确保发送接收节点配对
- **timestamp**: 毫秒级时间戳，确保文件唯一性
- **idx**: 图像索引，支持批量处理

#### 累积模式处理
```python
if accumulate:
    self.accumulated_results.append(original_result)
    send_results = self.accumulated_results
else:
    send_results = current_batch_results
    self.accumulated_results = []  # 清空累积
```

### 3.2 RGBA格式转换处理

#### 发送端转换
```python
# RGB图像 + 遮罩 → RGBA图像
r, g, b = rgb_image.convert('RGB').split()
rgba_image = Image.merge('RGBA', (r, g, b, mask_img))
```

#### 接收端解析
```python
# RGBA图像 → RGB图像 + 遮罩
if img.mode == 'RGBA':
    r, g, b, a = img.split()
    rgb_image = Image.merge('RGB', (r, g, b))
    mask = a  # Alpha通道作为遮罩
    mask = 1.0 - mask  # 重要：遮罩反转
```

### 3.3 WebSocket事件系统

#### 后端发送
```python
PromptServer.instance.send_sync("img-send", {
    "link_id": link_id,
    "images": send_results
})
```

#### 前端监听
```javascript
api.addEventListener("img-send", async ({ detail }) => {
    if (detail.images.length === 0) return;

    const filenames = detail.images.map(data => data.filename).join(', ');

    // 查找匹配的接收节点
    for (const node of app.graph._nodes) {
        if (node.type === "LG_ImageReceiver") {
            const linkWidget = node.widgets.find(w => w.name === "link_id");
            if (linkWidget.value === detail.link_id) {
                // 更新接收节点的文件名字符串
                node.widgets[0].value = filenames;
                if (node.widgets[0].callback) {
                    node.widgets[0].callback(filenames);
                }

                // 加载图像预览
                Promise.all(detail.images.map(imageData => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = `/view?filename=${encodeURIComponent(imageData.filename)}&type=${imageData.type}${app.getPreviewFormatParam()}`;
                    });
                })).then(loadedImages => {
                    node.imgs = loadedImages;
                    app.canvas.setDirty(true);
                });
            }
        }
    }
});
```

### 3.4 张量格式转换

#### ComfyUI图像张量格式
- **形状**: `[batch, height, width, channels]`
- **数值范围**: `[0.0, 1.0]` (float32)
- **通道顺序**: RGB

#### 遮罩张量格式
- **形状**: `[batch, height, width]`
- **数值范围**: `[0.0, 1.0]` (float32)
- **含义**: 1.0表示不透明，0.0表示透明

## 4. 前端交互机制

### 4.1 节点UI更新逻辑
```javascript
// 当接收节点收到图像时
node.widgets[0].value = filenames;  // 更新文件名字符串
node.imgs = loadedImages;           // 更新预览图像
app.canvas.setDirty(true);          // 刷新画布
```

### 4.2 图像预览显示
```javascript
// 异步加载图像预览
Promise.all(detail.images.map(imageData => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = `/view?filename=${encodeURIComponent(imageData.filename)}&type=${imageData.type}${app.getPreviewFormatParam()}`;
    });
}))
```

## 5. 完整代码实现

### 5.1 LG_ImageSender完整代码

```python
import os
import sys
import torch
import numpy as np
from PIL import Image
import folder_paths
from server import PromptServer
import time

CATEGORY_TYPE = "🎈LAOGOU/Group"

class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False

any_typ = AnyType("*")

class LG_ImageSender:
    def __init__(self):
        self.output_dir = folder_paths.get_temp_directory()
        self.type = "temp"
        self.compress_level = 1
        self.accumulated_results = []

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE", {"tooltip": "要发送的图像"}),
                "filename_prefix": ("STRING", {"default": "lg_send"}),
                "link_id": ("INT", {"default": 1, "min": 0, "max": sys.maxsize, "step": 1, "tooltip": "发送端连接ID"}),
                "accumulate": ("BOOLEAN", {"default": False, "tooltip": "开启后将累积所有图像一起发送"}),
                "preview_rgba": ("BOOLEAN", {"default": True, "tooltip": "开启后预览显示RGBA格式，关闭则预览显示RGB格式"})
            },
            "optional": {
                "masks": ("MASK", {"tooltip": "要发送的遮罩"}),
                "signal_opt": (any_typ, {"tooltip": "信号输入，将在处理完成后原样输出"})
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = (any_typ,)
    RETURN_NAMES = ("signal",)
    FUNCTION = "save_images"
    CATEGORY = CATEGORY_TYPE
    INPUT_IS_LIST = True
    OUTPUT_IS_LIST = (True,)
    OUTPUT_NODE = True

    def save_images(self, images, filename_prefix, link_id, accumulate, preview_rgba, masks=None, prompt=None, extra_pnginfo=None):
        timestamp = int(time.time() * 1000)
        results = list()

        # 参数处理
        filename_prefix = filename_prefix[0] if isinstance(filename_prefix, list) else filename_prefix
        link_id = link_id[0] if isinstance(link_id, list) else link_id
        accumulate = accumulate[0] if isinstance(accumulate, list) else accumulate
        preview_rgba = preview_rgba[0] if isinstance(preview_rgba, list) else preview_rgba

        for idx, image_batch in enumerate(images):
            try:
                # 图像处理
                image = image_batch.squeeze()
                rgb_image = Image.fromarray(np.clip(255. * image.cpu().numpy(), 0, 255).astype(np.uint8))

                # 遮罩处理
                if masks is not None and idx < len(masks):
                    mask = masks[idx].squeeze()
                    mask_img = Image.fromarray(np.clip(255. * (1 - mask.cpu().numpy()), 0, 255).astype(np.uint8))
                else:
                    mask_img = Image.new('L', rgb_image.size, 255)

                # 合并为RGBA
                r, g, b = rgb_image.convert('RGB').split()
                rgba_image = Image.merge('RGBA', (r, g, b, mask_img))

                # 保存文件
                filename = f"{filename_prefix}_{link_id}_{timestamp}_{idx}.png"
                file_path = os.path.join(self.output_dir, filename)
                rgba_image.save(file_path, compress_level=self.compress_level)

                # 准备发送数据
                original_result = {
                    "filename": filename,
                    "subfolder": "",
                    "type": self.type
                }

                # 预览处理
                if not preview_rgba:
                    preview_filename = f"{filename_prefix}_{link_id}_{timestamp}_{idx}_preview.jpg"
                    preview_path = os.path.join(self.output_dir, preview_filename)
                    rgb_image.save(preview_path, format="JPEG", quality=95)
                    results.append({
                        "filename": preview_filename,
                        "subfolder": "",
                        "type": self.type
                    })
                else:
                    results.append(original_result)

                # 累积处理
                if accumulate:
                    self.accumulated_results.append(original_result)

            except Exception as e:
                print(f"[ImageSender] 处理图像 {idx+1} 时出错: {str(e)}")
                continue

        # 获取发送结果
        if accumulate:
            send_results = self.accumulated_results
        else:
            send_results = []
            for idx in range(len(results)):
                original_filename = f"{filename_prefix}_{link_id}_{timestamp}_{idx}.png"
                send_results.append({
                    "filename": original_filename,
                    "subfolder": "",
                    "type": self.type
                })

        # 发送WebSocket事件
        if send_results:
            print(f"[ImageSender] 发送 {len(send_results)} 张图像")
            PromptServer.instance.send_sync("img-send", {
                "link_id": link_id,
                "images": send_results
            })

        if not accumulate:
            self.accumulated_results = []

        return { "ui": { "images": results } }
```

### 5.2 LG_ImageReceiver完整代码

```python
import os
import torch
import numpy as np
from PIL import Image
import folder_paths

class LG_ImageReceiver:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("STRING", {"default": "", "multiline": False, "tooltip": "多个文件名用逗号分隔"}),
                "link_id": ("INT", {"default": 1, "min": 0, "max": sys.maxsize, "step": 1, "tooltip": "发送端连接ID"}),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("images", "masks")
    CATEGORY = CATEGORY_TYPE
    OUTPUT_IS_LIST = (True, True)
    FUNCTION = "load_image"

    def load_image(self, image, link_id):
        # 解析文件名字符串
        image_files = [x.strip() for x in image.split(',') if x.strip()]
        print(f"[ImageReceiver] 加载图像: {image_files}")

        output_images = []
        output_masks = []

        if not image_files:
            # 返回空图像和遮罩
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            empty_mask = torch.zeros((1, 64, 64), dtype=torch.float32)
            return ([empty_image], [empty_mask])

        try:
            temp_dir = folder_paths.get_temp_directory()

            for img_file in image_files:
                try:
                    img_path = os.path.join(temp_dir, img_file)

                    if not os.path.exists(img_path):
                        print(f"[ImageReceiver] 文件不存在: {img_path}")
                        continue

                    img = Image.open(img_path)

                    # RGBA格式处理
                    if img.mode == 'RGBA':
                        r, g, b, a = img.split()
                        rgb_image = Image.merge('RGB', (r, g, b))

                        # 转换为张量
                        image = np.array(rgb_image).astype(np.float32) / 255.0
                        image = torch.from_numpy(image)[None,]

                        # 遮罩处理 (注意反转)
                        mask = np.array(a).astype(np.float32) / 255.0
                        mask = torch.from_numpy(mask)[None,]
                        mask = 1.0 - mask
                    else:
                        # RGB格式处理
                        image = np.array(img.convert('RGB')).astype(np.float32) / 255.0
                        image = torch.from_numpy(image)[None,]
                        mask = torch.zeros((1, image.shape[1], image.shape[2]), dtype=torch.float32, device="cpu")

                    output_images.append(image)
                    output_masks.append(mask)

                except Exception as e:
                    print(f"[ImageReceiver] 处理文件 {img_file} 时出错: {str(e)}")
                    continue

            return (output_images, output_masks)

        except Exception as e:
            print(f"[ImageReceiver] 处理图像时出错: {str(e)}")
            return ([], [])
```

### 5.3 前端监听器代码

```javascript
// groupexecutorqueuemanager.js
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// 监听图像发送事件
api.addEventListener("img-send", async ({ detail }) => {
    if (detail.images.length === 0) return;

    const filenames = detail.images.map(data => data.filename).join(', ');

    // 查找所有接收节点
    for (const node of app.graph._nodes) {
        if (node.type === "LG_ImageReceiver") {
            // 检查连接ID是否匹配
            const linkWidget = node.widgets.find(w => w.name === "link_id");
            if (linkWidget.value === detail.link_id) {
                // 更新文件名字符串
                if (node.widgets[0]) {
                    node.widgets[0].value = filenames;
                    if (node.widgets[0].callback) {
                        node.widgets[0].callback(filenames);
                    }
                }

                // 加载图像预览
                Promise.all(detail.images.map(imageData => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = `/view?filename=${encodeURIComponent(imageData.filename)}&type=${imageData.type}${app.getPreviewFormatParam()}`;
                    });
                })).then(loadedImages => {
                    node.imgs = loadedImages;
                    app.canvas.setDirty(true);
                });
            }
        }
    }
});

// 注册接收节点扩展
app.registerExtension({
    name: "Comfy.LG_Image",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "LG_ImageReceiver") {
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                onExecuted?.apply(this, arguments);
            };
        }
    },
});
```

## 6. 复刻指南

### 6.1 依赖项和导入

```python
# 必需导入
import os
import sys
import torch
import numpy as np
from PIL import Image
import folder_paths
from server import PromptServer
import time

# 可选导入 (用于信号传递)
class AnyType(str):
    def __eq__(self, _) -> bool:
        return True
    def __ne__(self, __value: object) -> bool:
        return False
```

### 6.2 关键实现步骤

#### 步骤1: 创建发送节点
1. 实现`INPUT_TYPES`方法定义输入接口
2. 创建`save_images`方法处理图像转换
3. 使用`PIL`进行RGBA格式合并
4. 通过`PromptServer.send_sync`发送WebSocket事件

#### 步骤2: 创建接收节点
1. 实现`INPUT_TYPES`方法定义输入接口
2. 创建`load_image`方法处理文件加载
3. 使用`PIL`解析RGBA格式为RGB+遮罩
4. 返回ComfyUI标准张量格式

#### 步骤3: 实现前端通信
1. 监听`img-send`WebSocket事件
2. 根据link_id匹配发送接收节点
3. 更新接收节点的文件名字符串
4. 加载图像预览显示

### 6.3 注意事项和最佳实践

#### 文件管理
- 使用临时目录避免文件污染
- 时间戳确保文件名唯一性
- 及时清理累积的文件列表

#### 内存优化
- 及时释放大图像对象的内存
- 使用生成器处理大量图像
- 避免不必要的数据复制

#### 错误处理
- 完善的异常捕获和日志记录
- 文件不存在时的降级处理
- 网络通信失败的重试机制

#### 兼容性
- 支持不同图像格式(PNG, JPEG等)
- 处理不同尺寸的图像
- 兼容不同版本的ComfyUI

## 7. 扩展和优化建议

### 7.1 性能优化方向

#### 图像压缩
```python
# 可调节的压缩级别
rgba_image.save(file_path, compress_level=compress_level)
# JPEG格式预览
rgb_image.save(preview_path, format="JPEG", quality=95)
```

#### 异步处理
```python
import asyncio
# 异步保存图像
async def save_image_async(image_data, file_path):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, image_data.save, file_path)
```

#### 缓存机制
```python
# 添加文件哈希缓存
def get_file_hash(image_data):
    return hashlib.md5(image_data.tobytes()).hexdigest()
```

### 7.2 功能扩展思路

#### 多格式支持
- 支持WebP、AVIF等现代格式
- 支持动态图像(GIF)
- 支持RAW格式图像

#### 网络传输
- 支持HTTP直接传输
- 支持Base64编码传输
- 支持压缩传输

#### 安全性增强
- 文件类型验证
- 文件大小限制
- 传输加密

#### 批处理优化
- 支持文件夹批量处理
- 支持递归目录扫描
- 支持进度显示

### 7.3 调试和监控

#### 日志系统
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ImageTransfer")
logger.info(f"发送图像: {filename}")
```

#### 性能监控
```python
import time
start_time = time.time()
# 处理图像
end_time = time.time()
logger.info(f"处理耗时: {end_time - start_time:.3f}秒")
```

#### 状态报告
```python
# 添加节点状态报告
def get_node_status(self):
    return {
        "sent_images": len(self.accumulated_results),
        "last_send_time": self.last_send_time,
        "current_link_id": self.current_link_id
    }
```

## 8. 总结

本文档详细介绍了ComfyUI图像发送接收节点的完整实现方案，包括：

1. **核心架构**: 基于WebSocket事件和临时文件的图像传输机制
2. **关键技术**: RGBA格式转换、张量数据处理、文件命名策略
3. **完整实现**: 提供可直接使用的完整代码
4. **复刻指南**: 详细的实现步骤和注意事项
5. **优化建议**: 性能优化和功能扩展方向

这套系统的优势在于：
- **可靠性**: 基于文件系统，数据持久化
- **兼容性**: 标准ComfyUI接口，无缝集成
- **灵活性**: 支持批量处理、累积模式等多种使用场景
- **扩展性**: 模块化设计，易于扩展新功能

开发者可以根据本文档完全复刻这套图像传输系统，并根据实际需求进行定制和优化。