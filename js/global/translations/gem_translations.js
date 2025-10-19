/**
 * Group Executor Manager 翻译字典
 * Group Executor Manager Translations
 */

export const gemTranslations = {
    zh: {
        // UI 元素
        title: "执行组列表",
        addGroup: "添加组",
        selectGroup: "选择组...",
        delay: "延迟",
        seconds: "秒",
        refresh: "刷新组列表",
        delete: "删除",
        languageSwitch: "切换语言",
        filterByColor: "按颜色过滤",
        filterOptions: "过滤选项",
        allColors: "所有颜色",
        noColor: "无颜色",
        customColors: "自定义颜色",

        // 验证消息
        groupNotFound: "找不到组 \"{groupName}\"",
        noNodesInGroup: "组 \"{groupName}\" 内没有任何节点",
        noOutputNodes: "组 \"{groupName}\" 内没有输出节点",
        emptyConfig: "组配置为空，请至少添加一个组",
        emptyConfigList: "组配置列表为空，请至少添加一个组",
        invalidFormat: "配置格式错误：期望 JSON 数组，实际是 {type}",
        jsonParseError: "JSON 解析失败: {error}",
        invalidItem: "第 {index} 项不是有效的配置对象",
        emptyGroupName: "第 {index} 项的组名称为空",
        duplicateGroupName: "组名称 '{groupName}' 重复出现",
        invalidDelay: "第 {index} 项延迟时间无效: {value}",
        noValidGroups: "验证后执行列表为空，没有可执行的组",
        validationFailed: "组执行管理器验证失败：\n\n{errors}\n\n请检查组配置和工作流中的分组框架。",
        configError: "组执行管理器配置错误：\n\n{errors}",

        // 日志消息
        syncConfig: "同步配置",
        updateSuccess: "配置更新成功，验证通过",
        updateFailed: "配置更新失败！",
        validatingGroup: "验证组 \"{groupName}\" ({current}/{total})",
        validationPassed: "组 \"{groupName}\" 验证通过 ({count} 个输出节点)",
        allValidationPassed: "所有组验证通过",
        executionStart: "开始执行循环",
        executionComplete: "所有组执行完成",
        groupExecuting: "执行组 \"{groupName}\"",
        groupComplete: "组 \"{groupName}\" 执行完成，耗时: {duration}秒",
        queueEmpty: "队列已清空",
        totalDuration: "总耗时: {duration}秒"
    },
    en: {
        // UI Elements
        title: "Execution Group List",
        addGroup: "Add Group",
        selectGroup: "Select Group...",
        delay: "Delay",
        seconds: "sec",
        refresh: "Refresh Group List",
        delete: "Delete",
        languageSwitch: "Switch Language",
        filterByColor: "Filter by Color",
        filterOptions: "Filter Options",
        allColors: "All Colors",
        noColor: "No Color",
        customColors: "Custom Colors",

        // Validation Messages
        groupNotFound: "Group \"{groupName}\" not found",
        noNodesInGroup: "No nodes found in group \"{groupName}\"",
        noOutputNodes: "No output nodes found in group \"{groupName}\"",
        emptyConfig: "Group configuration is empty, please add at least one group",
        emptyConfigList: "Group configuration list is empty, please add at least one group",
        invalidFormat: "Invalid configuration format: expected JSON array, got {type}",
        jsonParseError: "JSON parse failed: {error}",
        invalidItem: "Item #{index} is not a valid configuration object",
        emptyGroupName: "Item #{index} has empty group name",
        duplicateGroupName: "Group name '{groupName}' appears multiple times",
        invalidDelay: "Item #{index} has invalid delay time: {value}",
        noValidGroups: "No valid groups to execute after validation",
        validationFailed: "Group Executor Manager validation failed:\n\n{errors}\n\nPlease check group configuration and workflow group frames.",
        configError: "Group Executor Manager configuration error:\n\n{errors}",

        // Log Messages
        syncConfig: "Sync Configuration",
        updateSuccess: "Configuration updated successfully, validation passed",
        updateFailed: "Configuration update failed!",
        validatingGroup: "Validating group \"{groupName}\" ({current}/{total})",
        validationPassed: "Group \"{groupName}\" validation passed ({count} output nodes)",
        allValidationPassed: "All groups validation passed",
        executionStart: "Start execution loop",
        executionComplete: "All groups execution completed",
        groupExecuting: "Executing group \"{groupName}\"",
        groupComplete: "Group \"{groupName}\" completed, duration: {duration}s",
        queueEmpty: "Queue is empty",
        totalDuration: "Total duration: {duration}s"
    }
};
