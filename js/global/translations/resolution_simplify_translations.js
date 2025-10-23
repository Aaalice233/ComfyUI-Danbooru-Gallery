/**
 * 分辨率大师简化版翻译字典
 * Resolution Master Simplify Translations
 */

export const resolutionSimplifyTranslations = {
    zh: {
        // 节点名称
        nodeName: '分辨率大师简化版',

        // 控制标签
        presetLabel: '预设',
        customPreset: '自定义',
        savePreset: '另存为预设',
        deletePreset: '删除预设',
        language: '语言',

        // 内置预设名称
        presets: {
            'square': '正方形',
            'portrait': '竖版',
            'landscape': '横版'
        },

        // 对话框
        savePresetTitle: '另存为预设',
        presetName: '预设名称',
        presetNamePlaceholder: '输入预设名称...',
        presetWidth: '宽度',
        presetHeight: '高度',
        confirm: '确定',
        cancel: '取消',

        // 提示消息
        presetSaved: '预设已保存',
        presetDeleted: '预设已删除',
        cannotDeleteBuiltIn: '无法删除内置预设',
        cannotDeleteCustom: '无法删除"自定义"预设',
        presetNameEmpty: '预设名称不能为空',
        presetExists: '预设名称已存在',
        languageChanged: '语言已切换',
        invalidDimensions: '宽度和高度必须大于0',
        loadSettingsFailed: '加载设置失败',
        saveSettingsFailed: '保存设置失败',

        // 工具提示
        tooltips: {
            canvas: '拖动蓝点调整分辨率',
            presetDropdown: '选择预设分辨率',
            saveButton: '将当前分辨率保存为新预设',
            deleteButton: '删除当前选中的自定义预设',
            languageButton: '切换界面语言'
        }
    },
    en: {
        // Node name
        nodeName: 'Resolution Master Simplify',

        // Control labels
        presetLabel: 'Preset',
        customPreset: 'Custom',
        savePreset: 'Save Preset',
        deletePreset: 'Delete Preset',
        language: 'Language',

        // Built-in preset names
        presets: {
            'square': 'Square',
            'portrait': 'Portrait',
            'landscape': 'Landscape'
        },

        // Dialog
        savePresetTitle: 'Save as Preset',
        presetName: 'Preset Name',
        presetNamePlaceholder: 'Enter preset name...',
        presetWidth: 'Width',
        presetHeight: 'Height',
        confirm: 'Confirm',
        cancel: 'Cancel',

        // Toast messages
        presetSaved: 'Preset saved',
        presetDeleted: 'Preset deleted',
        cannotDeleteBuiltIn: 'Cannot delete built-in preset',
        cannotDeleteCustom: 'Cannot delete "Custom" preset',
        presetNameEmpty: 'Preset name cannot be empty',
        presetExists: 'Preset name already exists',
        languageChanged: 'Language changed',
        invalidDimensions: 'Width and height must be greater than 0',
        loadSettingsFailed: 'Failed to load settings',
        saveSettingsFailed: 'Failed to save settings',

        // Tooltips
        tooltips: {
            canvas: 'Drag the blue dot to adjust resolution',
            presetDropdown: 'Select preset resolution',
            saveButton: 'Save current resolution as new preset',
            deleteButton: 'Delete current custom preset',
            languageButton: 'Switch interface language'
        }
    }
};
