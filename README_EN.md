# Aaalice's Custom Nodes

**中文** | [English](README_EN.md)

<img width="966" height="830" alt="image" src="https://github.com/user-attachments/assets/e2a5d34e-0001-417e-bf8e-7753521ea0d3" />

---

> [!NOTE]
> **Project Description**
> This project is a series of ComfyUI nodes custom-developed specifically for the [ShiQi_Workflow](https://github.com/Aaalice233/ShiQi_Workflow).

---

## Table of Contents

- [Introduction](#introduction)
- [Main Features](#main-features)
- [Node Introduction](#node-introduction)
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
- [Installation Instructions](#installation-instructions)
- [System Requirements](#system-requirements)
- [Advanced Features](#advanced-features)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Development](#development--development)
- [License](#license--license)
- [Acknowledgments](#acknowledgments--acknowledgments)

---

## Introduction

A powerful ComfyUI plugin suite containing four core nodes, providing a complete prompt management and image resource solution for AI image generation workflows. Built based on the Danbooru API, it supports advanced features such as image search, prompt editing, character feature replacement, and multi-character regional prompts.

## Main Features

- 🔍 **Smart Image Search**: Precise tag search based on Danbooru API
- 🎨 **Visual Editing**: Intuitive canvas editing and drag-and-drop operations
- 🤖 **AI Smart Processing**: Utilizes LLM for intelligent character feature replacement
- 📚 **Prompt Management**: Categorized management and selection of common prompt libraries
- 👥 **Multi-Character Support**: Visual editing of multi-character regional prompts
- 🌐 **Multi-language Interface**: Seamless switching between Chinese and English interfaces
- 🈳 **Chinese-English Tag Translation**: Supports mutual translation and search of Chinese and English tags
- ⭐ **Cloud Sync**: Cloud synchronization for favorites and configurations
- 🎯 **Workflow Integration**: Perfectly integrated into ComfyUI workflows

---

## Node Introduction

### 🖼️ Danbooru Gallery (Danbooru Images Gallery)

**Core Image Search and Management Node**

This is the main node of the plugin, providing image search, preview, download, and prompt extraction functions based on the Danbooru API.

#### Main Functions
- 🔍 **Advanced Tag Search**: Supports compound tag search and exclusion syntax
- 📄 **Smart Pagination**: Efficient pagination loading mechanism
- 💡 **Smart Completion**: Real-time tag auto-completion and Chinese prompts
- 🎨 **High-Quality Preview**: Responsive waterfall layout
- 📊 **Content Rating**: Supports filtering by image rating
- 🏷️ **Tag Categorization**: Selectable output tag categories
- ⭐ **Favorites System**: Cloud-synced favorites functionality
- ✍️ **Prompt Editing**: Built-in prompt editor
- 🔐 **User Authentication**: Supports Danbooru account login

#### Usage Method
1. Add the `Danbooru > Danbooru Images Gallery` node in ComfyUI
2. Double-click the node to open the gallery interface
3. Enter search tags, supports syntax:
   - Normal tags: `1girl blue_eyes`
   - Exclude tags: `1girl -blurry`
   - Compound search: `1girl blue_eyes smile -blurry`
4. Select images and import prompts into the workflow

---

### 🔄 Character Feature Swap (Character Feature Swap)

**AI-Driven Intelligent Character Feature Replacement Node**

Utilizes large language model APIs to intelligently replace character features in prompts, changing character attributes while maintaining composition and environment.

#### Core Functions
- 🤖 **Intelligent Understanding**: Uses LLM to understand and replace character features
- 🌐 **Multi-API Support**: Supports OpenRouter, Gemini, DeepSeek, etc.
- ⚙️ **Highly Configurable**: Custom API services and model selection
- 📋 **Preset Management**: Save and switch feature replacement presets
- 🔧 **Easy Configuration**: Independent settings interface and connection testing

#### Supported API Services
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Gemini API**: `https://generativelanguage.googleapis.com/v1beta`
- **DeepSeek**: `https://api.deepseek.com/v1`
- **OpenAI Compatible**: Custom service addresses
- **Gemini CLI**: Local execution (requires `@google/gemini-cli` installation)

#### Usage Steps
1. Add `Danbooru > Character Feature Swap` node
2. Click "Settings" button to configure API
3. Connect inputs:
   - `original_prompt`: Original prompt
   - `character_prompt`: New character feature description
4. Get `new_prompt` output

---

### 📚 Prompt Selector (Prompt Selector)

**Professional Prompt Library Management Node**

Categorizes, manages, and selects common prompts, builds personal prompt libraries, and improves workflow efficiency.

#### Core Functions
- 📁 **Category Management**: Create multiple categories to organize prompts
- 🖼️ **Preview Image Support**: Add visual previews for prompts
- 📦 **Import/Export**: Complete `.zip` format backup and sharing
- 🔄 **Batch Operations**: Supports batch deletion and moving
- ⭐ **Favorite Sorting**: Drag-and-drop sorting and common marking
- 🔗 **Flexible Concatenation**: Concatenate with upstream node outputs

#### Usage Method
1. Add `Danbooru > Prompt Selector` node
2. Double-click to open management interface, build prompt library
3. Select required prompts
4. Optionally connect `prefix_prompt` input
5. Get concatenated `prompt` output

---

### 👥 Multi Character Editor (Multi Character Editor)

**Visual Multi-Character Regional Prompt Editing Node**

Professional visual editor supporting the creation of multi-character regional prompts, precisely controlling character positions and attributes.

#### Core Functions
- 🎨 **Visual Editing**: Intuitive canvas drag-and-drop editing
- 🔄 **Dual Syntax Support**: Attention Couple and Regional Prompts
- 📐 **Precise Control**: Percentage and pixel coordinate positioning
- 🌊 **Feathering Effect**: Edge feathering for natural transitions
- ⚖️ **Weight Management**: Independent character weight control
- 💾 **Preset System**: Save and load character configurations
- ⚡ **Real-time Preview**: Instant syntax preview generation
- ✅ **Syntax Validation**: Automatic error detection and prompts

#### Dependency Requirements
> ⚠️ **Important Reminder**: This node requires the **[comfyui-prompt-control](https://github.com/asagi4/comfyui-prompt-control)** plugin, as ComfyUI natively does not support advanced syntax like MASK, FEATHER, AND, etc.

#### Syntax Mode Comparison

| Feature | Attention Couple | Regional Prompts |
|------|------------------|------------------|
| Separator | COUPLE | AND |
| Generation Speed | Faster | Slower |
| Flexibility | Higher | Medium |
| FILL() Support | ✅ Supported | ❌ Not Supported |
| Region Separation | Medium | More Strict |
| Recommended Scenarios | Rapid Prototyping, Flexible Layouts | Precise Control, Strict Partitioning |

#### Usage Method
1. Add `Danbooru > Multi Character Editor` node
2. Select syntax mode and canvas dimensions
3. Double-click to open visual editing interface
4. Add characters and adjust position, weight, feathering, etc.
5. Connect to **comfyui-prompt-control** nodes for use

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

### 🧹 Prompt Cleaning Maid (Prompt Cleaning Maid)

**Intelligent Prompt Cleaning and Formatting Node - Professional Maid Mastering Noble Etiquette**

Prompt Cleaning Maid is a professional prompt cleaning and formatting tool that automatically cleans extra symbols, whitespace, and formatting issues in prompts, and performs intelligent prompt normalization to make prompts more standardized and tidy.

#### Core Functions
- 🧹 **Comma Cleaning**: Automatically removes extra commas (consecutive commas, leading/trailing commas)
- ⚡ **Whitespace Standardization**: Cleans leading/trailing whitespace and extra spaces/tabs
- 🏷️ **LoRA Tag Management**: Optionally removes `<lora:xxx>` tags from strings
- 📄 **Newline Handling**: Replaces newlines with spaces or commas
- 🔧 **Bracket Fixing**: Automatically removes mismatched parentheses `()` or brackets `[]`
- ✨ **Advanced Formatting**: Complete prompt normalization processing system
- 🔄 **Smart Cleaning**: Multi-stage cleaning process ensures correct prompt format

#### ✨ Advanced Formatting Functions
- 🔤 **Underscore Conversion**: Automatically converts underscores `_` to spaces for more natural tags
- ⚖️ **Weight Syntax Completion**: Automatically adds parentheses to non-compliant weight syntax, e.g., `tag:1.2` → `(tag:1.2)`
- 🎨 **Smart Bracket Escaping**: Intelligently distinguishes between weight syntax and character series names, automatically escapes required brackets
  - `narmaya(granblue fantasy)` → `narmaya \(granblue fantasy\)`
  - `(blue_eyes:1.2)` remains as weight syntax unchanged
- 🔍 **Missing Comma Detection**: Automatically detects and fixes missing comma situations
  - `character(tag3:1.2)` → `character, (tag3:1.2)`
  - `name(series:1.0)` → `name, (series:1.0)`
- 🌐 **Standardized Commas**: Unifies all commas to English comma + space format
- 📝 **Multi-Tag Weight Syntax**: Supports complex multi-tag weight syntax processing
  - `(tag1,tag2,tag3:1.2)` → `(tag1, tag2, tag3:1.2)`

#### Cleaning Options

**1. Cleanup Commas (cleanup_commas)**
- Remove leading commas
- Remove trailing commas
- Merge consecutive commas into single commas
- Example: `, , tag1, , tag2, ,` → `tag1, tag2`

**2. Cleanup Whitespace (cleanup_whitespace)**
- Clean leading/trailing spaces and tabs
- Merge multiple consecutive spaces into single spaces
- Standardize spaces around commas
- Example: `  tag1  ,   tag2   ` → `tag1, tag2`

**3. Remove LoRA Tags (remove_lora_tags)**
- Completely removes LoRA tags from strings
- Supports various LoRA formats: `<lora:name:weight>`
- Example: `1girl, <lora:style:0.8>, smile` → `1girl, smile`

**4. Cleanup Newlines (cleanup_newlines)**
- **No (false)**: Preserve newlines
- **Space (space)**: Replace `\n` with spaces
- **Comma (comma)**: Replace `\n` with `, `
- Example (comma): `tag1\ntag2` → `tag1, tag2`

**5. Fix Brackets (fix_brackets)**
- **No (false)**: Don't fix brackets
- **Parenthesis (parenthesis)**: Remove mismatched `()`
- **Brackets (brackets)**: Remove mismatched `[]`
- **Both (both)**: Fix both parentheses and brackets
- Example: `((tag1) tag2))` → `(tag1) tag2`

#### ✨ Advanced Formatting Options

**6. Prompt Formatting (prompt_formatting)**
- **Master Switch**: Enable/disable all advanced formatting functions
- When enabled, uses intelligent formatting system instead of original basic cleaning logic
- Provides more professional, intelligent prompt normalization processing

**7. Underscore to Space (underscore_to_space)**
- Converts all underscores `_` to spaces
- Makes technical tags more natural and readable
- Example: `long_hair, blue_eyes` → `long hair, blue eyes`

**8. Complete Weight Syntax (complete_weight_syntax)**
- Automatically adds parentheses to non-compliant weight syntax
- Supports A1111 format weight syntax
- Example: `character name:1.2` → `(character name:1.2)`
- Example: `tag:` → `(tag:)`

**9. Smart Bracket Escaping (smart_bracket_escaping)**
- Intelligently distinguishes between weight syntax and character series names
- Automatically escapes required bracket content
- Supports missing comma detection and correction
- Example: `narmaya(granblue fantasy)` → `narmaya \(granblue fantasy\)`
- Example: `character(tag3:1.2)` → `character, (tag3:1.2)`

**10. Standardize Commas (standardize_commas)**
- Unifies all commas to English comma + space format
- Supports mixed Chinese and English comma situations
- Example: `tag1，tag2,tag3` → `tag1, tag2, tag3`

#### Usage Method
1. Add `Danbooru > Prompt Cleaning Maid` node
2. Connect upstream node's string output to `string` input
3. Enable/disable various cleaning options as needed
4. Get cleaned `string` output

#### Application Scenarios
- **Prompt Normalization**: Unify prompt formats for easy management and reuse
- **Automated Cleaning**: Batch clean prompts from various sources
- **Format Conversion**: Convert multi-line prompts to single-line, or adjust separators
- **LoRA Management**: Quickly remove or retain LoRA tags
- **Bracket Fixing**: Fix bracket mismatch issues from copy-paste operations
- **Weight Syntax Normalization**: Automatically fix incomplete weight syntax formats
- **Character Tag Processing**: Intelligently process character(series name) format tags
- **Internationalization Support**: Unify Chinese and English commas and punctuation
- **Batch Formatting**: Process messy prompts from different sources

#### Cleaning Process

**Basic Mode** (without advanced formatting enabled):
1. **Stage 1**: Remove LoRA tags (if enabled)
2. **Stage 2**: Replace newlines (if enabled)
3. **Stage 3**: Clean extra commas (if enabled)
4. **Stage 4**: Fix mismatched brackets (if enabled)
5. **Stage 5**: Clean extra whitespace (if enabled)

**Advanced Formatting Mode** (with prompt formatting enabled):
1. **Stage 1**: Remove LoRA tags (if enabled)
2. **Stage 2**: Replace newlines (if enabled)
3. **Stage 3**: Advanced intelligent formatting processing
   - Smart comma splitting (considering bracket nesting)
   - Per-tag processing (according to user-selected formatting options)
   - Reconnection to standard format
4. **Stage 4**: Final whitespace cleaning and standardization

#### Examples

**Basic Cleaning Example**:
```
Input: , , 1girl, blue eyes,  , <lora:style:0.8>, smile
Output: 1girl, blue eyes, smile
```

**Advanced Formatting Example** (all formatting functions enabled):
```
Input: 1girl, long_hair, character_name:1.2, narmaya(granblue fantasy), <lora:test:0.5>, name(series:1.0)
Output: 1girl, long hair, (character name:1.2), narmaya \(granblue fantasy\), name, (series:1.0)
```

**Function Demonstrations**:

1. **Underscore Conversion**:
   ```
   Input: long_hair, blue_eyes, white_dress
   Output: long hair, blue eyes, white dress
   ```

2. **Weight Syntax Completion**:
   ```
   Input: character name:1.2, simple_tag, weight_test:
   Output: (character name:1.2), simple_tag, weight test:
   ```

3. **Smart Bracket Escaping**:
   ```
   Input: narmaya(granblue fantasy), hakurei_reimu(touhou_project)
   Output: narmaya \(granblue fantasy\), hakurei reimu \(touhou project\)
   ```

4. **Missing Comma Detection**:
   ```
   Input: character(tag3:1.2), test(complex, description)
   Output: character, (tag3:1.2), test, (complex