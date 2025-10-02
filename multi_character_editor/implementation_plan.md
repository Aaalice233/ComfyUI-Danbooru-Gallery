# 多人角色提示词编辑器 - 实施计划

## 1. 开发阶段规划

### 阶段1: 基础架构搭建 (预计3-4天)
- [x] 完成架构设计和技术规范
- [x] 创建项目文档结构
- [ ] 创建Python节点基础框架
- [ ] 设置前端模块化结构
- [ ] 建立基本的通信机制

### 阶段2: 核心功能开发 (预计5-7天)
- [ ] 实现角色管理系统
- [ ] 开发Canvas蒙版编辑器
- [ ] 创建提示词生成器
- [ ] 实现数据绑定和同步

### 阶段3: 高级功能实现 (预计3-4天)
- [ ] 实现撤销/重做机制
- [ ] 开发键盘快捷键系统
- [ ] 添加模板管理功能

### 阶段4: 优化和测试 (预计2-3天)
- [ ] 性能优化
- [ ] 错误处理完善
- [ ] 用户体验优化
- [ ] 全面测试和调试

## 2. 详细实施步骤

### 2.1 Python节点开发

#### 步骤1: 创建基础节点文件
```python
# multi_character_editor.py
import json
import os
from server import PromptServer
from aiohttp import web
import logging

logger = logging.getLogger("MultiCharacterEditor")

class MultiCharacterEditorNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "base_prompt": ("STRING", {"multiline": True, "default": ""}),
                "syntax_mode": (["attention_couple", "regional_prompts"], {"default": "attention_couple"}),
                "canvas_width": ("INT", {"default": 1024, "min": 256, "max": 2048}),
                "canvas_height": ("INT", {"default": 1024, "min": 256, "max": 2048}),
            },
            "optional": {
                "config_data": ("STRING", {"default": "{}"}),
            }
        }
    
    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("generated_prompt", "config_json")
    FUNCTION = "generate_prompt"
    CATEGORY = "Danbooru"
    
    def generate_prompt(self, base_prompt, syntax_mode, canvas_width, canvas_height, config_data):
        # 实现提示词生成逻辑
        pass

# 节点映射
NODE_CLASS_MAPPINGS = {
    "MultiCharacterEditorNode": MultiCharacterEditorNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MultiCharacterEditorNode": "多人角色提示词编辑器 (Multi Character Editor)"
}
```

#### 步骤2: 添加API端点
```python
# 设置文件路径
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(PLUGIN_DIR, "settings", "editor_settings.json")
TEMPLATES_FILE = os.path.join(PLUGIN_DIR, "templates", "character_templates.json")

@PromptServer.instance.routes.get("/multi_character_editor/templates")
async def get_templates(request):
    """获取角色模板"""
    try:
        if os.path.exists(TEMPLATES_FILE):
            with open(TEMPLATES_FILE, 'r', encoding='utf-8') as f:
                templates = json.load(f)
            return web.json_response(templates)
        else:
            return web.json_response({})
    except Exception as e:
        logger.error(f"获取模板失败: {e}")
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/multi_character_editor/save_config")
async def save_config(request):
    """保存编辑器配置"""
    try:
        data = await request.json()
        # 确保目录存在
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return web.json_response({"success": True})
    except Exception as e:
        logger.error(f"保存配置失败: {e}")
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.get("/multi_character_editor/load_config")
async def load_config(request):
    """加载编辑器配置"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            return web.json_response(config)
        else:
            return web.json_response({})
    except Exception as e:
        logger.error(f"加载配置失败: {e}")
        return web.json_response({"error": str(e)}, status=500)
```

### 2.2 JavaScript前端开发

#### 步骤1: 创建主模块结构
```javascript
// js/multi_character_editor.js
import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// 全局变量
let MultiCharacterEditorInstance = null;

// 主编辑器类
class MultiCharacterEditor {
    constructor(node, widgetName) {
        this.node = node;
        this.widgetName = widgetName;
        this.container = null;
        this.dataManager = null;
        this.eventBus = null;
        this.components = {};
        
        this.init();
    }
    
    init() {
        this.createContainer();
        this.initManagers();
        this.createLayout();
        this.initComponents();
        this.bindEvents();
        this.loadInitialData();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'mce-container';
        this.container.style.cssText = `
            width: 100%;
            height: 600px;
            display: flex;
            flex-direction: column;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 8px;
            overflow: hidden;
        `;
    }
    
    initManagers() {
        this.dataManager = new DataManager(this);
        this.eventBus = new EventBus(this);
    }
    
    createLayout() {
        // 创建主要布局结构
        this.container.innerHTML = `
            <div class="mce-toolbar"></div>
            <div class="mce-main-area">
                <div class="mce-character-editor"></div>
                <div class="mce-mask-editor"></div>
            </div>
            <div class="mce-output-area"></div>
        `;
    }
    
    initComponents() {
        this.components.toolbar = new Toolbar(this);
        this.components.characterEditor = new CharacterEditor(this);
        this.components.maskEditor = new MaskEditor(this);
        this.components.outputArea = new OutputArea(this);
    }
    
    bindEvents() {
        // 绑定全局事件
        this.eventBus.on('character:added', this.onCharacterAdded.bind(this));
        this.eventBus.on('character:updated', this.onCharacterUpdated.bind(this));
        this.eventBus.on('character:deleted', this.onCharacterDeleted.bind(this));
        this.eventBus.on('mask:updated', this.onMaskUpdated.bind(this));
    }
    
    loadInitialData() {
        // 加载初始数据
        this.dataManager.loadConfig().then(config => {
            if (config.characters && config.characters.length > 0) {
                config.characters.forEach(charData => {
                    this.dataManager.addCharacter(charData);
                });
            } else {
                // 添加默认角色
                this.dataManager.addCharacter({
                    name: '角色1',
                    prompt: '1girl, solo',
                    enabled: true,
                    weight: 1.0
                });
            }
            
            this.updateOutput();
        });
    }
    
    onCharacterAdded(character) {
        this.components.maskEditor.addMask(character);
        this.updateOutput();
    }
    
    onCharacterUpdated(character) {
        this.components.maskEditor.updateMask(character);
        this.updateOutput();
    }
    
    onCharacterDeleted(characterId) {
        this.components.maskEditor.removeMask(characterId);
        this.updateOutput();
    }
    
    onMaskUpdated(mask) {
        this.updateOutput();
    }
    
    updateOutput() {
        const config = this.dataManager.getConfig();
        const prompt = this.generatePrompt(config);
        this.components.outputArea.updatePrompt(prompt);
        this.updateWidgetValue(config);
    }
    
    generatePrompt(config) {
        // 实现提示词生成逻辑
        const generator = new PromptGenerator(config.syntax_mode);
        return generator.generate(config.base_prompt || '', config);
    }
    
    updateWidgetValue(config) {
        // 更新小部件值
        const widget = this.node.widgets.find(w => w.name === this.widgetName);
        if (widget) {
            widget.value = JSON.stringify(config);
            this.node.setDirtyCanvas(true, true);
        }
    }
}

// 数据管理器
class DataManager {
    constructor(editor) {
        this.editor = editor;
        this.config = {
            version: '1.0.0',
            syntax_mode: 'attention_couple',
            canvas: {
                width: 1024,
                height: 1024,
                grid_size: 32,
                show_grid: true
            },
            characters: []
        };
        this.nextId = 1;
    }
    
    async loadConfig() {
        try {
            const response = await api.fetchApi('/multi_character_editor/load_config');
            if (response.ok) {
                const config = await response.json();
                if (config && Object.keys(config).length > 0) {
                    this.config = config;
                }
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
        return this.config;
    }
    
    async saveConfig() {
        try {
            const response = await api.fetchApi('/multi_character_editor/save_config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });
            return response.ok;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }
    
    addCharacter(data = {}) {
        const character = {
            id: data.id || this.generateId('char'),
            name: data.name || `角色${this.config.characters.length + 1}`,
            prompt: data.prompt || '',
            enabled: data.enabled !== undefined ? data.enabled : true,
            weight: data.weight || 1.0,
            color: data.color || this.generateColor(),
            position: data.position || this.config.characters.length,
            mask: data.mask || null,
            template: data.template || ''
        };
        
        this.config.characters.push(character);
        this.editor.eventBus.emit('character:added', character);
        return character;
    }
    
    updateCharacter(characterId, updates) {
        const index = this.config.characters.findIndex(c => c.id === characterId);
        if (index !== -1) {
            this.config.characters[index] = { ...this.config.characters[index], ...updates };
            const character = this.config.characters[index];
            this.editor.eventBus.emit('character:updated', character);
            return character;
        }
        return null;
    }
    
    deleteCharacter(characterId) {
        const index = this.config.characters.findIndex(c => c.id === characterId);
        if (index !== -1) {
            const character = this.config.characters[index];
            this.config.characters.splice(index, 1);
            this.editor.eventBus.emit('character:deleted', characterId);
            return character;
        }
        return null;
    }
    
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getConfig() {
        return this.config;
    }
}

// 事件总线
class EventBus {
    constructor(editor) {
        this.editor = editor;
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    off(event, callback) {
        if (this.events[event]) {
            const index = this.events[event].indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件处理错误 (${event}):`, error);
                }
            });
        }
    }
}

// 注册ComfyUI扩展
app.registerExtension({
    name: "Comfy.MultiCharacterEditor",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "MultiCharacterEditorNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // 设置节点最小尺寸
                this.min_size = [800, 600];
                
                // 创建编辑器实例
                MultiCharacterEditorInstance = new MultiCharacterEditor(this, "config_data");
                
                // 添加DOM小部件
                this.addDOMWidget("config_data", "div", MultiCharacterEditorInstance.container);
            };
        }
    }
});
```

### 2.3 CSS样式开发

#### 步骤1: 创建主样式文件
```css
/* styles/multi_character_editor.css */
:root {
    --mce-bg-primary: #2a2a2a;
    --mce-bg-secondary: #333333;
    --mce-bg-tertiary: #404040;
    --mce-border-color: #555555;
    --mce-text-primary: #E0E0E0;
    --mce-text-secondary: #B0B0B0;
    --mce-accent-color: #03A9F4;
    --mce-success-color: #4CAF50;
    --mce-warning-color: #FF9800;
    --mce-error-color: #F44336;
}

.mce-container {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    color: var(--mce-text-primary);
    background: var(--mce-bg-primary);
}

/* 工具栏样式 */
.mce-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--mce-bg-secondary);
    border-bottom: 1px solid var(--mce-border-color);
    flex-shrink: 0;
}

.mce-toolbar select,
.mce-toolbar button {
    padding: 6px 12px;
    background: var(--mce-bg-tertiary);
    border: 1px solid var(--mce-border-color);
    border-radius: 4px;
    color: var(--mce-text-primary);
    cursor: pointer;
    transition: all 0.2s;
}

.mce-toolbar select:hover,
.mce-toolbar button:hover {
    background: #4a4a4a;
    border-color: var(--mce-accent-color);
}

/* 主编辑区域 */
.mce-main-area {
    display: flex;
    flex: 1;
    min-height: 0;
}

/* 角色编辑器 */
.mce-character-editor {
    width: 300px;
    background: var(--mce-bg-secondary);
    border-right: 1px solid var(--mce-border-color);
    display: flex;
    flex-direction: column;
}

/* 蒙版编辑器 */
.mce-mask-editor {
    flex: 1;
    background: var(--mce-bg-primary);
    position: relative;
    overflow: hidden;
}

/* 输出区域 */
.mce-output-area {
    height: 120px;
    background: var(--mce-bg-secondary);
    border-top: 1px solid var(--mce-border-color);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
    .mce-character-editor {
        width: 250px;
    }
}

@media (max-width: 768px) {
    .mce-main-area {
        flex-direction: column;
    }
    
    .mce-character-editor {
        width: 100%;
        height: 200px;
        border-right: none;
        border-bottom: 1px solid var(--mce-border-color);
    }
}
```

## 3. 开发优先级

### 高优先级 (核心功能)
1. **基础节点框架** - Python节点和API接口
2. **角色管理系统** - 角色的增删改查
3. **Canvas蒙版编辑器** - 基础的蒙版绘制和交互
4. **提示词生成器** - 支持两种语法模式

### 中优先级 (增强功能)
1. **数据绑定和同步** - 角色与蒙版的实时同步
2. **撤销/重做机制** - 操作历史管理
4. **模板系统** - 预设角色模板

### 低优先级 (优化功能)
1. **键盘快捷键** - 提高操作效率
2. **性能优化** - 大量角色时的性能提升
3. **高级蒙版功能** - 羽化、混合模式等
4. **主题和样式** - 界面美化

## 4. 测试策略

### 4.1 单元测试
- 数据模型验证
- 提示词生成逻辑
- 工具函数测试

### 4.2 集成测试
- 前后端通信
- 组件间交互
- 数据流测试

### 4.3 用户测试
- 界面易用性
- 功能完整性
- 性能表现

## 5. 风险评估和应对

### 5.1 技术风险
**风险**: Canvas性能问题
**应对**: 使用离屏渲染和视口裁剪优化

**风险**: 复杂数据同步
**应对**: 实现可靠的事件系统和状态管理

### 5.2 用户体验风险
**风险**: 学习曲线陡峭
**应对**: 提供详细的文档和教程

**风险**: 界面复杂度高
**应对**: 采用渐进式设计，提供简洁和高级两种模式

## 6. 发布计划

### Alpha版本 (内部测试)
- 基础功能实现
- 核心特性验证
- 主要bug修复

### Beta版本 (公开测试)
- 功能完整性
- 性能优化
- 用户反馈收集

### 正式版本 (公开发布)
- 稳定性保证
- 文档完善
- 社区支持

## 7. 维护和更新

### 7.1 版本管理
- 语义化版本号
- 向后兼容性保证
- 变更日志维护

### 7.2 社区支持
- 问题反馈机制
- 功能建议收集
- 贡献者指南

### 7.3 长期规划
- 新语法模式支持
- AI辅助功能
- 云端配置同步