/**
 * 多角色编辑器翻译字典
 * Multi Character Editor Translations
 */

export const mceTranslations = {
    zh: {
        // 工具栏
        syntaxMode: "语法模式",
        refreshCanvas: "刷新画布",
        settings: "设置",
        useFill: "使用FILL语法",
        syntaxDocs: "语法文档",

        // 语法模式选项
        attentionCouple: "Attention Couple",
        regionalPrompts: "Regional Prompts",

        // 角色编辑器
        characterEditor: "角色编辑器",
        addCharacter: "添加角色",
        characterName: "角色名称",
        characterPrompt: "角色提示词",
        characterWeight: "权重",
        enabled: "启用",
        delete: "删除",
        moveUp: "上移",
        moveDown: "下移",

        // 蒙版编辑器
        maskEditor: "蒙版编辑器",
        resetMask: "重置蒙版",

        // 输出区域
        outputArea: "输出区域",
        generatedPrompt: "生成的提示词",
        promptPreview: "提示词预览",
        copyPrompt: "复制提示词",

        // 全局提示词
        globalPrompt: "全局提示词",
        globalPromptDescription: "全局提示词会与基础提示词合并，作为FILL填充的内容。基础提示词在前，全局提示词在后。",
        globalPromptPlaceholder: "输入全局提示词，例如：2girls",
        globalPromptSaved: "全局提示词已保存",
        global: "全局",

        // 设置对话框
        settingsTitle: "设置",
        generalSettings: "常规设置",
        canvasSettings: "画布设置",
        languageSettings: "语言切换",

        // 设置分类
        categories: {
            language: "语言",
            interface: "界面",
            about: "关于"
        },

        // 设置面板
        sections: {
            language: "语言设置",
            interface: "主题设置",
            about: "关于"
        },

        // 设置标签
        labels: {
            interfaceLanguage: "界面语言",
            primaryColor: "主色调",
            backgroundColor: "背景色",
            secondaryColor: "次要颜色"
        },

        // 设置按钮
        buttons: {
            save: "保存",
            reset: "重置",
            close: "关闭"
        },

        // 画布设置
        canvasWidth: "画布宽度",
        canvasHeight: "画布高度",

        // 语言设置
        selectLanguage: "选择语言",
        chinese: "中文",
        english: "English",

        // 消息提示
        settingsSaved: "设置已保存",
        promptCopied: "提示词已复制到剪贴板",
        characterAdded: "角色已添加",
        characterDeleted: "角色已删除",
        canvasRefreshed: "画布已刷新",

        // 错误信息
        error: "错误",
        networkError: "网络错误",
        invalidInput: "输入无效",

        // 智能补全
        autocomplete: "自动补全",
        noSuggestions: "无建议",
        loading: "加载中...",

        // 确认对话框
        deleteConfirm: "确定要删除这个角色吗？",
        deleteCharacterWarning: "此操作将删除角色及其对应的蒙版，且无法撤销。",

        // 词库相关
        promptLibrary: "词库",
        selectFromLibrary: "从词库添加",
        noPromptsInCategory: "此分类下没有提示词",
        noPreview: "暂无预览",

        // 其他
        cancel: "取消",
        confirm: "确认",
        save: "保存",
        color: "颜色",
        parameters: "参数设置",
        weight: "权重",
        feather: "羽化",

        // 角色编辑器额外文本
        noCharacters: "还没有角色",
        clickToAddCharacter: "点击\"添加角色\"开始创建",
        enable: "启用",
        disable: "禁用",
        edit: "编辑",
        category: "分类",
        promptList: "提示词列表",

        // 角色编辑器模态框
        editCharacter: "编辑角色",
        enabledCharacter: "启用角色",

        // 输出区域
        generate: "生成",
        copy: "复制",
        validate: "验证",
        promptPlaceholder: "提示词将在这里显示...",
        noPromptToCopy: "没有可复制的提示词",
        copied: "已复制",
        copyFailed: "复制失败，请手动选择复制",
        generating: "生成中...",
        promptGenerated: "提示词生成成功",
        generateFailed: "生成失败",
        promptEmpty: "提示词为空",
        promptValidated: "提示词语法验证通过",
        syntaxCorrect: "语法正确",
        syntaxError: "语法错误",
        validationFailed: "验证请求失败",
        validatePromptFailed: "验证提示词失败",

        // 蒙版编辑器
        featherSettings: "羽化设置",
        opacitySettings: "透明度设置",
        blendMode: "混合模式",
        duplicateMask: "复制蒙版",
        deleteMask: "删除蒙版",
        featherPrompt: "设置羽化值 (0-50像素):",
        opacityPrompt: "设置透明度 (0-100%):",
        currentBlendMode: "当前混合模式",
        blendModePrompt: "点击\"确定\"切换到下一个模式，点击\"取消\"保持当前模式",
        deleteMaskConfirm: "确定要删除这个蒙版吗？",
        zoom: "缩放",

        // 设置菜单
        saveSettingsFailed: "保存设置失败",
        settingsReset: "设置已重置",
        resetSettingsConfirm: "确定要重置所有设置吗？",

        // 语言切换
        switchedToChinese: "已切换到中文",
        switchedToEnglish: "Switched to English",

        // 按钮文本
        buttonTexts: {
            addCharacter: "添加角色",
            selectFromLibrary: "从词库添加",
            generate: "生成",
            copy: "复制",
            validate: "验证",
            globalPrompt: "全局提示词",
            refreshCanvas: "刷新画布",
            languageSettings: "语言切换",
            settings: "设置",
            syntaxDocs: "查看语法文档",
            save: "保存",
            cancel: "取消",
            back: "返回",
            note: "备注",
            notePlaceholder: "添加备注...",
            prompt: "提示词",
            promptPlaceholder: "输入提示词...",
            saved: "已保存",
            confirm: "确认",
            ok: "确定",
            edit: "编辑",
            delete: "删除",
            enable: "启用",
            disable: "禁用",
            copied: "已复制",
            generating: "生成中...",
            zoom: "缩放"
        },

        // 权重设置相关
        setWeight: "设置权重",
        weightValue: "权重值",
        weightSettings: "权重设置",
        weightDescription: "权重值越大，该角色在生成时的影响力越强",
        defaultWeight: "默认权重",
        weakerInfluence: "影响力减弱",
        strongerInfluence: "影响力增强",
        weightSetTo: "权重已设置为",
        note: "说明",
        operationMode: "操作模式",
        operationSetTo: "操作模式已设置为",

        // 刷新相关
        refreshed: "已刷新",
        refresh: "刷新",
        loadFailed: "加载失败",
        close: "关闭",

        // 预设管理
        presetManagement: "预设管理",
        saveAsPreset: "另存为预设",
        parsePrompt: "解析提示词",
        parsePromptDescription: "请粘贴包含区域提示词语法的提示词，支持COUPLE、MASK、AND、FEATHER、FILL()、AREA等语法，支持完整和简写格式，系统将自动解析并应用到当前节点。",
        syntaxMode: "语法模式",
        fillMode: "填充模式",
        promptText: "提示词内容：",
        parsePromptPlaceholder: "请粘贴提示词内容...",
        parsePreview: "解析预览：",
        parseAndApply: "解析并应用",
        pleaseEnterPrompt: "请输入提示词",
        noValidCharacters: "未找到有效的角色数据",
        promptApplied: "提示词已应用",
        globalPrompt: "全局提示词",
        characters: "角色",
        presetName: "预设名称",
        presetList: "预设列表",
        presetSettings: "预设设置",
        syntaxType: "语法类型",
        noPresets: "还没有预设",
        clickToAddPreset: "点击\"另存为预设\"开始创建",
        presetNamePlaceholder: "输入预设名称",
        presetPromptPlaceholder: "编辑角色提示词（格式：角色名: 提示词）",
        uploadPreview: "上传预览图",
        clickOrDragToUpload: "点击或拖拽上传预览图",
        presetSaved: "预设已保存",
        presetDeleted: "预设已删除",
        presetApplied: "预设已应用",
        deletePresetConfirm: "确定要删除这个预设吗？",
        deletePresetWarning: "此操作将删除预设及其预览图，且无法撤销。",
        send: "发送",
        apply: "应用",
        presetPrompt: "预设提示词",
        editPreset: "编辑预设",
        createPreset: "创建预设",
        previewImage: "预览图",
        noPreviewImage: "无预览图",
        searchPresets: "搜索预设...",
        noSearchResults: "未找到匹配的预设",
        tryDifferentKeywords: "尝试使用不同的关键词"
    },
    en: {
        // Toolbar
        syntaxMode: "Syntax Mode",
        refreshCanvas: "Refresh Canvas",
        settings: "Settings",
        useFill: "Use FILL Syntax",
        syntaxDocs: "Syntax Docs",

        // Syntax mode options
        attentionCouple: "Attention Couple",
        regionalPrompts: "Regional Prompts",

        // Character editor
        characterEditor: "Character Editor",
        addCharacter: "Add Character",
        characterName: "Character Name",
        characterPrompt: "Character Prompt",
        characterWeight: "Weight",
        enabled: "Enabled",
        delete: "Delete",
        moveUp: "Move Up",
        moveDown: "Move Down",

        // Mask editor
        maskEditor: "Mask Editor",
        resetMask: "Reset Mask",

        // Output area
        outputArea: "Output Area",
        generatedPrompt: "Generated Prompt",
        promptPreview: "Prompt Preview",
        copyPrompt: "Copy Prompt",

        // Global prompt
        globalPrompt: "Global Prompt",
        global: "Global",
        globalPromptDescription: "Global prompt will be merged with base prompt as FILL content. Base prompt comes first, then global prompt.",
        globalPromptPlaceholder: "Enter global prompt, e.g.: 2girls",
        globalPromptSaved: "Global prompt saved",

        // Settings dialog
        settingsTitle: "Settings",
        generalSettings: "General Settings",
        canvasSettings: "Canvas Settings",
        languageSettings: "Language Switch",

        // Settings categories
        categories: {
            language: "Language",
            interface: "Interface",
            about: "About"
        },

        // Settings panels
        sections: {
            language: "Language Settings",
            interface: "Theme Settings",
            about: "About"
        },

        // Settings labels
        labels: {
            interfaceLanguage: "Interface Language",
            primaryColor: "Primary Color",
            backgroundColor: "Background Color",
            secondaryColor: "Secondary Color"
        },

        // Settings buttons
        buttons: {
            save: "Save",
            reset: "Reset",
            close: "Close"
        },

        // Canvas settings
        canvasWidth: "Canvas Width",
        canvasHeight: "Canvas Height",

        // Language settings
        selectLanguage: "Select Language",
        chinese: "中文",
        english: "English",

        // Messages
        settingsSaved: "Settings saved",
        promptCopied: "Prompt copied to clipboard",
        characterAdded: "Character added",
        characterDeleted: "Character deleted",
        canvasRefreshed: "Canvas refreshed",

        // Error messages
        error: "Error",
        networkError: "Network error",
        invalidInput: "Invalid input",

        // Autocomplete
        autocomplete: "Autocomplete",
        noSuggestions: "No suggestions",
        loading: "Loading...",

        // Confirmation dialogs
        deleteConfirm: "Are you sure you want to delete this character?",
        deleteCharacterWarning: "This operation will delete the character and its corresponding mask, and cannot be undone.",

        // Prompt library
        promptLibrary: "Prompt Library",
        selectFromLibrary: "Add from Library",
        noPromptsInCategory: "No prompts in this category",
        noPreview: "No preview available",

        // Other
        cancel: "Cancel",
        confirm: "Confirm",
        save: "Save",
        color: "Color",
        parameters: "Parameters",
        weight: "Weight",
        feather: "Feather",

        // Character editor additional text
        noCharacters: "No characters yet",
        clickToAddCharacter: "Click 'Add Character' to start creating",
        enable: "Enable",
        disable: "Disable",
        edit: "Edit",
        category: "Category",
        promptList: "Prompt List",

        // Character editor modal
        editCharacter: "Edit Character",
        characterName: "Character Name",
        characterPrompt: "Character Prompt",
        enabledCharacter: "Enable Character",
        characterWeight: "Weight",
        color: "Color",

        // Output area
        generatedPrompt: "Generated Prompt",
        generate: "Generate",
        copy: "Copy",
        validate: "Validate",
        promptPlaceholder: "Prompt will be displayed here...",
        noPromptToCopy: "No prompt to copy",
        promptCopied: "Prompt copied to clipboard",
        copied: "Copied",
        copyFailed: "Copy failed, please copy manually",
        generating: "Generating...",
        promptGenerated: "Prompt generated successfully",
        generateFailed: "Generation failed",
        promptEmpty: "Prompt is empty",
        promptValidated: "Prompt syntax validation passed",
        syntaxCorrect: "Syntax correct",
        syntaxError: "Syntax error",
        validationFailed: "Validation request failed",
        validatePromptFailed: "Failed to validate prompt",

        // Mask editor
        featherSettings: "Feather Settings",
        opacitySettings: "Opacity Settings",
        blendMode: "Blend Mode",
        duplicateMask: "Duplicate Mask",
        deleteMask: "Delete Mask",
        featherPrompt: "Set feather value (0-50 pixels):",
        opacityPrompt: "Set opacity value (0-100%):",
        currentBlendMode: "Current blend mode",
        blendModePrompt: "Click \"OK\" to switch to next mode, click \"Cancel\" to keep current mode",
        deleteMaskConfirm: "Are you sure you want to delete this mask?",
        zoom: "Zoom",
        copy: "Copy",

        // Settings menu
        settingsSaved: "Settings saved",
        saveSettingsFailed: "Failed to save settings",
        settingsReset: "Settings reset",
        resetSettingsConfirm: "Are you sure you want to reset all settings?",

        // Language switch
        switchedToChinese: "Switched to Chinese",
        switchedToEnglish: "Switched to English",

        // Button texts
        buttonTexts: {
            addCharacter: "Add Character",
            selectFromLibrary: "Add from Library",
            generate: "Generate",
            copy: "Copy",
            validate: "Validate",
            globalPrompt: "Global Prompt",
            refreshCanvas: "Refresh Canvas",
            languageSettings: "Language Switch",
            settings: "Settings",
            syntaxDocs: "View Syntax Docs",
            save: "Save",
            cancel: "Cancel",
            back: "Back",
            note: "Note",
            notePlaceholder: "Add note...",
            prompt: "Prompt",
            promptPlaceholder: "Enter prompt...",
            saved: "Saved",
            confirm: "Confirm",
            ok: "OK",
            edit: "Edit",
            delete: "Delete",
            enable: "Enable",
            disable: "Disable",
            copied: "Copied",
            generating: "Generating...",
            zoom: "Zoom"
        },

        // Weight settings
        setWeight: "Set Weight",
        weightValue: "Weight Value",
        weightSettings: "Weight Settings",
        weightDescription: "Higher weight values increase the character's influence during generation",
        defaultWeight: "Default weight",
        weakerInfluence: "Weaker influence",
        strongerInfluence: "Stronger influence",
        weightSetTo: "Weight set to",
        note: "Note",
        operationMode: "Operation Mode",
        operationSetTo: "Operation mode set to",

        // Refresh related
        refreshed: "Refreshed",
        refresh: "Refresh",
        loadFailed: "Load failed",
        close: "Close",

        // Preset management
        presetManagement: "Preset Management",
        saveAsPreset: "Save as Preset",
        parsePrompt: "Parse Prompt",
        parsePromptDescription: "Please paste a prompt containing regional prompt syntax, supporting COUPLE, MASK, AND, FEATHER, FILL(), AREA and other syntaxes, supporting both full and shorthand formats, the system will automatically parse and apply it to the current node.",
        syntaxMode: "Syntax Mode",
        fillMode: "Fill Mode",
        promptText: "Prompt Text:",
        parsePromptPlaceholder: "Please paste prompt content...",
        parsePreview: "Parse Preview:",
        parseAndApply: "Parse and Apply",
        pleaseEnterPrompt: "Please enter prompt",
        noValidCharacters: "No valid character data found",
        promptApplied: "Prompt applied",
        globalPrompt: "Global Prompt",
        characters: "Characters",
        presetName: "Preset Name",
        presetList: "Preset List",
        presetSettings: "Preset Settings",
        syntaxType: "Syntax Type",
        noPresets: "No presets yet",
        clickToAddPreset: "Click 'Save as Preset' to start creating",
        presetNamePlaceholder: "Enter preset name",
        presetPromptPlaceholder: "Edit character prompts (format: name: prompt)",
        uploadPreview: "Upload Preview",
        clickOrDragToUpload: "Click or drag to upload preview image",
        presetSaved: "Preset saved",
        presetDeleted: "Preset deleted",
        presetApplied: "Preset applied",
        deletePresetConfirm: "Are you sure you want to delete this preset?",
        deletePresetWarning: "This operation will delete the preset and its preview image, and cannot be undone.",
        send: "Send",
        apply: "Apply",
        presetPrompt: "Preset Prompt",
        editPreset: "Edit Preset",
        createPreset: "Create Preset",
        previewImage: "Preview Image",
        noPreviewImage: "No preview image",
        searchPresets: "Search presets...",
        noSearchResults: "No matching presets found",
        tryDifferentKeywords: "Try different keywords"
    }
};

