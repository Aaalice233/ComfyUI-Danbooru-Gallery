# Multi-Character Prompt Complete Syntax Guide

## ⚠️ Important Notice

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 6px solid #f59e0b;">
<h3 style="color: #fff; font-size: 1.5em; margin-top: 0;">🔗 Required Dependency</h3>
<p style="color: #fff; font-size: 1.2em; line-height: 1.6;">
This node requires <strong><a href="https://github.com/asagi4/comfyui-prompt-control" style="color: #fbbf24; text-decoration: underline;">comfyui-prompt-control</a></strong> to work properly and achieve its full functionality.
</p>
<p style="color: #fff; font-size: 1.1em; line-height: 1.6;">
⚡ <strong>Using this node alone has limited effect</strong>, as ComfyUI does not natively support these advanced syntaxes (MASK, FEATHER, AND, etc.).
</p>
<p style="color: #fff; font-size: 1.1em; line-height: 1.6;">
📦 Please install the comfyui-prompt-control extension first, then connect this node's output to comfyui-prompt-control's input to properly use regional prompt features.
</p>
</div>

---

This guide integrates Attention Couple and Regional Prompts syntaxes, providing a complete syntax reference for the Multi-Character Prompt Editor.

## Overview

The Multi-Character Prompt Editor supports two syntax modes:
1. **Attention Couple** - Attention-based regional prompt implementation, faster and more flexible
2. **Regional Prompts** - Latent space-based regional prompt implementation, using AND separators

Both syntaxes share some core elements, such as MASK and FEATHER syntax, but differ in usage and behavior.

---

## Common Syntax Elements

### MASK Syntax

MASK is the core of both syntaxes, used to specify regional masks.

#### Basic Syntax
```
MASK(x1 x2, y1 y2, weight, op)
```

#### Parameter Description
- `x1, x2`: Horizontal start and end positions (percentages between 0-1, or absolute pixel values)
- `y1, y2`: Vertical start and end positions (percentages between 0-1, or absolute pixel values)
- `weight`: Weight (optional, default is 1.0)
- `op`: Operation mode (optional, default is "multiply")

#### Coordinate System
- Percentage coordinates: `MASK(0 0.5, 0 1)` represents the left half
- Pixel coordinates: `MASK(0 512, 0 1024)` represents the left half (assuming 1024x1024 resolution)
- Cannot mix percentages and pixel values

#### Default Values
- Default: `MASK(0 1, 0 1, 1)` (covers the entire area)
- Can omit unnecessary parameters: `MASK(0 0.5, 0.3)` is equivalent to `MASK(0 0.5, 0.3 1, 1)`

### FEATHER Syntax

FEATHER is used to apply feathering effects to masks, making edges softer.

#### Basic Syntax
```
FEATHER(left top right bottom)
```

#### Parameter Description
- `left, top, right, bottom`: Feather pixel values for each edge (optional, default is 0)

#### Usage Examples
```
FEATHER(5)                    # 5 pixels feathering on all edges
FEATHER(5 10 5 10)           # Left 5, top 10, right 5, bottom 10 pixels feathering
FEATHER()                    # No feathering (used to skip feathering for a specific mask)
```

#### Multi-Mask Feathering Behavior
When using multiple masks, FEATHER is applied before combination, in the order they appear in the prompt. Any remaining FEATHER calls will be applied to the combined mask.

---

## Attention Couple Syntax

### Basic Concept

Attention Couple is an attention-based regional prompt implementation that is faster and more flexible. It is modified from pamparamm's implementation, using ComfyUI's hook system and supports prompt scheduling.

### Basic Syntax

#### Complete Syntax
```
base_prompt COUPLE MASK(x1 x2, y1 y2, weight, op) coupled_prompt
```

#### Simplified Syntax
```
base_prompt COUPLE(x1 x2, y1 y2, weight, op) coupled_prompt
```

### Behavior Characteristics

1. **Default Mask**: If no mask is specified, an implicit `MASK()` is assumed
2. **FILL() Function**: The base prompt can use `FILL()` to automatically mask areas not covered by coupled prompts
3. **Weight Handling**: If the base prompt weight is set to zero (i.e., ends with `:0`), the first non-zero weight coupled prompt becomes the base prompt
4. **Negative Prompt Support**: `COUPLE` can be used in negative prompts and will work correctly

### Usage Examples

#### Basic Example
```
dog COUPLE(0 0.5, 0 1) cat
```
Generates a cat on the left half and a dog on the right half.

#### Multi-Character Example
```
landscape COUPLE(0 0.33, 0 1) girl with red hair COUPLE(0.33 0.66, 0 1) boy with blue hair COUPLE(0.66 1, 0 1) old man
```
Creates three characters: red-haired girl on the left, blue-haired boy in the middle, and an old man on the right.

#### Using Weights
```
landscape COUPLE(0 0.5, 0 1, 0.8) beautiful castle COUPLE(0.5 1, 0 1, 1.2) dragon
```
Castle weight is 0.8, dragon weight is 1.2.

#### Using FILL()
```
background FILL() COUPLE(0 0.3, 0 1) character1 COUPLE(0.7 1, 0 1) character2
```
Background automatically fills areas not occupied by characters.

#### Using Feathering
```
landscape COUPLE(0 0.5, 0 1) mountain FEATHER(10) COUPLE(0.5 1, 0 1) lake FEATHER(15)
```
Feathered transition between mountain and lake.

---

## Regional Prompts Syntax

### Basic Concept

Regional Prompts uses AND separators to separate different regional prompts. Each region can specify latent masks or areas.

### Basic Syntax

#### Basic Syntax
```
prompt1 MASK(x1 x2, y1 y2, weight, op) AND prompt2 MASK(x1 x2, y1 y2, weight, op)
```

#### Using AREA
```
prompt1 AREA(x1 x2, y1 y2) AND prompt2 AREA(x1 x2, y1 y2)
```

#### Mixed Usage
```
prompt1 AREA(x1 x2, y1 y2) MASK(x1 x2, y1 y2) AND prompt2 MASK(x1 x2, y1 y2)
```

### Behavior Characteristics

1. **Mask Behavior**: When using MASK, ComfyUI uses the complete latent as input to generate model output, then applies the mask
2. **Area Behavior**: When using AREA, ComfyUI uses the latent portion specified by the area to generate separate model output, then composites it into the complete latent
3. **Combined Usage**: Can use both AREA and MASK simultaneously, with the mask applied to the latent specified by AREA

### Usage Examples

#### Basic Example
```
cat MASK(0 0.5, 0 1) AND dog MASK(0.5 1, 0 1)
```
Generates a cat on the left half and a dog on the right half.

#### Using AREA
```
cat AREA(0 0.5, 0 1) AND dog AREA(0.5 1, 0 1)
```
Generates two completely separate outputs (512x1024), then composites them into a 1024x1024 latent.

#### Multi-Character Example
```
girl with red hair MASK(0 0.33, 0 1) AND boy with blue hair MASK(0.33 0.66, 0 1) AND old man MASK(0.66 1, 0 1)
```
Creates three characters: red-haired girl on the left, blue-haired boy in the middle, and an old man on the right.

#### Using Weights and Feathering
```
mountain MASK(0 0.5, 0 1, 0.8) FEATHER(10) AND lake MASK(0.5 1, 0 1, 1.2) FEATHER(15)
```
Mountain weight is 0.8, lake weight is 1.2, both with feathering effects.

---

## Advanced Features

### IMASK Custom Mask

Custom masks can be attached to CLIP, then referenced in prompts using `IMASK(index, weight, op)`.

#### Syntax
```
IMASK(index, weight, op)
```

#### Parameter Description
- `index`: Index of the attached mask (starting from 0)
- `weight`: Weight (optional, default is 1.0)
- `op`: Operation mode (optional, default is "multiply")

#### Usage Example
```
background IMASK(0) AND character IMASK(1, 0.9)
```
Uses the first attached mask as background, and the second attached mask as character (weight 0.9).

### Multi-Mask Composition

Multiple MASK or IMASK calls will be composed using ComfyUI's MaskComposite node, using `op` as the operation parameter.

#### Composition Example
```
MASK(0 0.5, 0 1) MASK(0.25 0.75, 0 1) FEATHER(5)
```
Two masks are composed, then 5-pixel feathering is applied.

### Mask Size Setting

Masks default to size (512, 512), can be overridden using `MASK_SIZE(width, height)`.

#### Usage Example
```
MASK_SIZE(1024, 1024) MASK(0 512, 0 1024)
```
Sets mask size to 1024x1024, then uses pixel coordinates.

---

## Comparison of Two Syntaxes

| Feature | Attention Couple | Regional Prompts |
|---------|------------------|------------------|
| Separator | COUPLE | AND |
| Speed | Faster | Slower |
| Flexibility | Higher | Medium |
| Negative Prompt Support | Supported | Supported |
| Prompt Scheduling | Supported | Supported |
| FILL() Function | Supported | Not Supported |
| AREA Support | Not Supported | Supported |
| Batch Negative Prompts | Requires special node | Default support |

---

## Practical Application Examples

### Example 1: Dual Portrait

#### Attention Couple Syntax
```
portrait COUPLE(0 0.5, 0 1) beautiful woman with blonde hair, blue eyes COUPLE(0.5 1, 0 1) handsome man with brown hair, green eyes
```

#### Regional Prompts Syntax
```
beautiful woman with blonde hair, blue eyes MASK(0 0.5, 0 1) AND handsome man with brown hair, green eyes MASK(0.5 1, 0 1)
```

### Example 2: Landscape and Character

#### Attention Couple Syntax
```
landscape FILL() COUPLE(0.2 0.8, 0.3 0.9) girl standing on hill FEATHER(20)
```

#### Regional Prompts Syntax
```
landscape MASK(0 0.2, 0 1) MASK(0.8 1, 0 1) MASK(0 1, 0 0.3) MASK(0 1, 0.9 1) AND girl standing on hill MASK(0.2 0.8, 0.3 0.9) FEATHER(20)
```

### Example 3: Multi-Character Complex Scene

#### Attention Couple Syntax
```
fantasy forest COUPLE(0 0.25, 0 1) elf archer COUPLE(0.25 0.5, 0 1) dwarf warrior COUPLE(0.5 0.75, 0 1) wizard COUPLE(0.75 1, 0 1) dragon
```

#### Regional Prompts Syntax
```
elf archer MASK(0 0.25, 0 1) AND dwarf warrior MASK(0.25 0.5, 0 1) AND wizard MASK(0.5 0.75, 0 1) AND dragon MASK(0.75 1, 0 1) AND fantasy forest
```

---

## Best Practices

1. **Choose the Right Syntax**:
   - Use Attention Couple when you need faster generation speed and more flexible control
   - Use Regional Prompts when you need stricter regional separation

2. **Feathering Usage**:
   - Use appropriate feathering (5-15 pixels) between characters or objects to create natural transitions
   - Avoid excessive feathering, which may lead to loss of detail

3. **Weight Adjustment**:
   - Use weights to balance the visual importance of different elements
   - Weight range typically works best between 0.5-1.5

4. **Coordinate Planning**:
   - Plan the positions and sizes of characters or objects in advance
   - Ensure appropriate overlap or spacing between regions

5. **Testing and Iteration**:
   - Start with simple prompts and gradually increase complexity
   - Use lower resolution for quick testing, then increase resolution after confirming effects

---

## Frequently Asked Questions

### Q: Why are there obvious boundaries between my characters?
A: Try increasing the FEATHER value, typically 5-10 pixels of feathering can create more natural transitions.

### Q: What is the main difference between Attention Couple and Regional Prompts?
A: Attention Couple is based on attention mechanism, faster and supports FILL() function; Regional Prompts is based on latent space, providing stricter regional separation.

### Q: How to use regional syntax in negative prompts?
A: Attention Couple natively supports COUPLE in negative prompts. Regional Prompts can also use the same MASK syntax in negative prompts.

### Q: Why are certain regions not showing obvious effects?
A: Check weight settings, you may need to increase the weight of that region. Also ensure coordinate settings are correct and not out of range.

### Q: Can I use pixel coordinates instead of percentages?
A: Yes, but you need to maintain consistency throughout the prompt. Use `MASK_SIZE(width, height)` to set the base size for masks.

---

## Conclusion

Mastering these two syntaxes will provide powerful tools for multi-character prompt creation. Attention Couple is suitable for scenarios requiring speed and flexibility, while Regional Prompts is suitable for scenarios requiring strict regional control. Choose the appropriate syntax based on specific needs, and combine with advanced features like feathering and weights to create stunning multi-character images.