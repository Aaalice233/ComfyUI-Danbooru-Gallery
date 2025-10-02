# 多人角色提示词编辑器 - 系统流程设计

## 1. 系统架构图

```mermaid
graph TB
    subgraph "ComfyUI 节点系统"
        A[MultiCharacterEditorNode] --> B[Python后端]
        A --> C[JavaScript前端]
    end
    
    subgraph "前端组件架构"
        C --> D[Toolbar 工具栏]
        C --> E[CharacterEditor 角色编辑器]
        C --> F[MaskEditor 蒙版编辑器]
        C --> G[OutputArea 输出区]
        
        D --> D1[SyntaxModeSelector]
        D --> D2[CanvasSettings]
        D --> D3[ImportExport]
        
        E --> E1[CharacterList]
        E --> E2[CharacterProperties]
        E --> E3[TemplateManager]
        
        F --> F1[CanvasRenderer]
        F --> F2[MaskController]
        F --> F3[GridSystem]
        
        G --> G1[PromptGenerator]
        G --> G2[Statistics]
        G --> G3[CopyButton]
    end
    
    subgraph "数据管理层"
        H[DataManager] --> I[CharacterModel]
        H --> J[MaskModel]
        H --> K[CanvasConfig]
        H --> L[UndoRedoStack]
    end
    
    subgraph "后端API"
        B --> M[Settings API]
        B --> N[Template API]
        B --> O[Export API]
    end
    
    C --> H
    H --> B
```

## 2. 数据流图

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant DataManager
    participant PromptGenerator
    participant Canvas
    
    User->>UI: 添加角色
    UI->>DataManager: 创建角色数据
    DataManager->>UI: 更新角色列表
    UI->>Canvas: 创建对应蒙版
    Canvas->>UI: 渲染蒙版
    
    User->>UI: 编辑蒙版
    UI->>Canvas: 更新蒙版位置/大小
    Canvas->>DataManager: 更新蒙版数据
    DataManager->>PromptGenerator: 触发提示词更新
    PromptGenerator->>UI: 更新输出显示
    
    User->>UI: 切换语法模式
    UI->>PromptGenerator: 更新语法模板
    PromptGenerator->>UI: 重新生成提示词
```

## 3. 角色管理流程

```mermaid
stateDiagram-v2
    [*] --> AddCharacter: 添加角色
    AddCharacter --> EditCharacter: 编辑属性
    EditCharacter --> ValidateData: 验证数据
    ValidateData --> UpdateUI: 数据有效
    ValidateData --> ShowError: 数据无效
    ShowError --> EditCharacter: 修正错误
    UpdateUI --> SaveData: 保存数据
    SaveData --> UpdateMask: 更新蒙版
    UpdateMask --> GeneratePrompt: 生成提示词
    GeneratePrompt --> EditCharacter: 继续编辑
    EditCharacter --> DeleteCharacter: 删除角色
    DeleteCharacter --> [*]
```

## 4. 蒙版编辑流程

```mermaid
flowchart TD
    A[用户选择蒙版] --> B{操作类型}
    B -->|移动| C[更新位置坐标]
    B -->|缩放| D[更新宽高]
    B -->|属性调整| E[更新羽化/透明度]
    B -->|层级调整| F[更新zIndex]
    
    C --> G[验证边界]
    D --> G
    E --> G
    F --> G
    
    G --> H{边界有效?}
    H -->|是| I[更新数据模型]
    H -->|否| J[显示错误提示]
    
    I --> K[重绘Canvas]
    K --> L[触发提示词更新]
    J --> M[恢复原状态]
```

## 5. 提示词生成流程

```mermaid
flowchart LR
    A[角色数据] --> B[蒙版数据]
    B --> C[语法模式]
    C --> D[模板选择]
    D --> E[数据映射]
    E --> F[语法应用]
    F --> G[提示词生成]
    G --> H[格式化输出]
    H --> I[实时预览]
    
    J[用户修改] --> K[检测变化]
    K --> L[重新生成]
    L --> E
```

    UpdateUI --> [*]
    ShowError --> [*]
```

## 7. 撤销重做机制

```mermaid
graph LR
    A[用户操作] --> B[创建快照]
    B --> C[添加到撤销栈]
    C --> D[清空重做栈]
    D --> E[执行操作]
    
    F[撤销操作] --> G[获取上一状态]
    G --> H[添加到重做栈]
    H --> I[恢复状态]
    
    J[重做操作] --> K[获取下一状态]
    K --> L[添加到撤销栈]
    L --> M[恢复状态]
```

## 8. 错误处理流程

```mermaid
flowchart TD
    A[操作执行] --> B{是否成功?}
    B -->|成功| C[更新UI]
    B -->|失败| D[捕获异常]
    D --> E[记录日志]
    E --> F[分析错误类型]
    F --> G{用户错误?}
    G -->|是| H[显示友好提示]
    G -->|否| I[显示错误详情]
    H --> J[提供修复建议]
    I --> K[提供技术信息]
    J --> L[自动恢复]
    K --> M[手动恢复]
    L --> N[继续操作]
    M --> O[回滚状态]
```

## 9. 性能优化策略

```mermaid
mindmap
  root((性能优化))
    Canvas优化
      离屏渲染
      视口裁剪
      增量更新
      事件节流
    数据优化
      防抖处理
      内存管理
      缓存策略
      懒加载
    渲染优化
      虚拟滚动
      批量更新
      异步处理
      优先级调度
```

## 10. 组件通信机制

```mermaid
sequenceDiagram
    participant Parent as 父组件
    participant Child1 as 子组件1
    participant Child2 as 子组件2
    participant Event as 事件总线
    
    Parent->>Child1: 传递props
    Child1->>Event: 发送事件
    Event->>Child2: 广播事件
    Child2->>Parent: 回调通知
    Parent->>Child2: 更新状态
    
    Note over Parent,Child2: 使用发布订阅模式实现组件解耦