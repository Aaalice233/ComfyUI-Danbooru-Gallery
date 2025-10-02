# 多人角色提示词编辑器 - 技术规范

## 1. 技术栈选择

### 1.1 前端技术
- **核心框架**: 原生JavaScript + ComfyUI API
- **UI框架**: 自定义组件系统（基于DOM）
- **Canvas渲染**: HTML5 Canvas API
- **状态管理**: 自定义事件系统 + 观察者模式
- **样式**: CSS3 + CSS变量（支持主题切换）

### 1.2 后端技术
- **运行环境**: Python 3.8+
- **Web框架**: ComfyUI内置的aiohttp
- **数据存储**: JSON文件（本地存储）
- **异步处理**: asyncio

## 2. 文件结构规划

```
multi_character_editor/
├── __init__.py                 # 包初始化文件
├── multi_character_editor.py   # 主节点文件
├── js/
│   └── multi_character_editor.js  # 前端实现
├── styles/
│   └── multi_character_editor.css  # 样式文件
├── templates/
│   └── character_templates.json    # 角色模板
├── settings/
│   └── editor_settings.json        # 编辑器设置
└── docs/
    ├── architecture_design.md      # 架构设计文档
    ├── system_flow.md             # 系统流程文档
    ├── technical_specification.md  # 技术规范文档
    └── user_guide.md              # 用户指南
```

## 3. 数据模型定义

### 3.1 角色模型 (CharacterModel)
```javascript
class CharacterModel {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || `角色${this.id.slice(-4)}`;
        this.prompt = data.prompt || '';
        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.weight = data.weight || 1.0;
        this.color = data.color || this.generateColor();
        this.mask = data.mask || null;
        this.position = data.position || 0;
        this.template = data.template || '';
    }
    
    // 生成唯一ID
    generateId() {
        return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 生成随机颜色
    generateColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // 验证数据
    validate() {
        const errors = [];
        if (!this.name.trim()) errors.push('角色名称不能为空');
        if (this.weight < 0.1 || this.weight > 2.0) errors.push('权重必须在0.1-2.0之间');
        return errors;
    }
}
```

### 3.2 蒙版模型 (MaskModel)
```javascript
class MaskModel {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.characterId = data.characterId || '';
        this.x = data.x || 0.1;
        this.y = data.y || 0.1;
        this.width = data.width || 0.3;
        this.height = data.height || 0.3;
        this.feather = data.feather || 0;
        this.opacity = data.opacity || 100;
        this.blendMode = data.blendMode || 'normal';
        this.zIndex = data.zIndex || 0;
    }
    
    generateId() {
        return 'mask_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 检查边界
    checkBounds(canvasWidth, canvasHeight) {
        const errors = [];
        if (this.x < 0 || this.x + this.width > 1) errors.push('蒙版X坐标超出边界');
        if (this.y < 0 || this.y + this.height > 1) errors.push('蒙版Y坐标超出边界');
        return errors;
    }
    
    // 转换为像素坐标
    toPixel(canvasWidth, canvasHeight) {
        return {
            x: this.x * canvasWidth,
            y: this.y * canvasHeight,
            width: this.width * canvasWidth,
            height: this.height * canvasHeight
        };
    }
}
```

### 3.3 画布配置模型 (CanvasConfig)
```javascript
class CanvasConfig {
    constructor(data = {}) {
        this.width = data.width || 1024;
        this.height = data.height || 1024;
        this.gridSize = data.gridSize || 32;
        this.showGrid = data.showGrid !== undefined ? data.showGrid : true;
        this.snapToGrid = data.snapToGrid !== undefined ? data.snapToGrid : true;
        this.previewMode = data.previewMode || false;
    }
    
    // 获取预设尺寸
    static getPresets() {
        return [
            { name: '512x512', width: 512, height: 512 },
            { name: '768x768', width: 768, height: 768 },
            { name: '1024x1024', width: 1024, height: 1024 },
            { name: '1024x768', width: 1024, height: 768 },
            { name: '768x1024', width: 768, height: 1024 },
            { name: '1024x1536', width: 1024, height: 1536 },
            { name: '1536x1024', width: 1536, height: 1024 },
            { name: '自定义', width: 0, height: 0 }
        ];
    }
}
```

## 4. API接口定义

### 4.1 节点接口 (Python)
```python
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
        # 解析配置数据
        config = json.loads(config_data)
        
        # 生成提示词
        prompt_generator = PromptGenerator(syntax_mode)
        generated_prompt = prompt_generator.generate(base_prompt, config)
        
        # 返回结果
        return (generated_prompt, config_data)
```

### 4.2 REST API端点
```python
# 获取角色模板
@PromptServer.instance.routes.get("/multi_character_editor/templates")
async def get_templates(request):
    # 返回预设角色模板

# 保存/加载配置
@PromptServer.instance.routes.post("/multi_character_editor/save_config")
async def save_config(request):
    # 保存编辑器配置

@PromptServer.instance.routes.get("/multi_character_editor/load_config")
async def load_config(request):
    # 加载编辑器配置


## 5. 前端组件规范

### 5.1 主编辑器组件 (MultiCharacterEditor)
```javascript
class MultiCharacterEditor {
    constructor(node, widgetName) {
        this.node = node;
        this.widgetName = widgetName;
        this.dataManager = new DataManager();
        this.eventBus = new EventBus();
        this.canvas = null;
        this.components = {};
        
        this.init();
    }
    
    init() {
        this.createLayout();
        this.initComponents();
        this.bindEvents();
        this.loadInitialData();
    }
    
    createLayout() {
        // 创建DOM结构
    }
    
    initComponents() {
        this.components.toolbar = new Toolbar(this);
        this.components.characterEditor = new CharacterEditor(this);
        this.components.maskEditor = new MaskEditor(this);
        this.components.outputArea = new OutputArea(this);
    }
    
    bindEvents() {
        // 绑定事件监听器
    }
    
    loadInitialData() {
        // 加载初始数据
    }
}
```

### 5.2 Canvas蒙版编辑器 (MaskEditor)
```javascript
class MaskEditor {
    constructor(editor) {
        this.editor = editor;
        this.canvas = null;
        this.ctx = null;
        this.masks = [];
        this.selectedMask = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.bindCanvasEvents();
        this.startRenderLoop();
    }
    
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        // 设置Canvas属性
    }
    
    bindCanvasEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    }
    
    onMouseDown(e) {
        // 处理鼠标按下事件
    }
    
    onMouseMove(e) {
        // 处理鼠标移动事件
    }
    
    onMouseUp(e) {
        // 处理鼠标释放事件
    }
    
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        if (this.editor.config.showGrid) {
            this.drawGrid();
        }
        
        // 绘制蒙版
        this.masks.forEach(mask => {
            this.drawMask(mask);
        });
        
        // 绘制选中框
        if (this.selectedMask) {
            this.drawSelection(this.selectedMask);
        }
    }
    
    drawGrid() {
        // 绘制网格线
    }
    
    drawMask(mask) {
        // 绘制单个蒙版
    }
    
    drawSelection(mask) {
        // 绘制选中框和控制点
    }
}
```

## 6. 提示词生成器

### 6.1 语法模式定义
```javascript
class SyntaxModes {
    static get ATTENTION_COUPLE() {
        return {
            id: 'attention_couple',
            name: 'Attention Couple',
            template: '{base_prompt} {masks}',
            maskTemplate: 'COUPLE MASK({x1} {x2}, {y1} {y2}) {prompt}',
            supportedFeatures: ['mask', 'weight', 'feather']
        };
    }
    
    static get REGIONAL_PROMPTS() {
        return {
            id: 'regional_prompts',
            name: 'Regional Prompts',
            template: '{masks}',
            maskTemplate: '{prompt} MASK({x1} {x2}, {y1} {y2})',
            supportedFeatures: ['mask', 'weight', 'feather', 'blend_mode']
        };
    }
}
```

### 6.2 提示词生成器
```javascript
class PromptGenerator {
    constructor(syntaxMode) {
        this.syntaxMode = syntaxMode;
        this.modeConfig = SyntaxModes[syntaxMode.toUpperCase()];
    }
    
    generate(basePrompt, config) {
        const { characters, canvas } = config;
        const masks = this.generateMasks(characters, canvas);
        
        if (this.syntaxMode === 'attention_couple') {
            return this.generateAttentionCouple(basePrompt, masks);
        } else if (this.syntaxMode === 'regional_prompts') {
            return this.generateRegionalPrompts(masks);
        }
        
        return basePrompt;
    }
    
    generateMasks(characters, canvas) {
        return characters
            .filter(char => char.enabled && char.mask)
            .map(char => {
                const mask = char.mask;
                return {
                    prompt: char.prompt,
                    weight: char.weight,
                    x1: mask.x,
                    y1: mask.y,
                    x2: mask.x + mask.width,
                    y2: mask.y + mask.height,
                    feather: mask.feather,
                    opacity: mask.opacity,
                    blendMode: mask.blendMode
                };
            });
    }
    
    generateAttentionCouple(basePrompt, masks) {
        const maskStrings = masks.map(mask => {
            let maskStr = this.modeConfig.maskTemplate
                .replace('{x1}', mask.x1.toFixed(2))
                .replace('{x2}', mask.x2.toFixed(2))
                .replace('{y1}', mask.y1.toFixed(2))
                .replace('{y2}', mask.y2.toFixed(2))
                .replace('{prompt}', mask.prompt);
            
            if (mask.weight !== 1.0) {
                maskStr += `:${mask.weight.toFixed(2)}`;
            }
            
            if (mask.feather > 0) {
                maskStr += ` FEATHER(${mask.feather})`;
            }
            
            return maskStr;
        });
        
        return `${basePrompt} ${maskStrings.join(' ')}`.trim();
    }
    
    generateRegionalPrompts(masks) {
        const maskStrings = masks.map(mask => {
            let maskStr = this.modeConfig.maskTemplate
                .replace('{x1}', mask.x1.toFixed(2))
                .replace('{x2}', mask.x2.toFixed(2))
                .replace('{y1}', mask.y1.toFixed(2))
                .replace('{y2}', mask.y2.toFixed(2))
                .replace('{prompt}', mask.prompt);
            
            if (mask.weight !== 1.0) {
                maskStr += `:${mask.weight.toFixed(2)}`;
            }
            
            if (mask.feather > 0) {
                maskStr += ` FEATHER(${mask.feather})`;
            }
            
            if (mask.blendMode !== 'normal') {
                maskStr += ` BLEND(${mask.blendMode})`;
            }
            
            return maskStr;
        });
        
        return maskStrings.join(' AND ');
    }
}
```

## 7. 性能优化实现

### 7.1 Canvas渲染优化
```javascript
class CanvasOptimizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.renderQueue = [];
        this.isRendering = false;
    }
    
    // 使用离屏Canvas预渲染
    preRender(mask) {
        const { width, height } = mask.toPixel(this.canvas.width, this.canvas.height);
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
        
        // 在离屏Canvas上绘制
        this.drawMaskToContext(this.offscreenCtx, mask);
        
        // 返回渲染结果
        return this.offscreenCanvas;
    }
    
    // 批量渲染
    batchRender(masks) {
        this.renderQueue.push(...masks);
        if (!this.isRendering) {
            this.processRenderQueue();
        }
    }
    
    processRenderQueue() {
        this.isRendering = true;
        
        const render = () => {
            if (this.renderQueue.length === 0) {
                this.isRendering = false;
                return;
            }
            
            const batchSize = 5; // 每批处理5个蒙版
            const batch = this.renderQueue.splice(0, batchSize);
            
            batch.forEach(mask => {
                this.drawMask(mask);
            });
            
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }
    
    // 视口裁剪
    viewportCull(masks, viewport) {
        return masks.filter(mask => {
            const { x, y, width, height } = mask.toPixel(this.canvas.width, this.canvas.height);
            return !(x + width < viewport.x || 
                    x > viewport.x + viewport.width ||
                    y + height < viewport.y || 
                    y > viewport.y + viewport.height);
        });
    }
}
```

## 8. 错误处理和日志

### 8.1 错误处理类
```javascript
class ErrorHandler {
    static handle(error, context) {
        console.error(`[${context}] Error:`, error);
        
        // 根据错误类型显示不同的提示
        if (error instanceof ValidationError) {
            this.showUserError(error.message);
        } else if (error instanceof NetworkError) {
            this.showNetworkError(error.message);
        } else {
            this.showGenericError(error.message);
        }
        
        // 发送错误日志到服务器
        this.logError(error, context);
    }
    
    static showUserError(message) {
        // 显示用户友好的错误提示
        this.showToast(message, 'error');
    }
    
    static showNetworkError(message) {
        // 显示网络错误提示
        this.showToast(`网络错误: ${message}`, 'error');
    }
    
    static showGenericError(message) {
        // 显示通用错误提示
        this.showToast(`操作失败: ${message}`, 'error');
    }
    
    static showToast(message, type = 'info') {
        // 实现Toast提示
    }
    
    static logError(error, context) {
        // 发送错误日志到服务器
        fetch('/multi_character_editor/log_error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: error.message,
                stack: error.stack,
                context: context,
                timestamp: new Date().toISOString()
            })
        });
    }
}
```

## 9. 测试策略

### 9.1 单元测试
- 数据模型验证测试
- 提示词生成逻辑测试
- 工具函数测试

### 9.2 集成测试
- 组件间交互测试
- 数据流测试
- API接口测试

### 9.3 用户界面测试
- 交互功能测试
- 响应式布局测试
- 浏览器兼容性测试

## 10. 部署和维护

### 10.1 版本控制
- 语义化版本号
- 变更日志维护
- 向后兼容性保证

### 10.2 监控和分析
- 使用统计收集
- 错误日志监控
- 性能指标跟踪

### 10.3 文档维护
- API文档更新
- 用户指南维护
- 开发者文档同步