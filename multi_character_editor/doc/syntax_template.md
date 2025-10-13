# 多人提示词语法模板（完整格式）

## Attention Couple 语法模板

### 基本模板（双人）
```
base_prompt COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) character_a COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) character_b
```

### 使用 FILL 的模板（需手动开启 use_fill）
```
base_prompt FILL() COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) character_a COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) character_b
```

### 参数说明
- `base_prompt`: 基础提示词 + 全局提示词（如场景、背景、整体氛围等）
- `FILL()`: 可选，自动填充未被角色遮罩覆盖的区域（**默认关闭**，需在节点中开启）
- `MASK(x1 x2, y1 y2, weight)`: 完整遮罩参数
  - `x1 x2`: 水平方向的起始和结束位置（0.00-1.00）
  - `y1 y2`: 垂直方向的起始和结束位置（0.00-1.00）
  - `weight`: 权重值（默认 1.00，**始终包含**）
- `character_a`, `character_b`: 角色提示词 + 动作描述

### 实例：双人左右分布
```
2girls, outdoor scene COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) 1girl, red hair, standing COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) 1girl, blue hair, sitting
```

### 实例：双人左右分布 + FILL
```
2girls, outdoor scene FILL() COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) 1girl, red hair, standing COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) 1girl, blue hair, sitting
```

### 实例：三人分布
```
3girls, beach COUPLE MASK(0.00 0.33, 0.00 1.00, 1.00) girl, blonde hair COUPLE MASK(0.33 0.66, 0.00 1.00, 1.00) girl, black hair COUPLE MASK(0.66 1.00, 0.00 1.00, 1.00) girl, silver hair
```

---

## Regional Prompts 语法模板

### 基本模板（双人）
```
character_a MASK(0.00 0.50, 0.00 1.00, 1.00) AND character_b MASK(0.50 1.00, 0.00 1.00, 1.00)
```

### 带基础提示词的模板
```
base_prompt AND character_a MASK(0.00 0.50, 0.00 1.00, 1.00) AND character_b MASK(0.50 1.00, 0.00 1.00, 1.00)
```

### 实例：双人左右分布
```
1girl, red hair, standing MASK(0.00 0.50, 0.00 1.00, 1.00) AND 1girl, blue hair, sitting MASK(0.50 1.00, 0.00 1.00, 1.00)
```

---

## 重要说明

1. **完整参数格式**：所有 MASK 语法都包含完整的参数，包括权重（即使是默认值 1.00）
2. **FILL 默认关闭**：FILL() 功能默认是关闭的，需要在节点设置中手动开启 `use_fill` 选项
3. **坐标格式**：坐标使用两位小数（0.00-1.00），确保精确控制
4. **权重参数**：权重参数始终包含在第三个位置，方便调整角色重要性

## 常用位置参考

### 水平分割（左右）
- 左半部分：`MASK(0.00 0.50, 0.00 1.00, 1.00)`
- 右半部分：`MASK(0.50 1.00, 0.00 1.00, 1.00)`

### 水平三分
- 左三分之一：`MASK(0.00 0.33, 0.00 1.00, 1.00)`
- 中三分之一：`MASK(0.33 0.66, 0.00 1.00, 1.00)`
- 右三分之一：`MASK(0.66 1.00, 0.00 1.00, 1.00)`

### 垂直分割（上下）
- 上半部分：`MASK(0.00 1.00, 0.00 0.50, 1.00)`
- 下半部分：`MASK(0.00 1.00, 0.50 1.00, 1.00)`

### 九宫格中心
- 中心区域：`MASK(0.33 0.66, 0.33 0.66, 1.00)`

