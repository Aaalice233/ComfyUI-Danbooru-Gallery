# Aaalice's Custom Nodes

[中文](README.md) | **English**

<img width="966" height="830" alt="image" src="https://github.com/user-attachments/assets/e2a5d34e-0001-417e-bf8e-7753521ea0d3" />

---

> [!NOTE]
> **Project Notice**
> This project is a collection of ComfyUI nodes custom-developed specifically for the [ShiQi_Workflow](https://github.com/Aaalice233/ShiQi_Workflow).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Node Documentation](#node-documentation)
  - [🖼️ Danbooru Gallery](#-danbooru-gallery)
  - [🔄 Character Feature Swap](#-character-feature-swap)
  - [📚 Prompt Selector](#-prompt-selector)
  - [👥 Multi Character Editor](#-multi-character-editor)
  - [🧹 Prompt Cleaning Maid](#-prompt-cleaning-maid)
  - [🎛️ Parameter Control Panel](#-parameter-control-panel)
  - [📤 Parameter Break](#-parameter-break)
  - [📝 Workflow Description](#-workflow-description)
  - [🖼️ Simple Image Compare](#-simple-image-compare)
  - [🖼️ Simple Load Image](#-simple-load-image)
  - [💾 Save Image Plus](#-save-image-plus)
  - [🎨 Krita Integration](#-krita-integration)
  - [⚡ Group Executor Manager](#-group-executor-manager)
  - [🔇 Group Mute Manager](#-group-mute-manager)
  - [🧭 Quick Group Navigation](#-quick-group-navigation)
  - [🖼️ Image Cache Nodes](#-image-cache-nodes)
  - [📝 Text Cache Nodes](#-text-cache-nodes)
  - [📐 Resolution Master Simplify](#-resolution-master-simplify)
  - [📦 Simple Checkpoint Loader](#-simple-checkpoint-loader)
  - [🔔 Simple Notify](#-simple-notify)
  - [✂️ Simple String Split](#-simple-string-split)
  - [🔀 Simple Value Switch](#-simple-value-switch)
- [Installation](#installation)
- [System Requirements](#system-requirements)
- [Advanced Features](#advanced-features)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Overview

A powerful ComfyUI plugin suite featuring four core nodes that provide comprehensive prompt management and image resource solutions for AI image generation workflows. Built on the Danbooru API, it supports image search, prompt editing, character feature swapping, and multi-character regional prompts.

## Key Features

- 🔍 **Intelligent Image Search**: Precise tag-based search using Danbooru API
- 🎨 **Visual Editing**: Intuitive canvas editing with drag-and-drop
- 🤖 **AI Smart Processing**: LLM-powered intelligent character feature replacement
- 📚 **Prompt Management**: Categorized management of frequently used prompts
- 👥 **Multi-Character Support**: Visual editing of multi-character regional prompts
- 🌐 **Multi-language Interface**: Seamless Chinese/English interface switching
- 🈳 **Bilingual Tag Translation**: Chinese-English tag translation and search
- ⭐ **Cloud Synchronization**: Cloud sync for favorites and configurations
- 🎯 **Workflow Integration**: Perfect integration with ComfyUI workflows

---

## Node Documentation

### 🖼️ Danbooru Gallery

**Core Image Search and Management Node**

The main node of the plugin, providing Danbooru API-based image search, preview, download, and prompt extraction functionality.

#### Main Features
- 🔍 **Advanced Tag Search**: Complex tag search with exclusion syntax
- 📄 **Smart Pagination**: Efficient pagination loading mechanism
- 💡 **Intelligent Autocomplete**: Real-time tag completion with Chinese hints
- 🎨 **High-Quality Preview**: Responsive waterfall layout
- 📊 **Content Rating**: Filter by image rating
- 🏷️ **Tag Categories**: Selectable output tag categories
- ⭐ **Favorites System**: Cloud-synced favorites functionality
- ✍️ **Prompt Editor**: Built-in prompt editing capabilities
- 🔐 **User Authentication**: Danbooru account login support

#### Usage
1. Add `Danbooru > Danbooru Images Gallery` node in ComfyUI
2. Double-click node to open gallery interface
3. Enter search tags, supporting syntax:
   - Normal tags: `1girl blue_eyes`
   - Exclude tags: `1girl -blurry`
   - Complex search: `1girl blue_eyes smile -blurry`
4. Select images and import prompts to workflow

---

### 🔄 Character Feature Swap

**AI-Powered Character Feature Replacement Node**

Utilizes Large Language Model APIs to intelligently replace character features in prompts while preserving composition and environment.

#### Core Features
- 🤖 **Intelligent Understanding**: LLM-powered character feature understanding and replacement
- 🌐 **Multi-API Support**: Supports OpenRouter, Gemini, DeepSeek, and more
- ⚙️ **Highly Configurable**: Custom API services and model selection
- 📋 **Preset Management**: Save and switch feature replacement presets
- 🔧 **Easy Configuration**: Dedicated settings interface with connection testing

#### Supported API Services
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Gemini API**: `https://generativelanguage.googleapis.com/v1beta`
- **DeepSeek**: `https://api.deepseek.com/v1`
- **OpenAI Compatible**: Custom service addresses
- **Gemini CLI**: Local execution (requires `@google/gemini-cli`)

#### Usage Steps
1. Add `Danbooru > Character Feature Swap` node
2. Click "Settings" button to configure API
3. Connect inputs:
   - `original_prompt`: Original prompt
   - `character_prompt`: New character feature description
4. Get `new_prompt` output

---

### 📚 Prompt Selector

**Professional Prompt Library Management Node**

Categorize, manage, and select frequently used prompts to build personal prompt libraries and improve workflow efficiency.

#### Core Features
- 📁 **Category Management**: Create multiple categories to organize prompts
- 🖼️ **Preview Image Support**: Add visual previews to prompts
- 📦 **Import/Export**: Complete `.zip` format backup and sharing
- 🔄 **Batch Operations**: Batch deletion and moving support
- ⭐ **Favorites and Sorting**: Drag-and-drop sorting and favorites marking
- 🔗 **Flexible Concatenation**: Concatenation with upstream node outputs

#### Usage
1. Add `Danbooru > Prompt Selector` node
2. Double-click to open management interface and build prompt library
3. Select desired prompts
4. Optionally connect `prefix_prompt` input
5. Get concatenated `prompt` output

---

### 👥 Multi Character Editor

**Visual Multi-Character Regional Prompt Editor Node**

Professional visual editor supporting multi-character regional prompt creation with precise control over character positions and attributes.

#### Core Features
- 🎨 **Visual Editing**: Intuitive canvas drag-and-drop editing
- 🔄 **Dual Syntax Support**: Attention Couple and Regional Prompts
- 📐 **Precise Control**: Percentage and pixel coordinate positioning
- 🌊 **Feathering Effects**: Edge feathering for natural transitions
- ⚖️ **Weight Management**: Independent character weight control
- 💾 **Preset System**: Save and load character configurations
- ⚡ **Real-time Preview**: Instant syntax preview generation
- ✅ **Syntax Validation**: Automatic error detection and hints

#### Requirements
> ⚠️ **Important Notice**: This node requires **[comfyui-prompt-control](https://github.com/asagi4/comfyui-prompt-control)** plugin for full functionality, as ComfyUI natively doesn't support advanced syntax like MASK, FEATHER, AND, etc.

#### Syntax Mode Comparison

| Feature | Attention Couple | Regional Prompts |
|---------|------------------|------------------|
| Separator | COUPLE | AND |
| Generation Speed | Faster | Slower |
| Flexibility | Higher | Medium |
| FILL() Support | ✅ Supported | ❌ Not Supported |
| Region Separation | Medium | Stricter |
| Recommended Use | Rapid prototyping, flexible layouts | Precise control, strict regions |

#### Usage
1. Add `Danbooru > Multi Character Editor` node
2. Choose syntax mode and canvas dimensions
3. Double-click to open visual editing interface
4. Add characters and adjust positions, weights, feathering, etc.
5. Connect to **comfyui-prompt-control** node for use

#### Usage Examples

**Dual Portrait (Attention Couple)**:
```
portrait scene FILL() COUPLE MASK(0.00 0.50, 0.00 1.00, 1.00) beautiful woman with blonde hair, blue eyes FEATHER(10) COUPLE MASK(0.50 1.00, 0.00 1.00, 1.00) handsome man with brown hair, green eyes FEATHER(10)
```

**Three-Character Scene (Regional Prompts)**:
```
fantasy forest AND elf archer MASK(0.00 0.33, 0.00 1.00, 1.00) FEATHER(8) AND dwarf warrior MASK(0.33 0.66, 0.00 1.00, 1.00) FEATHER(8) AND wizard MASK(0.66 1.00, 0.00 1.00, 1.00) FEATHER(8)
```

---

### 🧹 Prompt Cleaning Maid

**Intelligent Prompt Cleaning and Formatting Node**

Prompt Cleaning Maid is a professional prompt cleaning tool that automatically removes redundant symbols, whitespace, and formatting issues, making prompts more standardized and clean.

#### Core Features
- 🧹 **Comma Cleanup**: Automatically remove redundant commas (consecutive commas, leading/trailing commas)
- ⚡ **Whitespace Normalization**: Clean leading/trailing whitespace and excessive spaces/tabs
- 🏷️ **LoRA Tag Management**: Optionally remove `<lora:xxx>` tags from strings
- 📄 **Newline Handling**: Replace newline characters with spaces or commas
- 🔧 **Bracket Fixing**: Automatically remove unmatched parentheses `()` or brackets `[]`
- 🔄 **Smart Cleaning**: Multi-stage cleaning process ensures correct prompt formatting

#### Cleaning Options

**1. Cleanup Commas (cleanup_commas)**
- Remove leading commas
- Remove trailing commas
- Merge consecutive commas into single comma
- Example: `, , tag1, , tag2, ,` → `tag1, tag2`

**2. Cleanup Whitespace (cleanup_whitespace)**
- Clean leading/trailing spaces and tabs
- Merge multiple consecutive spaces into single space
- Normalize spacing around commas
- Example: `  tag1  ,   tag2   ` → `tag1, tag2`

**3. Remove LoRA Tags (remove_lora_tags)**
- Completely remove LoRA tags from strings
- Supports various LoRA formats: `<lora:name:weight>`
- Example: `1girl, <lora:style:0.8>, smile` → `1girl, smile`

**4. Cleanup Newlines (cleanup_newlines)**
- **False**: Preserve newline characters
- **Space**: Replace `\n` with space
- **Comma**: Replace `\n` with `, `
- Example (comma): `tag1\ntag2` → `tag1, tag2`

**5. Fix Brackets (fix_brackets)**
- **False**: Don't fix brackets
- **Parenthesis**: Remove unmatched `()`
- **Brackets**: Remove unmatched `[]`
- **Both**: Fix both parentheses and brackets
- Example: `((tag1) tag2))` → `(tag1) tag2`

#### Usage
1. Add `Danbooru > Prompt Cleaning Maid` node
2. Connect upstream node's string output to `string` input
3. Enable/disable cleaning options as needed
4. Get cleaned `string` output

#### Use Cases
- **Prompt Standardization**: Unify prompt format for easy management and reuse
- **Automated Cleaning**: Batch clean prompts from various sources
- **Format Conversion**: Convert multi-line prompts to single line or adjust delimiters
- **LoRA Management**: Quickly remove or retain LoRA tags
- **Bracket Fixing**: Fix bracket mismatches from copy-paste operations

#### Cleaning Process
Prompt Cleaning Maid performs cleaning in the following order for optimal results:
1. **Stage 1**: Remove LoRA tags (if enabled)
2. **Stage 2**: Replace newlines (if enabled)
3. **Stage 3**: Clean redundant commas (if enabled)
4. **Stage 4**: Fix unmatched brackets (if enabled)
5. **Stage 5**: Clean redundant whitespace (if enabled)

#### Example

**Input Prompt**:
```
, , 1girl, blue eyes,  , <lora:style:0.8>,
smile, ((long hair),  beautiful
```

**After Cleaning** (all options enabled, newlines→comma, brackets→both):
```
1girl, blue eyes, smile, (long hair), beautiful
```

---

### 🎛️ Parameter Control Panel

**Visual Parameter Management and Workflow Control Node**

Parameter Control Panel is a powerful parameter management node that provides a visual interface to create, manage, and output various types of parameters, working with Parameter Break node for flexible workflow parameter control.

#### Core Features
- 🎨 **Visual Parameter Editing**: Intuitive UI interface for parameter management
- 📊 **Multiple Parameter Types**: Support for sliders, switches, dropdown menus, images, and more
- 🎯 **Separator Support**: Use separators to organize and group parameters
- 🔄 **Drag-and-Drop Sorting**: Adjust parameter order through dragging
- 💾 **Workflow Persistence**: Parameter configuration saved with workflow
- 🔒 **Lock Protection**: Lock mode to prevent accidental modifications
- 🎛️ **Adaptive Dropdowns**: Support for auto-fetching dropdown options from connections

#### Parameter Types

**1. Slider**
- Support for integers and floating-point numbers
- Configurable min, max, step, and default values
- Real-time value display and adjustment
- Examples: `steps (20, 1-150, step=1)`, `cfg (7.5, 1.0-30.0, step=0.5)`

**2. Switch**
- Boolean value switch
- Configurable default value (True/False)
- Elegant switch UI
- Examples: `enable_hr (True)`, `save_metadata (False)`

**3. Dropdown**
- Four data source modes:
  - **From Connection**: Auto-fetch options from target node connected to Parameter Break
  - **Custom**: Manually input option list
  - **Checkpoint**: Auto-load checkpoint model list
  - **LoRA**: Auto-load LoRA model list
- Support for long text auto-ellipsis display
- Deep purple color theme
- Examples: `sampler (euler_a, ddim, dpm++)`, `model (auto from connection)`

**4. Image**
- Image upload and management functionality
- Support for uploading images via file selector
- Hover preview display (mouse over filename)
- Clear button to quickly remove selected image
- Outputs 1024×1024 pure white image when no image is uploaded
- Output type is IMAGE (ComfyUI standard image tensor)
- Suitable for conditional images, reference images, etc.
- Examples: `reference_image (uploaded.png)`, `control_image (None → white image)`

**5. Separator**
- Visual grouping and parameter organization
- Customizable separator text
- Elegant purple theme design
- Examples: `--- Basic Parameters ---`, `--- Advanced Settings ---`

#### Usage
1. Add `Danbooru > Parameter Control Panel` node
2. Double-click to open parameter management interface
3. Click "+" button to add parameters:
   - Input parameter name
   - Select parameter type
   - Configure parameter options (range, options, etc.)
4. Adjust parameter values, connect `parameters` output to Parameter Break node
5. Use lock 🔒 button to protect parameter configuration

#### Use Cases
- **Workflow Parameterization**: Centrally manage common parameters
- **Batch Experiments**: Quickly adjust parameters for comparative experiments
- **Preset System**: Save different parameter combinations
- **Model Switching**: Quickly switch models/LoRAs using dropdowns
- **Conditional Control**: Use switches to control workflow branches

#### Technical Features
- **Responsive Design**: Node size adapts to content
- **Deep Purple Theme**: Unified visual style
- **Performance Optimization**: Avoid unnecessary redraws
- **Smart Layout**: Automatically adjust button and control positions

---

### 📤 Parameter Break

**Smart Parameter Expansion and Option Synchronization Node**

Parameter Break node receives parameter packages from Parameter Control Panel, automatically expands them into independent output pins, and supports auto-syncing dropdown options from connected target nodes.

#### Core Features
- 📤 **Auto Expansion**: Expand parameter package into independent output pins
- 🔄 **Smart Synchronization**: Auto-sync parameter structure changes
- 🎯 **Wildcard Type**: Use AnyType to support connecting to any input
- 🔗 **Auto Option Fetching**: Auto-extract options when connected to combo inputs
- 🧹 **Auto Clear**: Auto-clear dropdown options when disconnected
- 📊 **Real-time Update**: Immediately update output pins when parameters change

#### How It Works

**Parameter Structure Synchronization**:
1. Parameter Control Panel creates parameter configuration
2. Parameter Break receives parameter package
3. Auto-read parameter structure and create corresponding output pins
4. Each output pin corresponds to one parameter, maintaining name and type consistency

**Option Auto-Synchronization**:
1. Connect Parameter Break's dropdown output to target node's combo input
2. Auto-detect target node's input type and available options
3. Extract option list and sync back to Parameter Control Panel
4. Dropdown UI auto-refreshes to display new options
5. Auto-clear options when disconnected

#### Supported Sync Scenarios
- ✅ **Checkpoint Loader**: Auto-fetch checkpoint list
- ✅ **VAE Selector**: Auto-fetch VAE list
- ✅ **Sampler Selection**: Auto-fetch sampler list
- ✅ **Scheduler Selection**: Auto-fetch scheduler list
- ✅ **All Combo Inputs**: Support all ComfyUI combo type inputs

#### Usage
1. Add `Danbooru > Parameter Break` node
2. Connect Parameter Control Panel's `parameters` output
3. Auto-generate corresponding output pins
4. Connect dropdown outputs to target node's combo inputs
5. Options auto-sync, select in Parameter Control Panel

#### Usage Examples

**Basic Parameter Control**:
```
Parameter Control Panel (steps=20, cfg=7.5, sampler=euler_a)
  ↓ parameters
Parameter Break
  ↓ steps (INT)
  ↓ cfg (FLOAT)
  ↓ sampler (STRING)
KSampler Node
```

**Auto Model Switching**:
```
Parameter Control Panel (model_name: dropdown - from_connection)
  ↓ parameters
Parameter Break
  ↓ model_name (*)  → CheckpointLoader's ckpt_name input
                       (auto-fetch all checkpoint lists)
```

**Auto VAE Selection**:
```
Parameter Control Panel (vae_name: dropdown - from_connection)
  ↓ parameters
Parameter Break
  ↓ vae_name (*)  → Simple Checkpoint Loader's vae_name input
                     (auto-fetch all VAE lists)
```

#### Use Cases
- **Centralized Parameter Management**: Centralize scattered parameters to one panel
- **Quick Model Switching**: Quickly switch checkpoint/VAE through dropdowns
- **Batch Experiments**: Conduct batch parameter experiments with Group Executor Manager
- **Workflow Templates**: Create reusable parameterized workflow templates

#### Technical Highlights
- **Precise Matching**: Precisely match corresponding widget through input name
- **Smart Caching**: Avoid repeatedly syncing same options
- **Debouncing**: 300ms debounce to avoid frequent API calls
- **Error Tolerance**: Comprehensive error handling mechanism
- **Connection Recovery**: Recover connections based on parameter ID, support parameter reordering

#### Code Reference
The auto option synchronization feature of Parameter Break node is inspired by the design of [ComfyUI-CRZnodes](https://github.com/CoreyCorza/ComfyUI-CRZnodes) project.

---

### 📝 Workflow Description

**Markdown Rendering Workflow Documentation Node**

Workflow Description node provides an elegant way to add documentation to workflows, supporting Markdown rendering, version management, and first-open popup notifications.

#### Core Features
- 📝 **Markdown Rendering**: Full Markdown syntax support including headings, lists, code blocks, tables, etc.
- 🎨 **Rich Text Editing**: Intuitive editing interface with real-time preview
- 🔔 **Version Popup**: First-open notification based on version number to ensure users see latest instructions
- 💾 **Workflow Persistence**: Documentation content saved with workflow for easy sharing and collaboration
- 🎯 **Clean UI**: Rendered Markdown content displayed directly in the node
- 🔒 **Virtual Node**: Does not participate in actual execution, no impact on workflow performance

#### Parameter Configuration
- **Title**: Title of the documentation, displayed at the top of the node
- **Content**: Markdown-formatted documentation content
- **Version**: Used to control first-open popup, format like "1.0.0"
- **Enable Popup**: Whether to show notification popup when first opening the workflow

#### Usage
1. Add `Danbooru > Workflow Description` node
2. Double-click the node to open the editor
3. Enter title and Markdown content
4. Set version number (optional)
5. Enable/disable first-open popup
6. After saving, content will be rendered and displayed in the node in real-time

#### Use Cases
- **Workflow Documentation**: Add usage instructions for complex workflows
- **Parameter Explanation**: Explain the purpose and recommended values of parameters
- **Change Log**: Record version change history of workflows
- **Collaboration Sharing**: Explain workflow usage to team members
- **Template Instructions**: Provide configuration guides in workflow templates

#### Markdown Support
- ✅ **Headings**: `# H1`, `## H2`, `### H3`, etc.
- ✅ **Lists**: Ordered lists, unordered lists, nested lists
- ✅ **Emphasis**: `**bold**`, `*italic*`, `~~strikethrough~~`
- ✅ **Code**: Inline code and code blocks (with syntax highlighting)
- ✅ **Links**: `[link text](URL)`
- ✅ **Images**: `![image description](URL)`
- ✅ **Tables**: Markdown table syntax
- ✅ **Blockquotes**: `> quote text`
- ✅ **Horizontal Rules**: `---` or `***`

#### Version Popup Mechanism
- Tracking based on node ID and version number
- Each node independently records opened versions
- Popup automatically triggered when version number changes
- Settings saved in plugin directory, shared across workflows

#### Technical Features
- **Lightweight Rendering**: Efficient Markdown parsing and rendering
- **Style Customization**: Purple theme consistent with overall plugin style
- **Responsive Design**: Node size adapts to content
- **Persistent Storage**: Comprehensive data save and recovery mechanism

---

### 🖼️ Simple Image Compare

**High-Performance Image Comparison Node**

Simple Image Compare is a performance-optimized image comparison tool that supports real-time comparison of two images through mouse sliding, specially optimized for multi-node scenarios.

#### Core Features
- 🎯 **Slide Comparison**: Hover and move left-right to view image comparison
- ⚡ **Performance Optimized**: Optimized for multi-node scenarios to avoid workflow dragging lag
- 🖼️ **Batch Support**: Supports selecting any two images from a batch for comparison
- 🎨 **Smart Rendering**: Throttling and caching mechanisms to reduce unnecessary redraws
- 📐 **Adaptive Layout**: Automatically adjusts image size to fit node dimensions

#### Performance Optimization Features
- 🚀 **Removed Animation Loop**: Eliminates the original requestAnimationFrame infinite loop
- ⏱️ **Mouse Move Throttling**: Limits event processing frequency to ~60fps
- 💾 **Calculation Result Caching**: Caches image position and size calculations
- 🎯 **Smart Redraw**: Only triggers canvas redraw when necessary
- 📉 **Resource Saving**: Significantly reduces CPU usage in multi-node scenarios

#### Usage
1. Add `image > Simple Image Compare` node
2. Connect `image_a` input (first comparison image)
3. Connect `image_b` input (second comparison image)
4. Hover mouse over the node and move left-right to view comparison

#### Use Cases
- **Quality Comparison**: Compare image quality with different parameters
- **Model Comparison**: Compare generation effects of different models
- **LoRA Comparison**: Compare effects of different LoRAs
- **Parameter Tuning**: Real-time comparison of changes before and after parameter adjustments
- **Batch Inspection**: Quickly browse and compare large numbers of generated images

#### Technical Highlights
Compared to the original image comparison node, this node is optimized in the following aspects:
- **Smooth Workflow Dragging**: No more lag with 10+ nodes
- **Lower CPU Usage**: Reduces event processing count by ~80%
- **Improved Rendering Efficiency**: Avoids redundant calculations through caching
- **Optimized Memory Usage**: Intelligently clears unused cache data

---

### 🖼️ Simple Load Image

**Minimalist Image Loading Node**

Simple Load Image provides basic functionality similar to ComfyUI's native upload node, supporting image selection, upload, and a default black image option.

#### Core Features
- 📁 **Image Selection**: Choose from existing image files in the input directory
- ⬆️ **Image Upload**: Directly upload new images to the input directory
- ⚫ **Default Black Image**: First option is a black image (simple_none.png) that returns a 1024×1024 pure black image
- 🔄 **Auto Recovery**: Automatically recreates the default black image if accidentally deleted
- 🎯 **Native Compatibility**: Uses ComfyUI's native logic entirely, preview and loading mechanism identical to native nodes

#### Usage
1. Add `image > Simple Load Image` node
2. Select image from dropdown:
   - First option `simple_none.png` is the default black image
   - Other options are image files in the input directory
3. Or click upload button to upload a new image
4. Node outputs IMAGE type tensor, can be connected to any node requiring image input

#### Use Cases
- **Placeholder Image**: Use black image as placeholder during workflow development
- **Image Switching**: Quickly switch between different images to test effects
- **Batch Testing**: Combine with other nodes for batch image processing tests

#### Technical Features
- **Fully Native**: Uses ComfyUI's native file loading mechanism, no custom frontend code
- **Auto Maintenance**: Default black image automatically created and recovered, no manual management needed
- **Simple & Efficient**: Simple code structure with minimal performance overhead

---

### 🔺 PixelKSampleUpscaler Sharpening

**Enhanced Upscaler Provider with AMD FidelityFX CAS Sharpening**

PixelKSampleUpscaler Sharpening is an enhanced upscaler provider node with integrated sharpening capabilities, designed for Impact Pack's Iterative Upscale workflow. It features the AMD FidelityFX CAS (Contrast Adaptive Sharpening) algorithm as a high-performance alternative to slow upscale models.

#### Core Features
- 🚀 **Three Upscale Modes**: Smart switching between model upscale/sharpening upscale/simple upscale
- ✨ **CAS Sharpening Algorithm**: Contrast adaptive sharpening based on AMD FidelityFX
- ⚡ **Fast Solution**: Simple upscale + sharpening as high-performance alternative to upscale models
- 🎛️ **Adjustable Sharpening**: Sharpening intensity 0-1, default 0.6
- 🔄 **Perfect Compatibility**: Fully compatible with Impact Pack's Iterative Upscale node
- 🧩 **Tiled VAE Support**: Support tiled VAE for processing ultra-large images
- 🎯 **Sampling Preview**: Support real-time sampling preview and progress display
- 🔌 **Hook Integration**: Full support for Impact Pack's Hook system

#### Working Modes
1. **Model Upscale Mode**: When upscale_model is connected, use model upscaling (high quality but slow)
2. **Sharpening Upscale Mode**: When no model connected and sharpening enabled, use simple upscale + CAS sharpening (fast)
3. **Simple Upscale Mode**: When no model connected and sharpening disabled, use simple upscale only

#### Usage
1. Add `Danbooru > PixelKSampleUpscalerProvider(Sharpening)` node
2. Connect basic parameters:
   - `model`: ComfyUI model
   - `vae`: VAE model
   - `positive/negative`: Positive/negative conditioning
   - `scale_method`: Scaling method (bilinear, lanczos, etc.)
3. Configure sampling parameters:
   - `seed`, `steps`, `cfg`: Standard sampling parameters
   - `sampler_name`, `scheduler`: Sampler and scheduler
   - `denoise`: Denoise strength
4. Configure sharpening parameters:
   - `enable_sharpening`: Enable sharpening (default True)
   - `sharpening_amount`: Sharpening intensity 0-1 (default 0.6)
5. Optional connections:
   - `upscale_model_opt`: Upscale model (when connected, will use model instead of sharpening)
   - `pk_hook_opt`: Impact Pack Hook
6. Output `upscaler` connects to `Iterative Upscale (Image)` node

#### Technical Features
- **Independent Implementation**: Fully independent, no dependency on Impact Pack or ComfyUI Essential
- **High Performance**: CAS sharpening algorithm based on 3x3 neighborhood, computationally efficient
- **Smart Switching**: Automatically switch working mode based on upscale model connection
- **Complete Hook Support**: Supports all 5 Hook points from Impact Pack
- **Preview Support**: Integrated latent_preview system for sampling progress display

#### Use Cases
- **Rapid Iteration**: Use sharpening mode for quick preview during workflow testing
- **Resource Saving**: Sharpening mode doesn't require loading large upscale models, saves VRAM
- **Flexible Switching**: Use sharpening for preview, switch to model upscale for final generation
- **High Resolution**: Work with tiled VAE for ultra-large image upscaling

---

### 💾 Save Image Plus

**Professional Image Saving Node with Full A1111 Format Metadata**

Save Image Plus is a powerful image saving node that automatically collects all metadata (models, prompts, parameters, etc.) from your workflow and embeds them into images in Auto1111 WebUI compatible format, enabling platforms like Civitai to correctly recognize and display resource information.

#### Core Features
- 📋 **Complete Metadata Collection**: Auto-collects Checkpoint, LoRA, VAE, prompts, sampling parameters, etc.
- 🔄 **A1111 Format Compatible**: Generates Auto1111 WebUI compatible metadata format
- 🌐 **Civitai Resource Recognition**: Images uploaded to Civitai correctly display used model resources
- 🎯 **Independent Metadata System**: Uses own metadata_collector module, no dependency on other plugins
- 🔗 **Flexible Prompt Input**: Supports direct prompt input or automatic extraction from workflow
- 💾 **Multiple Format Support**: PNG/JPEG/WebP formats with optional workflow embedding
- 🧹 **Clean Copy**: Optional saving of metadata-free clean image copies
- 👁️ **Preview Control**: Optional UI preview display (performance boost for batch generation)

#### Key Features
- **Smart Hash Calculation**: Complete file read for accurate hash values (consistent with LoRA Manager)
- **Chain Hook Support**: Coexists with other metadata collection plugins (like LoRA Manager) without conflicts
- **Exception Isolation**: Metadata collection errors don't affect main workflow execution
- **Thread Safe**: Supports multiple instances running simultaneously

#### Usage
1. Add `image > Save Image Plus` node
2. Connect image input to save
3. Configure save options:
   - `enable`: Enable/disable saving (skips execution when off)
   - `filename_prefix`: Filename prefix (supports placeholders)
   - `file_format`: Image format (PNG/JPEG/WEBP)
   - `quality`: JPEG/WebP quality (1-100)
   - `embed_workflow`: Embed ComfyUI workflow data (PNG only)
   - `save_clean_copy`: Save additional metadata-free clean copy
   - `enable_preview`: Show preview in UI
4. Optionally connect prompt inputs (otherwise auto-extracted from workflow):
   - `positive_prompt`: Positive prompt
   - `negative_prompt`: Negative prompt
   - `lora_syntax`: LoRA syntax string
   - `checkpoint_name`: Manually pass checkpoint model name (highest priority)

#### Filename Placeholders

The filename prefix supports the following placeholders, which can be flexibly combined:

| Placeholder | Description | Example |
|-------------|-------------|----------|
| `%date%` | Current date and time (default format: yyyyMMddhhmmss) | `20251114143025` |
| `%date:format%` | Custom date and time format | `%date:yyyyMMdd%` → `20251114` |
| `%seed%` | Seed value used for image generation | `12345678` |
| `%model%` | Checkpoint model name used | `realisticVisionV51_v51VAE` |

**Date Format Placeholders**:
- `yyyy`: Four-digit year (2025)
- `yy`: Two-digit year (25)
- `MM`: Month (01-12)
- `dd`: Day (01-31)
- `hh`: Hour (00-23)
- `mm`: Minute (00-59)
- `ss`: Second (00-59)

**Usage Examples**:
```
Example 1: Simple model name
Input: %model%
Output: realisticVisionV51_v51VAE_00001_.png

Example 2: Date and model combination
Input: outputs/%date:yyyyMMdd%/%model%
Output: outputs/20251114/realisticVisionV51_v51VAE_00001_.png

Example 3: Complete combination
Input: %model%_%date:yyyyMMdd_hhmm%_s%seed%
Output: realisticVisionV51_v51VAE_20251114_1430_s12345678_00001_.png
```

#### Metadata Contents
- **Model Info**: Checkpoint name and hash value
- **Prompts**: Positive and negative prompts (supports LoRA syntax)
- **Sampling Parameters**: Steps, CFG, Sampler, Scheduler, etc.
- **LoRA List**: Used LoRAs with their weights
- **Image Dimensions**: Generated image width and height
- **Other Parameters**: VAE, Clip Skip, etc.

#### Use Cases
- **Civitai Display**: Automatically shows used resources when uploaded to Civitai
- **Parameter Recording**: Complete parameter save for easy reproduction
- **Workflow Sharing**: Embedded workflow data for others to use
- **Batch Generation**: Disable preview for better performance in large batches

#### Technical Features
- **Independent Implementation**: No dependency on LoRA Manager or other plugins
- **Full Compatibility**: Hash calculation method fully consistent with LoRA Manager
- **Performance Optimized**: 128KB chunk size for efficient hash calculation
- **Error Handling**: Comprehensive exception handling without affecting main workflow

---

### 🎨 Open In Krita

**Seamless Bridge Between ComfyUI and Krita**

The Open In Krita node implements bidirectional data exchange between ComfyUI and Krita, allowing you to edit ComfyUI-generated images directly in Krita and send the editing results (including selection masks) back to the workflow for continued processing.

#### Core Features
- 🔄 **Bidirectional Data Transfer**: ComfyUI ↔ Krita image and mask data exchange
- 🎨 **Auto-Launch Krita**: Automatically launches Krita when not running
- 🖼️ **Smart Session Management**: Reuses tabs for same images, creates new tabs for different images
- ⏱️ **Real-Time Monitoring**: Waits for user to complete editing in Krita and retrieve data
- 🔌 **Auto Plugin Installation**: Automatically installs and configures Krita plugin on first use
- 🛡️ **Version Sync Updates**: Automatic plugin version detection and updates
- 🎯 **Selection Mask Support**: Full support for Krita selections as mask output
- ⚙️ **Friendly Setup Wizard**: Shows guided dialog when not configured

#### Workflow
1. **Send Image to Krita**:
   - Node execution automatically sends input image to Krita
   - Krita automatically opens image (new tabs for new images, reuses tabs for same images)
   - Node enters waiting state (up to 1 hour)

2. **Edit in Krita**:
   - Freely edit image in Krita (painting, color adjustment, filters, etc.)
   - Can create selections as mask regions
   - Click node's "Fetch from Krita" button when editing is complete

3. **Return Data to ComfyUI**:
   - Node retrieves edited image and selection mask
   - Outputs IMAGE and MASK for connection to subsequent nodes
   - Continue ComfyUI workflow processing

#### Usage
1. **Initial Setup**:
   - Add `Danbooru > Open In Krita` node
   - Setup wizard dialog appears on first execution
   - Choose "Installed, Set Path" or "Not Installed, Go to Website"
   - Plugin automatically installs to Krita (no manual operation needed)

2. **Daily Use**:
   - Connect IMAGE input to node
   - Execute node → Image opens automatically in Krita
   - Edit image in Krita
   - Click "Fetch from Krita" button
   - Get editing results to continue workflow

#### Node Buttons
- 🟢 **Fetch from Krita**: Actively retrieve currently edited image and selection from Krita
- 🔧 **Reinstall Plugin**: Force reinstall Krita plugin (fixes plugin issues)
- ⚙️ **Set Krita Path**: Change Krita executable file path
- ✅ **Check Krita Plugin**: Check plugin installation status and version
- 🛑 **Cancel Execution**: Cancel waiting, interrupt node execution

#### Technical Features
- **File Monitoring Mechanism**: Implements data exchange based on temporary files and request-response pattern
- **Auto Version Management**: Automatically updates Krita plugin when version differences detected
- **Smart Launch**: Detects Krita process status, auto-launches when not running
- **Image Hash Caching**: Avoids repeatedly opening same image
- **Batch Mode**: Krita plugin uses batch mode to avoid save confirmation popups
- **Complete Logging**: Detailed logs help with problem diagnosis

#### System Requirements
- **Krita**: 4.0 or higher
- **Python**: ComfyUI environment (built-in)
- **Optional Dependency**: `psutil` (for process management, improves experience)

#### FAQ
- **Q: Does the plugin need manual enabling?**
  A: No! Plugin is set with `EnabledByDefault=true` during installation, automatically enabled after restarting Krita

- **Q: What if images don't open automatically?**
  A: Check if Krita is running, try clicking the "Check Krita Plugin" button, or view log files

- **Q: How to view detailed logs?**
  A: Log file located at `%TEMP%\open_in_krita\krita_plugin.log` (Windows)

#### Acknowledgments
This node's design is inspired by the following excellent projects:
- [cg-krita](https://github.com/chrisgoringe/cg-krita) - Core ideas for Krita integration
- [comfyui-tooling-nodes](https://github.com/Acly/comfyui-tooling-nodes) - External tool integration reference
- [krita-ai-diffusion](https://github.com/Acly/krita-ai-diffusion) - Krita plugin architecture reference

---

### ⚡ Group Executor Manager

**Efficient Batch Workflow Execution Node**

Group Executor Manager allows you to divide your workflow into multiple groups and execute them sequentially or in parallel, working with Image Cache nodes for efficient batch generation.

#### Core Features
- 🎯 **Group Execution**: Divide nodes into execution groups with flexible flow control
- 🔄 **Sequential/Parallel Modes**: Support for both sequential and parallel execution
- 💾 **Smart Caching**: Work with Image Cache nodes for intermediate result caching
- ⏱️ **Delay Control**: Set inter-group delays to avoid resource conflicts
- 🛡️ **Error Handling**: Comprehensive error handling and retry mechanisms
- 📊 **Execution Monitoring**: Real-time execution progress and status display
- 🎛️ **Visual Configuration**: Intuitive UI configuration interface

#### Use Cases
- **Batch Generation**: Execute in batches when generating large numbers of images to avoid memory overflow
- **Complex Workflows**: Split complex workflows into multiple execution stages
- **Resource Optimization**: Arrange execution order to optimize GPU/memory usage
- **Intermediate Caching**: Cache intermediate results to avoid redundant calculations

#### Usage
1. Add `Danbooru > Group Executor Manager` node
2. Double-click to open configuration interface
3. Create execution groups and add nodes
4. Configure execution mode (sequential/parallel) and delay times
5. Add `Group Executor Trigger` node to start execution

#### Configuration Example
```json
{
  "groups": [
    {
      "name": "Group1-Text2Image",
      "nodes": [1, 2, 3, 4],
      "delay": 0
    },
    {
      "name": "Group2-Image2Image",
      "nodes": [5, 6, 7],
      "delay": 2
    },
    {
      "name": "Group3-PostProcess",
      "nodes": [8, 9, 10],
      "delay": 1
    }
  ],
  "mode": "sequential"
}
```

---

### 🔇 Group Mute Manager

**Visual Group Mute Status Management and Linkage Configuration Node**

Group Mute Manager provides an intuitive interface to manage the mute status of all groups in your workflow, with support for configuring inter-group linkage rules for complex workflow control.

#### Core Features
- 🎛️ **Visual Management**: Intuitive UI for managing all group mute states
- 🔗 **Inter-Group Linkage**: Configure automatic control of other groups when a group is enabled/disabled
- 🎨 **Color Filtering**: Filter and display specific groups by ComfyUI built-in colors
- 🔄 **Native Integration**: Uses ComfyUI native mute functionality (ALWAYS/NEVER mode)
- 🛡️ **Anti-Loop Mechanism**: Intelligent detection and prevention of circular linkages
- 💾 **Persistent Configuration**: Configuration saved to workflow JSON
- 🎯 **Precise Control**: Independent control of each group's mute status

#### Linkage Rules
Group Mute Manager supports two types of linkage triggers:
- **On Enable**: Linkage rules triggered when a group is enabled (unmuted)
- **On Disable**: Linkage rules triggered when a group is disabled (muted)

Each linkage rule can:
- Select target group
- Select action (enable/disable)

#### Usage
1. Add `Danbooru > Group Mute Manager` node
2. Double-click to open management interface
3. Use toggle buttons to control group mute status
4. Click gear button to configure group linkage rules
5. Optionally select color filter to show only specific color groups

#### Use Cases
- **Workflow Debugging**: Quickly enable/disable different parts of workflow
- **Conditional Execution**: Dynamically control which groups execute based on needs
- **Batch Management**: Batch control multiple groups through linkage rules
- **Complex Flows**: Implement complex conditional execution logic

#### Example Configuration
```json
{
  "group_name": "Main Generation Group",
  "enabled": true,
  "linkage": {
    "on_enable": [
      {"target_group": "Preprocessing Group", "action": "enable"},
      {"target_group": "Debug Group", "action": "disable"}
    ],
    "on_disable": [
      {"target_group": "Preprocessing Group", "action": "disable"}
    ]
  }
}
```

**Anti-Loop Example**:
If configured with "Group A enable → enable Group B" and "Group B enable → enable Group A", the system will automatically detect and terminate the loop.

---

### 🧭 Quick Group Navigation

**Global Floating Ball Navigation and Keyboard Shortcut Group Jump Tool**

Quick Group Navigation provides an elegant floating ball interface that allows you to quickly jump to any group in your workflow, with support for custom keyboard shortcuts for one-key navigation.

#### Core Features
- 🎯 **Floating Ball Navigation**: Global draggable floating ball for instant group navigation access
- ⌨️ **Keyboard Shortcuts**: Assign number or letter shortcuts to each group for one-key jumping
- 🔍 **Smart Zoom**: Automatically calculates optimal zoom level to display target group completely
- 🔒 **Lock Mode**: Lock feature to prevent accidental operations
- 🎨 **Smart Positioning**: Panel automatically avoids screen edges for complete display
- 💾 **Workflow Integration**: Navigation configuration saved and migrated with workflow
- 🔄 **Auto-Center**: Automatically centers on target group when jumping
- 📍 **Position Memory**: Floating ball position saved locally

#### Keyboard Shortcut System
- **Number Keys 1-9**: Priority assignment to first 9 groups
- **Letter Keys A-Z**: Automatically assigned when number keys are exhausted
- **Conflict Detection**: Automatically detects and alerts shortcut conflicts
- **Live Recording**: Click button to record new keyboard shortcuts
- **Global Response**: Shortcuts work from anywhere on the canvas

#### Usage
1. Floating ball automatically appears on the right side center of screen
2. Click floating ball to expand navigation panel
3. Click "Add Group" to select groups for navigation
4. Click shortcut button to record custom keyboard shortcut
5. Use shortcuts or click navigation buttons for quick jumping

#### Smart Positioning Features
- **Horizontal Adaptive**: Panel shows on left when ball is on right, and vice versa
- **Vertical Adaptive**: Panel automatically expands upward when ball is at bottom
- **Boundary Protection**: Ensures panel is always fully displayed without being cut off by screen edges
- **Drag-Friendly**: Dragging floating ball doesn't accidentally trigger panel expansion

#### Use Cases
- **Large Workflows**: Quickly jump between different areas of complex workflows
- **Debug & Optimize**: Efficiently locate groups that need debugging
- **Presentation**: Quickly demonstrate different functional modules of workflow
- **Batch Operations**: Work with other managers to quickly switch work areas

#### Toast Notifications
Quick Group Navigation uses the global Toast notification system, providing:
- ✅ **Success Notifications**: Group added, shortcut set successfully
- ⚠️ **Warning Notifications**: Group not found, shortcut conflicts
- ℹ️ **Info Notifications**: All groups added and other status information

---

---

### 🖼️ Image Cache Nodes

**Smart Image Caching and Retrieval Node Group**

Image Cache nodes provide powerful image caching and retrieval functionality, working with Group Executor Manager for efficient batch workflows.

#### Node Types

**1. Image Cache Save**
- 💾 **Auto Caching**: Automatically save images to cache system
- 🏷️ **Prefix Management**: Support custom cache prefix classification
- 📊 **Cache Statistics**: Real-time display of cache count and status
- 🔄 **Auto Update**: Automatically notify related nodes when cache updates

**2. Image Cache Get**
- 🔍 **Smart Retrieval**: Get cached images by prefix and index
- 🔄 **Fallback Modes**: Multiple cache miss handling modes
  - `blank`: Return blank image
  - `default`: Return default placeholder image
  - `error`: Throw error and stop execution
  - `passthrough`: Skip cache check
- 📋 **Batch Retrieval**: Support batch retrieval of multiple cached images
- ⏱️ **Auto Retry**: Automatically retry when cache not ready
- 👁️ **Preview Feature**: Optional cached image preview

#### Core Features
- 🚀 **High Performance**: Fast memory-based caching system
- 🔐 **Permission Control**: Work with Group Executor Manager's permission system
- 🎯 **Precise Positioning**: Support prefix + index for precise retrieval
- 📊 **Real-time Notification**: WebSocket real-time cache update notifications
- 💡 **Smart Cleanup**: Automatically clean expired cache

#### Usage

**Basic Flow**:
1. Add `Image Cache Save` node in the first group
2. Connect image output to be cached
3. Set cache prefix (e.g., "base_image")
4. Add `Image Cache Get` node in subsequent groups
5. Use the same prefix and index to retrieve cached images

**Group Execution Example**:
```
Group1: Text2Image → Cache Save(prefix="txt2img")
Group2: Cache Get(prefix="txt2img") → Image2Image → Cache Save(prefix="img2img")
Group3: Cache Get(prefix="img2img") → PostProcess → Output
```

#### Application Scenarios
- **Multi-stage Generation**: Text2Image → Image2Image → Upscale → PostProcess
- **Batch Processing**: Batch processing of large numbers of images
- **Experiment Comparison**: Save intermediate results for different parameter comparisons
- **Memory Optimization**: Avoid loading all intermediate results simultaneously

---

### 📝 Text Cache Nodes

**Smart Text Caching and Retrieval Node Group**

Text Cache nodes provide powerful text data caching and retrieval functionality with multi-channel management, allowing text to be passed and shared across different parts of the workflow.

#### Node Types

**1. Global Text Cache Save**
- 💾 **Auto Caching**: Automatically save text to specified channels
- 🏷️ **Channel Management**: Support custom channel name classification
- 👁️ **Node Monitoring**: Monitor other node widget changes and auto-update cache
- 📊 **Real-time Preview**: Display cached text content and length
- 🔄 **Auto Notification**: Automatically notify retrieval nodes when cache updates

**2. Global Text Cache Get**
- 🔍 **Smart Retrieval**: Get cached text by channel name
- 🔄 **Dynamic Channels**: Dropdown menu automatically displays all defined channels
- 📋 **Persistence**: Automatically save channel configuration when saving workflow
- 👁️ **Preview Feature**: Display retrieved text content and source
- ⏱️ **Auto Update**: Monitor cache changes and auto-refresh

**3. Text Cache Viewer**
- 📊 **Real-time Monitoring**: Display status and content of all text cache channels in real-time
- 🔍 **Complete Preview**: View detailed information for each channel (name, length, update time, content)
- 📝 **Content Viewing**: Support scrolling to view complete text content (max 3 lines display, scrollbar for overflow)
- ⏰ **Time Tracking**: Display relative update times (just now/minutes ago/hours ago/days ago)
- 🔄 **Auto Refresh**: WebSocket real-time updates, automatically refresh when cache changes
- 🎨 **Beautiful Interface**: Purple-themed UI with emoji icons and clean card-style layout
- 🖱️ **Manual Refresh**: Provides refresh button for manual content updates

#### Core Features
- 🚀 **High Performance**: Fast memory-based caching system
- 🔐 **Thread-Safe**: Uses recursive locks to ensure multi-thread safety
- 🎯 **Precise Positioning**: Accurately retrieve text by channel name
- 📊 **Real-time Notification**: WebSocket real-time cache update notifications
- 💡 **Smart Validation**: Automatically validate channel validity

#### Usage

**Basic Flow**:
1. Add `Global Text Cache Save` node in workflow
2. Connect text output to be cached
3. Set channel name (e.g., "my_prompt")
4. Add `Global Text Cache Get` node in another location
5. Select the same channel name to retrieve text

**Monitor Other Nodes**:
1. Configure `monitor_node_id` in save node (ID of node to monitor)
2. Configure `monitor_widget_name` (widget name to monitor)
3. Cache automatically updates when monitored widget value changes

**Usage Example**:
```
Node A (Text Generator)
  ↓ positive output
Save Node (channel="positive_prompt")

Node B (Other Location)
  ← Get Node (channel="positive_prompt")
```

#### Application Scenarios
- **Prompt Reuse**: Use the same prompt in multiple places
- **Dynamic Monitoring**: Monitor text input node changes and auto-update
- **Workflow Communication**: Pass text information between different parts of workflow
- **Parameter Sharing**: Share configuration parameters to multiple nodes
- **Debug Assistant**: Temporarily save and view intermediate text results

---

### 📐 Resolution Master Simplify

**Visual Resolution Control Node**

A simplified version based on Resolution Master, providing intuitive 2D canvas interactive resolution control focused on core functionality.

#### Core Features
- 🎨 **2D Interactive Canvas**: Visual drag-and-drop resolution adjustment
- 🎯 **Three Control Points System**:
  - White main control point - Controls both width and height
  - Blue width control - Adjusts width independently
  - Pink height control - Adjusts height independently
- 🧲 **Canvas Snapping**: Default snap to grid, hold Ctrl for fine adjustment
- 📋 **SDXL Presets**: 9 built-in SDXL resolution presets (sorted by size)
- 💾 **Custom Presets**: Save and manage custom resolution presets
- 📊 **Real-time Display**: Output pins show current resolution (color-coded for width/height)
- 📐 **Resolution Range**: 64×64 to 2048×2048

#### Key Features
- ✨ **Exact Original Styling**: Maintains consistent visual style with Resolution Master
- 🎯 **Simplified Design**: Removes complex features like Actions, Scaling, Auto-Detect
- 🚀 **Lightweight & Efficient**: Focuses on core resolution control with clean interface
- 🎨 **Visual Feedback**: Blue/pink output numbers match control point colors

#### Usage
1. Add `Danbooru > Resolution Master Simplify` node
2. Drag control points on 2D canvas to adjust resolution:
   - Drag white main control: Adjust both width and height
   - Drag blue control: Adjust width only
   - Drag pink control: Adjust height only
3. Click preset dropdown to select common resolutions
4. Click 💾 button to save current resolution as custom preset
5. Connect `width` and `height` outputs to other nodes

#### Built-in Preset List
- 768×1024 (0.79 MP)
- 640×1536 (0.98 MP)
- 832×1216 (1.01 MP)
- 896×1152 (1.03 MP)
- 768×1344 (1.03 MP)
- 915×1144 (1.05 MP)
- 1254×836 (1.05 MP)
- 1024×1024 (1.05 MP)
- 1024×1536 (1.57 MP)

---

### 📦 Simple Checkpoint Loader

**Checkpoint Loader with Custom VAE Support**

Based on ComfyUI_Mira's Checkpoint Loader with Name node, enhanced with VAE selection functionality from ComfyUI-Easy-Use's simple loader, allowing users to choose between built-in VAE or custom VAE files.

#### Core Features
- 📦 **Checkpoint Loading**: Load diffusion model checkpoints
- 🎨 **VAE Selection**: Support for built-in VAE or custom VAE files
- 📝 **Model Name Output**: Returns model name for downstream nodes
- 🔄 **Complete Outputs**: Returns MODEL, CLIP, VAE, and model name

#### Usage
1. Add `danbooru > Simple Checkpoint Loader` node
2. Select checkpoint model from dropdown list
3. Choose VAE option:
   - **Baked VAE**: Use checkpoint's built-in VAE (default)
   - **Custom VAE**: Select from available VAE files
4. Connect outputs to other nodes:
   - `MODEL`: Model for sampling
   - `CLIP`: CLIP model for text encoding
   - `VAE`: VAE model for encoding/decoding
   - `model_name`: Model name string

#### Use Cases
- **Quick Loading**: Simplified checkpoint loading workflow
- **VAE Experimentation**: Quickly test different VAEs' effects on generation
- **Workflow Optimization**: Unified loading interface for workflow management
- **Model Comparison**: Track used models with model name output

#### Code Sources
This node is based on code from:
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - Checkpoint Loader with Name node
- [ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use) - VAE selection functionality from simple loader

---

### 🔔 Simple Notify

**System Notification and Sound Effect Combined Node**

Simple Notify node combines system notification and sound effect playback functions, providing instant visual and audio feedback when workflows complete.

#### Core Features
- 🔔 **System Notification**: Display system notification when workflow completes
- 🔊 **Sound Playback**: Play notification sound to remind task completion
- 🎛️ **Independent Control**: Separately toggle notification and sound on/off
- 📝 **Custom Message**: Support custom notification message content
- 🔊 **Volume Control**: Adjustable sound effect volume
- 🔗 **Workflow Chaining**: Preserves input/output pins for workflow chaining

#### Usage
1. Add `danbooru > Simple Notify` node
2. Connect upstream node's output to `any` input pin
3. Configure parameters:
   - `message`: Notification message content (default: "Task completed")
   - `volume`: Sound effect volume 0-1 (default: 0.5)
   - `enable_notification`: Enable system notification (default: True)
   - `enable_sound`: Enable sound effect (default: True)
4. Node passes through input data to output pin, can continue connecting subsequent nodes

#### Application Scenarios
- **Long-task Reminders**: Get notified when long-running workflows complete
- **Batch Generation Monitoring**: Timely understand completion status during batch image generation
- **Multi-task Management**: Distinguish completion status when running multiple workflows simultaneously
- **Unattended Operation**: Know task completion even when away from computer

#### Usage Example
```
Text2Image → Image2Image → Upscale → Simple Notify(message="Image generation complete!", volume=0.7) → Save Image
```

#### Code Sources
This node's functionality is based on:
- [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts) - SystemNotification and PlaySound nodes

---

### ✂️ Simple String Split

**Lightweight String Splitting Tool Node**

Simple String Split node provides basic string splitting functionality, dividing input strings into string arrays by specified delimiter, automatically removing leading and trailing whitespace.

#### Core Features
- ✂️ **Clean Splitting**: Split strings into arrays by delimiter
- 🧹 **Auto Cleanup**: Automatically remove leading and trailing whitespace from each element
- 🎯 **Precise Output**: Return only actual content without padding empty elements
- 🔧 **Flexible Choice**: Support two common delimiters: comma and pipe
- 📋 **List Output**: Directly output string arrays for easy subsequent processing

#### Usage
1. Add `danbooru > Simple String Split` node
2. Enter the string to split in the `string` parameter
3. Select `split` delimiter type:
   - `,` (comma) - Default option
   - `|` (pipe)
4. Node outputs string array, can connect to nodes supporting list input

#### Input Parameters
- **string** (STRING): String to split
- **split** (optional): Delimiter type, supports `,` and `|`

#### Output Parameters
- **STRING** (list): String array after splitting

#### Usage Examples

**Example 1: Split Tag List**
```
Input: "face, eyes, hand"
Delimiter: ,
Output: ["face", "eyes", "hand"]
```

**Example 2: Pipe Delimiter**
```
Input: "option1 | option2 | option3"
Delimiter: |
Output: ["option1", "option2", "option3"]
```

**Example 3: Auto Whitespace Cleanup**
```
Input: "  tag1  ,  tag2  ,  tag3  "
Delimiter: ,
Output: ["tag1", "tag2", "tag3"]
```

#### Application Scenarios
- **Tag Processing**: Split comma-separated tag lists
- **Configuration Parsing**: Parse configuration strings into arrays
- **Data Preprocessing**: Convert string data to list format
- **Batch Operations**: Prepare parameter lists for batch processing

#### Code Sources
This node is simplified from:
- [cg-image-filter](https://github.com/chrisgoringe/cg-image-filter) - Split String by Commas node

---

### 🔀 Simple Value Switch

**Priority Value Selection Node**

Simple Value Switch node accepts any number and type of inputs, and outputs the first non-empty value. This is a universal value priority selection tool that can be used for default value fallback, conditional value selection, and other scenarios.

#### Core Features
- 🔀 **Priority Selection**: Iterates through all inputs and returns the first non-empty value
- 🎯 **Any Type Support**: Supports all ComfyUI types including images, text, models, etc.
- 🔢 **Dynamic Inputs**: Supports any number of input pins (progressive addition)
- 🧠 **Smart Empty Check**: Not only checks None, but also recognizes empty dicts, empty objects, etc.
- 🔗 **Workflow Flexibility**: Simplifies conditional logic, reduces branching node usage

#### How It Works

The node checks all input values in order:
1. Starts iterating from the first input
2. Checks if the value is empty (None, empty dict, empty Context, etc.)
3. Returns the first non-empty value
4. Returns None if all values are empty

#### Usage
1. Add `danbooru > Simple Value Switch` node
2. Connect multiple possible input values (from high to low priority)
3. The first input is automatically displayed, subsequent inputs appear after connection
4. Node outputs the first non-empty input value

#### Input Parameters
- **value_1, value_2, ...** (Any type, optional): Candidate values in priority order
  - All inputs are optional
  - Supports any ComfyUI type (wildcard type `*`)
  - Input count expands dynamically (frontend auto-manages)

#### Output Parameters
- **output** (Any type): The first non-empty input value, None if all are empty

#### Usage Examples

**Example 1: Default Value Fallback**
```
User Input Value (may be empty) → value_1
Default Value "hello"           → value_2
                                   ↓
                                Output: User input if available, otherwise default
```

**Example 2: Multi-Priority Selection**
```
High Priority Param (may be unavailable) → value_1
Medium Priority Param (backup)           → value_2
Low Priority Param (fallback)            → value_3
                                            ↓
                                         Output: First available parameter
```

**Example 3: Conditional Image Selection**
```
Image from Conditional Path A → value_1
Image from Conditional Path B → value_2
Default Placeholder Image     → value_3
                                ↓
                             Output: First successfully generated image
```

#### Application Scenarios
- **Default Values**: Provide default value fallback mechanism
- **Conditional Selection**: Simplify multi-condition value selection logic
- **Error Handling**: Automatically use backup value when primary value is unavailable
- **Parameter Optimization**: Flexibly switch between different parameter sources
- **Workflow Simplification**: Reduce complex Switch node chains

#### Empty Value Judgment Rules

The node uses enhanced empty value judgment logic:
- `None` → Empty
- `{}` (empty dict) → Empty
- Empty Context object → Empty
- All other values → Non-empty (including `0`, `False`, `""`, etc.)

**Note**: Empty string `""`, number `0`, boolean `False` are considered **non-empty** valid values

#### Technical Highlights
- **Wildcard Type**: Uses AnyType (`*`) to support all ComfyUI types
- **Progressive Inputs**: Frontend JavaScript dynamically manages input pins
- **Performance Optimization**: Short-circuit evaluation, returns immediately upon finding first non-empty value
- **Type Safety**: Preserves input type, no type conversion

---

## Installation

### Method 1: ComfyUI Manager Installation (Recommended)

1. Open Manager interface in ComfyUI
2. Click "Install Custom Nodes"
3. Search for "Danbooru Gallery" or "ComfyUI-Danbooru-Gallery"
4. Click "Install" button
5. Restart ComfyUI

### Method 2: Automatic Installation

```bash
# 1. Clone to ComfyUI/custom_nodes/ directory
git clone https://github.com/comfyui-extensions/comfyui-danbooru-gallery.git

# 2. Run installation script
cd comfyui-danbooru-gallery
python install.py

# 3. Restart ComfyUI
```

### Method 3: Manual Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

---

## System Requirements

- **Python**: 3.8+
- **ComfyUI**: Latest version

### Core Dependencies

- `requests>=2.28.0` - HTTP request library
- `aiohttp>=3.8.0` - Async HTTP client
- `Pillow>=9.0.0` - Image processing library
- `torch>=1.12.0` - PyTorch framework
- `numpy>=1.21.0` - Numerical computing library

---

## Advanced Features

### 🔐 User Authentication System
- Support for Danbooru username and API key authentication
- Access to favorites and advanced features after authentication
- Automatic authentication status and network connection verification

### 🈳 Chinese-English Bilingual System
- **Bidirectional Translation**: Automatic translation of English tags to Chinese descriptions
- **Chinese Search**: Support for searching with Chinese input to find corresponding English tags
- **Fuzzy Matching**: Support for Chinese pinyin and partial character matching
- **Batch Translation**: Efficient batch tag translation processing
- **Real-time Hints**: Display Chinese translations during autocomplete

#### Translation Data Formats
- **JSON Format** (`zh_cn/all_tags_cn.json`): English tag to Chinese key-value mapping
- **CSV Format** (`zh_cn/danbooru.csv`): English tag, Chinese translation CSV file
- **Character CSV** (`zh_cn/wai_characters.csv`): Chinese character name, English tag CSV file

### ⚙️ Advanced Settings
- **Multi-language Support**: Chinese/English interface switching
- **Blacklist Management**: Custom filtering of unwanted tags
- **Prompt Filtering**: Automatic filtering of watermarks, usernames, etc.
- **Debug Mode**: Enable detailed logging output
- **Page Size**: Customize number of images displayed per page

---

## Project Structure

```
ComfyUI-Danbooru-Gallery/
├── py/                             # Backend Python modules
│   ├── __init__.py                 # Plugin entry point
│   ├── danbooru_gallery/           # Danbooru Gallery module
│   │   ├── __init__.py
│   │   ├── danbooru_gallery.py     # Backend logic
│   │   └── zh_cn/                  # Chinese translation data
│   │       ├── all_tags_cn.json
│   │       ├── danbooru.csv
│   │       └── wai_characters.csv
│   ├── character_feature_swap/     # Character Feature Swap module
│   │   ├── __init__.py
│   │   └── character_feature_swap.py
│   ├── prompt_selector/            # Prompt Selector module
│   │   ├── __init__.py
│   │   ├── prompt_selector.py
│   │   └── default.json            # Default prompts
│   ├── multi_character_editor/     # Multi Character Editor module
│   │   ├── __init__.py
│   │   ├── multi_character_editor.py
│   │   └── doc/                    # Syntax documentation
│   │       ├── complete_syntax_guide.md
│   │       └── complete_syntax_guide_en.md
│   ├── prompt_cleaning_maid/       # Prompt Cleaning Maid module
│   │   ├── __init__.py
│   │   └── prompt_cleaning_maid.py
│   ├── parameter_control_panel/    # Parameter Control Panel module
│   │   ├── __init__.py
│   │   └── parameter_control_panel.py
│   ├── parameter_break/            # Parameter Break module
│   │   ├── __init__.py
│   │   └── parameter_break.py
│   ├── workflow_description/       # Workflow Description module
│   │   ├── __init__.py
│   │   └── workflow_description.py
│   ├── simple_image_compare/       # Simple Image Compare module
│   │   ├── __init__.py
│   │   └── simple_image_compare.py
│   ├── simple_load_image/          # Simple Load Image module
│   │   ├── __init__.py
│   │   └── simple_load_image.py
│   ├── save_image_plus/            # Save Image Plus module
│   │   ├── __init__.py
│   │   ├── save_image_plus.py
│   │   └── hash_cache_manager.py
│   ├── metadata_collector/         # Metadata Collector module
│   │   ├── __init__.py
│   │   ├── metadata_hook.py        # Hook Installation
│   │   ├── metadata_registry.py   # Metadata Registry
│   │   ├── metadata_processor.py  # Metadata Processor
│   │   ├── node_extractors.py     # Node Extractors
│   │   └── constants.py            # Constants
│   ├── group_executor_manager/     # Group Executor Manager module
│   │   ├── __init__.py
│   │   ├── group_executor_manager.py
│   │   └── execution_coordinator.py
│   ├── group_executor_trigger/     # Group Executor Trigger module
│   │   ├── __init__.py
│   │   └── group_executor_trigger.py
│   ├── group_mute_manager/         # Group Mute Manager module
│   │   ├── __init__.py
│   │   └── group_mute_manager.py
│   ├── quick_group_navigation/     # Quick Group Navigation module
│   │   └── __init__.py
│   ├── image_cache_save/           # Image Cache Save module
│   │   ├── __init__.py
│   │   └── image_cache_save.py
│   ├── image_cache_get/            # Image Cache Get module
│   │   ├── __init__.py
│   │   └── image_cache_get.py
│   ├── image_cache_manager/        # Image Cache Manager module
│   │   ├── __init__.py
│   │   └── image_cache_manager.py
│   ├── global_text_cache_save/     # Global Text Cache Save module
│   │   ├── __init__.py
│   │   └── global_text_cache_save.py
│   ├── global_text_cache_get/      # Global Text Cache Get module
│   │   ├── __init__.py
│   │   └── global_text_cache_get.py
│   ├── text_cache_manager/         # Text Cache Manager module
│   │   ├── __init__.py
│   │   ├── text_cache_manager.py
│   │   └── api.py
│   ├── text_cache_viewer/          # Text Cache Viewer module
│   │   ├── __init__.py
│   │   └── text_cache_viewer.py
│   ├── resolution_master_simplify/ # Resolution Master Simplify module
│   │   ├── __init__.py
│   │   └── resolution_master_simplify.py
│   ├── simple_checkpoint_loader_with_name/  # Simple Checkpoint Loader module
│   │   ├── __init__.py
│   │   ├── simple_checkpoint_loader_with_name.py
│   │   └── preview_api.py
│   ├── simple_notify/              # Simple Notify module
│   │   ├── __init__.py
│   │   └── simple_notify.py
│   ├── simple_string_split/        # Simple String Split module
│   │   ├── __init__.py
│   │   └── simple_string_split.py
│   ├── simple_value_switch/        # Simple Value Switch module
│   │   ├── __init__.py
│   │   └── simple_value_switch.py
│   ├── open_in_krita/              # Open In Krita module
│   │   ├── __init__.py
│   │   ├── open_in_krita.py        # Main node logic
│   │   ├── krita_manager.py        # Krita path manager
│   │   ├── plugin_installer.py    # Plugin auto-installer
│   │   ├── reinstall_krita_plugin.py
│   │   └── uninstall_krita_plugin.py
│   ├── shared/                     # Shared modules
│   │   ├── __init__.py
│   │   ├── cache/                  # Cache system
│   │   │   ├── autocomplete_cache.py
│   │   │   └── autocomplete_db.py
│   │   ├── db/                     # Database utilities
│   │   │   ├── db_manager.py
│   │   │   └── tag_database.py
│   │   ├── fetcher/                # Data fetchers
│   │   │   ├── api_fetcher.py
│   │   │   └── image_fetcher.py
│   │   ├── sync/                   # Sync modules
│   │   │   ├── cloud_sync.py
│   │   │   ├── favorites_manager.py
│   │   │   ├── server.py
│   │   │   └── settings_manager.py
│   │   └── translation/            # Translation utilities
│   │       ├── translator.py
│   │       └── zh_translator.py
│   └── utils/                      # Utility modules
│       ├── config_api.py
│       ├── config_manager.py
│       ├── image_processor.py
│       ├── logger.py
│       ├── logger_api.py
│       └── toast_api.py
├── js/                             # Frontend JavaScript modules
│   ├── danbooru_gallery/           # Danbooru Gallery frontend
│   │   └── danbooru_gallery.js
│   ├── character_feature_swap/     # Character Feature Swap frontend
│   │   └── character_feature_swap.js
│   ├── prompt_selector/            # Prompt Selector frontend
│   │   └── prompt_selector.js
│   ├── multi_character_editor/     # Multi Character Editor frontend
│   │   ├── multi_character_editor.js
│   │   ├── character_editor.js
│   │   ├── mask_editor.js
│   │   ├── output_area.js
│   │   ├── preset_manager.js
│   │   └── settings_menu.js
│   ├── prompt_cleaning_maid/       # Prompt Cleaning Maid frontend
│   │   └── prompt_cleaning_maid.js
│   ├── parameter_control_panel/    # Parameter Control Panel frontend
│   │   └── parameter_control_panel.js
│   ├── parameter_break/            # Parameter Break frontend
│   │   └── parameter_break.js
│   ├── workflow_description/       # Workflow Description frontend
│   │   └── workflow_description.js
│   ├── simple_image_compare/       # Simple Image Compare frontend
│   │   └── simple_image_compare.js
│   ├── simple_load_image/          # Simple Load Image frontend
│   │   └── simple_load_image.js
│   ├── simple_checkpoint_loader_with_name/  # Simple Checkpoint Loader frontend
│   │   └── preview.js
│   ├── simple_notify/              # Simple Notify frontend
│   │   └── simple_notify.js
│   ├── simple_value_switch/        # Simple Value Switch frontend
│   │   └── simple_value_switch.js
│   ├── native-execution/           # Native execution system
│   │   ├── cache-control-events.js
│   │   ├── execution-engine.js
│   │   ├── execution-lock.js
│   │   └── state-manager.js
│   ├── group_executor/             # Group Executor frontend
│   │   └── group_executor_manager.js
│   ├── group_mute_manager/         # Group Mute Manager frontend
│   │   └── group_mute_manager.js
│   ├── quick_group_navigation/     # Quick Group Navigation frontend
│   │   ├── quick_group_navigation.js
│   │   ├── floating_navigator.js
│   │   └── styles.css
│   ├── image_cache/                # Image Cache frontend
│   │   ├── image_cache_save.js
│   │   ├── image_cache_get.js
│   │   ├── image_cache_toast.js
│   │   └── image_cache_channel_updater.js
│   ├── global_text_cache_save/     # Global Text Cache Save frontend
│   │   └── global_text_cache_save.js
│   ├── global_text_cache_get/      # Global Text Cache Get frontend
│   │   └── global_text_cache_get.js
│   ├── text_cache/                 # Text Cache frontend
│   │   └── text_cache_channel_updater.js
│   ├── text_cache_viewer/          # Text Cache Viewer frontend
│   │   └── text_cache_viewer.js
│   ├── resolution_master_simplify/ # Resolution Master Simplify frontend
│   │   └── resolution_master_simplify.js
│   ├── open_in_krita/              # Open In Krita frontend
│   │   ├── open_in_krita.js
│   │   └── setup_dialog.js
│   ├── utils/                      # Frontend utilities
│   │   └── error_rate_limiter.js
│   └── global/                     # Global shared components
│       ├── autocomplete_cache.js
│       ├── autocomplete_ui.js
│       ├── color_manager.js
│       ├── debug_config.js
│       ├── logger_client.js
│       ├── multi_language.js
│       ├── tag_sync_listener.js
│       ├── toast_manager.js
│       └── translations/
│           ├── chinese.js
│           ├── english.js
│           ├── group_executor_translations.js
│           ├── multi_character_translations.js
│           ├── parameter_panel_translations.js
│           ├── prompt_selector_translations.js
│           └── resolution_simplify_translations.js
├── krita_files/open_in_krita/      # Krita plugin source files
│   ├── __init__.py
│   ├── extension.py                # Krita extension main logic
│   ├── communication.py            # ComfyUI communication module
│   └── logger.py                   # Logger
├── tools/                          # Development tools
│   ├── debug_metadata.py           # Metadata debug tool
│   ├── force_delete_db.py          # Force delete database
│   ├── migrate_debug_print.py      # Migrate debug print
│   ├── migrate_print.py            # Migrate print statements
│   ├── replace_console_to_logger.py # Replace console to logger
│   ├── test_db_health.py           # Database health test
│   └── README.md                   # Tools documentation
├── config.json                     # Plugin configuration
├── requirements.txt                # Python dependencies
├── pyproject.toml                  # Python project metadata
├── package-lock.json               # Node.js dependencies lock
└── README.md                       # Documentation
```

---

## Troubleshooting

- **Connection Issues**: Check network and API key
- **Image Loading Fails**: Verify disk space and image URLs
- **Plugin Not Showing**: Check directory location and dependencies
- **Multi Character Editor Not Working**: Ensure comfyui-prompt-control plugin is installed
- **Performance Issues**: Check console logs for detailed information

---

## 开发 | Development

### 技术栈 | Tech Stack

- **Backend**: Python + aiohttp + requests
- **Frontend**: JavaScript + ComfyUI UI
- **Cache**: File system cache
- **API**: Danbooru REST API

### 贡献 | Contributing

欢迎提交 Issue 和 Pull Request！  
Issues and Pull Requests are welcome!

---

## 许可证 | License

GPL-3.0-or-later License

---

## 致谢 | Acknowledgments

- 感谢 Danbooru 提供优秀的 API | Thanks to Danbooru for the excellent API
- 感谢 ComfyUI 社区 | Thanks to the ComfyUI community
- 参考了 ComfyUI_Civitai_Gallery 项目 | Inspired by ComfyUI_Civitai_Gallery project

### 核心功能参考 | Core Feature References

- [ComfyUI-CRZnodes](https://github.com/CoreyCorza/ComfyUI-CRZnodes) - 参数展开节点的自动选项同步功能设计参考 | Design reference for auto option synchronization in Parameter Break node
- [Comfyui-LG_GroupExecutor](https://github.com/LAOGOU-666/Comfyui-LG_GroupExecutor) - 组执行管理器和图像缓存节点的设计思路来源 | Design inspiration for Group Executor Manager and Image Cache nodes
- [rgthree-comfy](https://github.com/rgthree/rgthree-comfy) - 组静音管理器和简易图像对比节点的核心代码参考 | Core code reference for Group Mute Manager and Simple Image Compare node
- [Comfyui-Resolution-Master](https://github.com/Azornes/Comfyui-Resolution-Master) - 分辨率大师简化版的原版参考 | Original reference for Resolution Master Simplify
- [comfyui-adaptiveprompts](https://github.com/Alectriciti/comfyui-adaptiveprompts) - 提示词清洁女仆节点的代码来源 | Source code for Prompt Cleaning Maid node
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - 简易Checkpoint加载器的基础代码来源 | Base code source for Simple Checkpoint Loader
- [ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use) - 简易Checkpoint加载器的VAE选择功能参考 | VAE selection functionality reference for Simple Checkpoint Loader
- [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes) - 文本缓存节点的动态combo实现参考 | Dynamic combo implementation reference for Text Cache nodes
- [ComfyUI-Lora-Manager](https://github.com/willmiao/ComfyUI-Lora-Manager) - Save Image Plus 的哈希计算方法参考，元数据收集思路来源 | Hash calculation method reference for Save Image Plus, metadata collection inspiration
- [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts) - 简易通知节点的功能参考 | Functionality reference for Simple Notify node
- [cg-image-filter](https://github.com/chrisgoringe/cg-image-filter) - 简易字符串分隔节点的基础代码来源 | Base code source for Simple String Split node
- [cg-krita](https://github.com/chrisgoringe/cg-krita) - Open In Krita节点的设计思路来源 | Design inspiration for Open In Krita node
- [comfyui-tooling-nodes](https://github.com/Acly/comfyui-tooling-nodes) - Open In Krita节点的Krita集成思路参考 | Krita integration reference for Open In Krita node
- [krita-ai-diffusion](https://github.com/Acly/krita-ai-diffusion) - Open In Krita节点的Krita插件通信机制参考 | Krita plugin communication mechanism reference for Open In Krita node

### 翻译文件来源 | Translation Data Sources

- [danbooru-diffusion-prompt-builder](https://github.com/wfjsw/danbooru-diffusion-prompt-builder) - Danbooru 标签翻译数据
- [zh_CN-Tags](https://github.com/Yellow-Rush/zh_CN-Tags) - 中文标签数据
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - 角色翻译数据