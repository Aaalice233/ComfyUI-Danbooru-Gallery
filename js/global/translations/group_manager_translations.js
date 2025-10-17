/**
 * 组执行管理器翻译
 */

export const groupManagerTranslations = {
    zh: {
        // 标题和按钮
        title: '组执行管理器',
        addGroup: '添加组',
        deleteGroup: '删除',
        language: '语言',

        // 列表标题
        listHeader: {
            index: '序号',
            groupName: '组名',
            delay: '延迟(s)',
            actions: '操作'
        },

        // 提示信息
        messages: {
            addGroupSuccess: '组已添加',
            deleteGroupSuccess: '组已删除',
            groupNameEmpty: '组名不能为空',
            duplicateGroupName: '组名已存在',
            noGroupsToExecute: '没有可执行的组',
            noGroupsAvailable: '工作流中没有可用的组',
            executionStarted: '开始执行组列表',
            executionCompleted: '执行完成',
            executionError: '执行出错',
            groupNotFound: '未找到组',
            noOutputNodes: '组中没有输出节点',
            dragSuccess: '排序完成',
            delayUpdated: '延迟已更新'
        },

        // 对话框
        dialogs: {
            deleteConfirm: '确定要删除这个组吗?',
            groupNamePrompt: '请输入组名称:',
            delayPrompt: '请输入延迟秒数:',
            delayInvalid: '延迟值必须是非负数字'
        },

        // 状态文本
        status: {
            idle: '就绪',
            executing: '执行中',
            completed: '完成',
            error: '错误',
            waiting: '等待'
        },

        // 错误信息
        dom_init_failed: 'DOM未完成初始化',
        please_refresh: '请刷新页面或检查控制台'
    },

    en: {
        // Title and buttons
        title: 'Group Execute Manager',
        addGroup: 'Add Group',
        deleteGroup: 'Delete',
        language: 'Language',

        // List headers
        listHeader: {
            index: 'Index',
            groupName: 'Group Name',
            delay: 'Delay(s)',
            actions: 'Actions'
        },

        // Messages
        messages: {
            addGroupSuccess: 'Group added',
            deleteGroupSuccess: 'Group deleted',
            groupNameEmpty: 'Group name cannot be empty',
            duplicateGroupName: 'Group name already exists',
            noGroupsToExecute: 'No groups to execute',
            noGroupsAvailable: 'No groups available in workflow',
            executionStarted: 'Execution started',
            executionCompleted: 'Execution completed',
            executionError: 'Execution error',
            groupNotFound: 'Group not found',
            noOutputNodes: 'No output nodes in group',
            dragSuccess: 'Reordered successfully',
            delayUpdated: 'Delay updated'
        },

        // Dialogs
        dialogs: {
            deleteConfirm: 'Are you sure you want to delete this group?',
            groupNamePrompt: 'Enter group name:',
            delayPrompt: 'Enter delay in seconds:',
            delayInvalid: 'Delay must be a non-negative number'
        },

        // Status texts
        status: {
            idle: 'Ready',
            executing: 'Executing',
            completed: 'Completed',
            error: 'Error',
            waiting: 'Waiting'
        },

        // Error messages
        dom_init_failed: 'DOM initialization failed',
        please_refresh: 'Please refresh the page or check console'
    }
};
