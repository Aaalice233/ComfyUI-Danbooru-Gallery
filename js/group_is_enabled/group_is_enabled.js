/**
 * 组是否启用节点 - Group Is Enabled
 * 检测组静音管理器中被管理组的启用状态
 */

import { app } from "/scripts/app.js";
import { createLogger } from '../global/logger_client.js';

const logger = createLogger('group_is_enabled');

// ============================================================
// 工具函数：深度优先遍历节点
// ============================================================

/**
 * 深度优先遍历节点及其子图节点，支持提前返回
 * @param {LGraphNode|LGraphNode[]} nodeOrNodes - 节点或节点数组
 * @param {Function} checkFn - 对每个节点执行的检查函数，返回 true 表示找到目标
 * @returns {boolean} 是否找到目标
 */
function hasNodeMatching(nodeOrNodes, checkFn) {
    const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
    const stack = nodes.map((node) => ({ node }));

    while (stack.length > 0) {
        const { node } = stack.pop();

        // 如果找到匹配的节点，立即返回
        if (checkFn(node)) {
            return true;
        }

        // 如果是子图节点，将其内部节点也加入处理栈
        if (node.isSubgraphNode?.() && node.subgraph) {
            const children = node.subgraph.nodes;
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push({ node: children[i] });
            }
        }
    }
    return false;
}

// ============================================================
// 核心功能函数
// ============================================================

/**
 * 获取所有被组静音管理器管理的组名列表
 * @returns {string[]} 组名数组（去重并排序）
 */
function getManagedGroups() {
    const managedGroups = new Set();

    if (!app.graph || !app.graph._nodes) {
        return [];
    }

    // 遍历所有节点，查找 GroupMuteManager 类型的节点
    for (const node of app.graph._nodes) {
        if (node.type === "GroupMuteManager" && node.properties && node.properties.groups) {
            // 从 properties.groups 中提取组名
            for (const groupConfig of node.properties.groups) {
                if (groupConfig.group_name) {
                    managedGroups.add(groupConfig.group_name);
                }
            }
        }
    }

    // 转换为排序后的数组
    return Array.from(managedGroups).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 获取组内的所有节点
 * @param {LGraphGroup} group - 组对象
 * @returns {LGraphNode[]} 节点数组
 */
function getNodesInGroup(group) {
    if (!group) return [];

    // 重新计算组内节点
    if (group.recomputeInsideNodes) {
        group.recomputeInsideNodes();
    }

    // 优先使用 _children，如果没有则尝试 _nodes
    const children = group._children || group._nodes || [];

    // 过滤出真正的节点（LGraphNode）
    return Array.from(children).filter(c => c && typeof c.mode !== 'undefined');
}

/**
 * 检查组是否启用（非静音且非bypass）
 * @param {string} groupName - 组名
 * @returns {boolean} 是否启用
 */
function isGroupEnabled(groupName) {
    if (!app.graph || !app.graph._groups) {
        return true; // 默认启用
    }

    // 查找组
    const group = app.graph._groups.find(g => g && g.title === groupName);
    if (!group) {
        logger.warn('[GIE] 组不存在:', groupName);
        return true; // 默认启用
    }

    // 获取组内节点
    const nodes = getNodesInGroup(group);

    if (nodes.length === 0) {
        return true; // 空组默认启用
    }

    // 使用深度优先遍历检查所有节点（支持提前返回）
    // 如果有任何节点是 ALWAYS 状态，则认为组是启用的
    return hasNodeMatching(nodes, (node) => node.mode === 0); // LiteGraph.ALWAYS = 0
}

/**
 * 收集所有被管理组的状态
 * @returns {Object} 组名到状态的映射
 */
function collectGroupStates() {
    const managedGroups = getManagedGroups();
    const states = {};

    for (const groupName of managedGroups) {
        states[groupName] = isGroupEnabled(groupName);
    }

    return states;
}

/**
 * 同步所有组状态到后端（带超时保护）
 * @param {number} timeout - 超时时间（毫秒）
 */
async function syncGroupStatesToBackend(timeout = 2000) {
    const states = collectGroupStates();

    if (Object.keys(states).length === 0) {
        return;
    }

    try {
        // 创建带超时的 fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch('/danbooru_gallery/group_is_enabled/sync_states', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ states }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            logger.info('[GIE] 组状态已同步到后端:', Object.keys(states).length, '个组');
        } else {
            const errorText = await response.text();
            logger.error('[GIE] 同步组状态失败:', response.status, errorText);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.warn('[GIE] 同步组状态超时，使用缓存状态继续执行');
        } else {
            logger.error('[GIE] 同步组状态失败:', error.message);
        }
    }
}

// ============================================================
// 扩展注册
// ============================================================

app.registerExtension({
    name: "danbooru.GroupIsEnabled",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "GroupIsEnabled") return;

        // 节点创建时的处理
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);

            // 移除默认的 group_name 输入widget（如果存在）
            const groupNameWidgetIndex = this.widgets?.findIndex(w => w.name === "group_name");
            if (groupNameWidgetIndex > -1) {
                this.widgets.splice(groupNameWidgetIndex, 1);
            }

            // 添加动态combo widget
            this.addWidget("combo", "group_name", "", (value) => {
                // 值变化时的回调
                logger.info('[GIE] 选择组:', value);
            }, {
                values: () => {
                    // 动态获取被管理的组列表
                    const groups = getManagedGroups();
                    return groups.length > 0 ? groups : ["(无被管理的组)"];
                },
                serialize: true
            });

            // 设置节点初始大小
            this.size = [220, 60];

            return result;
        };

        // 配置恢复时的处理
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function(info) {
            onConfigure?.apply(this, arguments);

            // 恢复combo widget的值
            if (info.widgets_values && this.widgets) {
                const groupNameWidget = this.widgets.find(w => w.name === "group_name");
                if (groupNameWidget && info.widgets_values.length > 0) {
                    groupNameWidget.value = info.widgets_values[0];
                }
            }
        };
    },

    async setup() {
        logger.info('[GIE] 组是否启用扩展已加载');

        // 拦截队列执行，在执行前同步组状态
        const originalQueuePrompt = app.queuePrompt;
        app.queuePrompt = async function(...args) {
            // 先同步组状态（带超时保护）
            await syncGroupStatesToBackend();

            // 然后执行原始的队列方法
            return originalQueuePrompt.apply(this, args);
        };

        logger.info('[GIE] 已拦截queuePrompt以同步组状态');
    }
});

logger.info('[GIE] 组是否启用扩展脚本已加载');
