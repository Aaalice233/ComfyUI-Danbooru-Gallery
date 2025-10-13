# 多人角色提示词完整语法指南

## ⚠️ 重要说明

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 6px solid #f59e0b;">
<h3 style="color: #fff; font-size: 1.5em; margin-top: 0;">🔗 依赖节点</h3>
<p style="color: #fff; font-size: 1.2em; line-height: 1.6;">
本节点需要配合 <strong><a href="https://github.com/asagi4/comfyui-prompt-control" style="color: #fbbf24; text-decoration: underline;">comfyui-prompt-control</a></strong> 节点使用才能发挥完整效果。
</p>
<p style="color: #fff; font-size: 1.1em; line-height: 1.6;">
⚡ <strong>单独使用本节点效果有限</strong>，因为 ComfyUI 原生不支持这些高级语法（MASK、FEATHER、AND 等）。
</p>
<p style="color: #fff; font-size: 1.1em; line-height: 1.6;">
📦 请先安装 comfyui-prompt-control 插件，然后将本节点的输出连接到 comfyui-prompt-control 的输入端，才能正常使用区域提示词功能。
</p>
</div>

---

本指南整合了 Attention Couple 和 Regional Prompts 两种语法，为多人角色提示词编辑器提供完整的语法参考。

## 概述

多人角色提示词编辑器支持两种语法模式：
1. **Attention Couple** - 基于注意力的区域提示词实现，速度更快且更灵活
2. **Regional Prompts** - 基于潜在空间的区域提示词实现，使用 AND 分隔符

两种语法共享一些核心元素，如 MASK 和 FEATHER 语法，但在使用方式和行为上有所不同。

---

## 共同语法元素

### MASK 语法

MASK 是两种语法的核心，用于指定区域遮罩。

#### 基本语法
```
MASK(x1 x2, y1 y2, weight, op)
```

#### 参数说明
- `x1, x2`: 水平方向的起始和结束位置（0-1之间的百分比，或绝对像素值）
- `y1, y2`: 垂直方向的起始和结束位置（0-1之间的百分比，或绝对像素值）
- `weight`: 权重（可选，默认为1.0）
- `op`: 操作模式（可选，默认为"multiply"）

#### 坐标系统
- 百分比坐标：`MASK(0 0.5, 0 1)` 表示左半部分
- 像素坐标：`MASK(0 512, 0 1024)` 表示左半部分（假设1024x1024分辨率）
- 不能混合使用百分比和像素值

#### 默认值
- 默认值：`MASK(0 1, 0 1, 1)`（覆盖整个区域）
- 可以省略不必要的参数：`MASK(0 0.5, 0.3)` 等同于 `MASK(0 0.5, 0.3 1, 1)`

### FEATHER 语法

FEATHER 用于对遮罩应用羽化效果，使边缘更加柔和。

#### 基本语法
```
FEATHER(left top right bottom)
```

#### 参数说明
- `left, top, right, bottom`: 各个边缘的羽化像素值（可选，默认为0）

#### 使用示例
```
FEATHER(5)                    # 所有边缘羽化5像素
FEATHER(5 10 5 10)           # 左5、上10、右5、下10像素羽化
FEATHER()                    # 无羽化（用于跳过某个遮罩的羽化）
```

#### 多遮罩羽化行为
当使用多个遮罩时，FEATHER 在组合之前应用，按它们在提示词中出现的顺序应用。任何剩余的 FEATHER 调用将应用于组合后的遮罩。

---

## Attention Couple 语法

### 基本概念

Attention Couple 是基于注意力的区域提示词实现，速度更快且更灵活。它基于 pamparamm 的实现修改，使用 ComfyUI 的钩子系统，支持提示词调度。

### 基本语法

#### 完整语法
```
base_prompt COUPLE MASK(x1 x2, y1 y2, weight, op) coupled_prompt
```

#### 简化语法
```
base_prompt COUPLE(x1 x2, y1 y2, weight, op) coupled_prompt
```

### 行为特性

1. **默认遮罩**：如果未指定遮罩，则假定隐式的 `MASK()`
2. **FILL() 功能**：基础提示词可以使用 `FILL()` 自动遮罩未被耦合提示词遮罩的部分
3. **权重处理**：如果基础提示词权重设置为零（即末尾有 `:0`），则第一个非零权重的耦合提示词成为基础提示词
4. **负提示词支持**：可以在负提示词中使用 `COUPLE`，它会正确工作

### 完整语法格式

多人角色编辑器默认生成**完整参数格式**的语法，确保所有参数明确指定：

```
base_prompt COUPLE MASK(x1 x2, y1 y2, weight) character_prompt
```

**注意**：
- 所有坐标参数（x1, x2, y1, y2）始终包含
- **权重参数（weight）始终包含**，即使是默认值 1.0
- 操作模式（op）为可选参数，默认为 `multiply`

### 使用示例

#### 基本示例（完整格式）
```
dog COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) cat
```
在左半部分生成猫，右半部分生成狗，权重为 1.0。

#### 多角色示例（完整格式）
```
landscape COUPLE MASK(0.00 0.33, 0.00 1.00, 1.00) girl with red hair COUPLE MASK(0.33 0.66, 0.00 1.00, 1.00) boy with blue hair COUPLE MASK(0.66 1.00, 0.00 1.00, 1.00) old man
```
创建三个角色：左侧红发女孩，中间蓝发男孩，右侧老人，所有权重均为 1.0。

#### 使用自定义权重
```
landscape COUPLE MASK(0.00 0.50, 0.00 1.00, 0.80) beautiful castle COUPLE MASK(0.50 1.00, 0.00 1.00, 1.20) dragon
```
城堡权重为0.8，龙权重为1.2。

#### 使用 FILL()（默认关闭，需手动开启）
```
background FILL() COUPLE MASK(0.00 0.30, 0.00 1.00, 1.00) character1 COUPLE MASK(0.70 1.00, 0.00 1.00, 1.00) character2
```
背景自动填充未被角色占据的区域（中间 0.30-0.70 的部分）。

**注意**：FILL() 功能默认是**关闭**的，需要在节点设置中手动开启 `use_fill` 选项。

#### 使用羽化
```
landscape COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) mountain FEATHER(10) COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) lake FEATHER(15)
```
山脉羽化10像素，湖泊羽化15像素，创建柔和的过渡效果。

---

## Regional Prompts 语法

### 基本概念

Regional Prompts 使用 AND 分隔符来分隔不同的区域提示词。每个区域可以指定潜在遮罩或区域。

### 基本语法

#### 基本语法
```
prompt1 MASK(x1 x2, y1 y2, weight, op) AND prompt2 MASK(x1 x2, y1 y2, weight, op)
```

#### 使用 AREA
```
prompt1 AREA(x1 x2, y1 y2) AND prompt2 AREA(x1 x2, y1 y2)
```

#### 混合使用
```
prompt1 AREA(x1 x2, y1 y2) MASK(x1 x2, y1 y2) AND prompt2 MASK(x1 x2, y1 y2)
```

### 行为特性

1. **遮罩行为**：使用 MASK 时，ComfyUI 使用完整潜在作为输入生成模型输出，然后应用遮罩
2. **区域行为**：使用 AREA 时，ComfyUI 使用区域指定的潜在部分生成单独的模型输出，然后合成到完整潜在中
3. **组合使用**：可以同时使用 AREA 和 MASK，遮罩应用于 AREA 指定的潜在

### 完整语法格式

Regional Prompts 同样使用**完整参数格式**，确保所有参数明确：

```
prompt1 MASK(x1 x2, y1 y2, weight) AND prompt2 MASK(x1 x2, y1 y2, weight)
```

**注意**：权重参数始终包含，即使是默认值 1.0。

### 使用示例

#### 基本示例（完整格式）
```
cat MASK(0.00 0.50, 0.00 1.00, 1.00) AND dog MASK(0.50 1.00, 0.00 1.00, 1.00)
```
左半部分生成猫，右半部分生成狗，权重均为 1.0。

#### 使用 AREA
```
cat AREA(0 0.5, 0 1) AND dog AREA(0.5 1, 0 1)
```
生成两个完全独立的输出（512x1024），然后合成到1024x1024的潜在中。

#### 多角色示例（完整格式）
```
girl with red hair MASK(0.00 0.33, 0.00 1.00, 1.00) AND boy with blue hair MASK(0.33 0.66, 0.00 1.00, 1.00) AND old man MASK(0.66 1.00, 0.00 1.00, 1.00)
```
创建三个角色：左侧红发女孩，中间蓝发男孩，右侧老人，所有权重均为 1.0。

#### 使用自定义权重和羽化
```
mountain MASK(0.00 0.50, 0.00 1.00, 0.80) FEATHER(10) AND lake MASK(0.50 1.00, 0.00 1.00, 1.20) FEATHER(15)
```
山脉权重为0.8羽化10像素，湖泊权重为1.2羽化15像素。

---

## 高级功能

### IMASK 自定义遮罩

可以附加自定义遮罩到 CLIP，然后在提示词中使用 `IMASK(index, weight, op)` 引用。

#### 语法
```
IMASK(index, weight, op)
```

#### 参数说明
- `index`: 附加遮罩的索引（从0开始）
- `weight`: 权重（可选，默认为1.0）
- `op`: 操作模式（可选，默认为"multiply"）

#### 使用示例
```
background IMASK(0) AND character IMASK(1, 0.9)
```
使用第一个附加遮罩作为背景，第二个附加遮罩作为角色（权重0.9）。

### 多遮罩组合

多个 MASK 或 IMASK 调用将使用 ComfyUI 的 MaskComposite 节点组合，使用 `op` 作为操作参数。

#### 组合示例
```
MASK(0 0.5, 0 1) MASK(0.25 0.75, 0 1) FEATHER(5)
```
两个遮罩组合，然后应用5像素羽化。

### 遮罩大小设置

遮罩默认大小为 (512, 512)，可以使用 `MASK_SIZE(width, height)` 覆盖。

#### 使用示例
```
MASK_SIZE(1024, 1024) MASK(0 512, 0 1024)
```
设置遮罩大小为1024x1024，然后使用像素坐标。

---

## 两种语法的比较

| 特性 | Attention Couple | Regional Prompts |
|------|------------------|------------------|
| 分隔符 | COUPLE | AND |
| 速度 | 更快 | 较慢 |
| 灵活性 | 更高 | 中等 |
| 负提示词支持 | 支持 | 支持 |
| 提示词调度 | 支持 | 支持 |
| FILL() 功能 | 支持 | 不支持 |
| AREA 支持 | 不支持 | 支持 |
| 批处理负提示词 | 需要特殊节点 | 默认支持 |

---

## 实际应用示例（完整格式）

### 示例1：双人肖像

#### Attention Couple 语法（完整格式）
```
portrait COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) beautiful woman with blonde hair, blue eyes COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) handsome man with brown hair, green eyes
```

#### Regional Prompts 语法（完整格式）
```
beautiful woman with blonde hair, blue eyes MASK(0.00 0.50, 0.00 1.00, 1.00) AND handsome man with brown hair, green eyes MASK(0.50 1.00, 0.00 1.00, 1.00)
```

### 示例2：风景与人物

#### Attention Couple 语法（完整格式，使用 FILL）
```
landscape FILL() COUPLE MASK(0.20 0.80, 0.30 0.90, 1.00) girl standing on hill FEATHER(20)
```
**注意**：需要手动开启 `use_fill` 选项才能使用 FILL() 功能。

#### Regional Prompts 语法（完整格式）
```
landscape MASK(0.00 0.20, 0.00 1.00, 1.00) MASK(0.80 1.00, 0.00 1.00, 1.00) MASK(0.00 1.00, 0.00 0.30, 1.00) MASK(0.00 1.00, 0.90 1.00, 1.00) AND girl standing on hill MASK(0.20 0.80, 0.30 0.90, 1.00) FEATHER(20)
```

### 示例3：多角色复杂场景

#### Attention Couple 语法（完整格式）
```
fantasy forest COUPLE MASK(0.00 0.25, 0.00 1.00, 1.00) elf archer COUPLE MASK(0.25 0.50, 0.00 1.00, 1.00) dwarf warrior COUPLE MASK(0.50 0.75, 0.00 1.00, 1.00) wizard COUPLE MASK(0.75 1.00, 0.00 1.00, 1.00) dragon
```

#### Regional Prompts 语法（完整格式）
```
elf archer MASK(0.00 0.25, 0.00 1.00, 1.00) AND dwarf warrior MASK(0.25 0.50, 0.00 1.00, 1.00) AND wizard MASK(0.50 0.75, 0.00 1.00, 1.00) AND dragon MASK(0.75 1.00, 0.00 1.00, 1.00) AND fantasy forest
```

---

## 最佳实践

1. **选择合适的语法**：
   - 需要更快的生成速度和更灵活的控制时，使用 Attention Couple
   - 需要更严格的区域分离时，使用 Regional Prompts

2. **羽化使用**：
   - 在角色或对象之间使用适当的羽化（5-15像素）以创建自然的过渡
   - 避免过度羽化，可能导致细节丢失

3. **权重调整**：
   - 使用权重来平衡不同元素的视觉重要性
   - 权重范围通常在0.5-1.5之间效果最佳

4. **坐标规划**：
   - 提前规划好角色或对象的位置和大小
   - 确保区域之间有适当的重叠或间隔

5. **测试和迭代**：
   - 从简单的提示词开始，逐步增加复杂性
   - 使用较低的分辨率进行快速测试，确认效果后再提高分辨率

---

## 常见问题

### Q: 为什么我的角色之间有明显的边界？
A: 尝试增加 FEATHER 值，通常5-10像素的羽化可以创建更自然的过渡。

### Q: Attention Couple 和 Regional Prompts 的主要区别是什么？
A: Attention Couple 基于注意力机制，速度更快且支持 FILL() 功能；Regional Prompts 基于潜在空间，提供更严格的区域分离。

### Q: 如何在负提示词中使用区域语法？
A: Attention Couple 原生支持在负提示词中使用 COUPLE。Regional Prompts 也可以在负提示词中使用相同的 MASK 语法。

### Q: 为什么某些区域的效果不明显？
A: 检查权重设置，可能需要增加该区域的权重。同时确保坐标设置正确，没有超出范围。

### Q: 可以使用像素坐标而不是百分比吗？
A: 可以，但需要在整个提示词中保持一致。使用 `MASK_SIZE(width, height)` 设置遮罩的基准大小。

---

## 结论

掌握这两种语法将为多人角色提示词创作提供强大的工具。Attention Couple 适合需要速度和灵活性的场景，而 Regional Prompts 适合需要严格区域控制的场景。根据具体需求选择合适的语法，并结合羽化、权重等高级功能，可以创建出令人惊叹的多角色图像。