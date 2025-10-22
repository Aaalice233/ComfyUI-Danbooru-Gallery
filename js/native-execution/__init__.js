/**
 * Optimized Execution System Module Initialization
 * Version: 2.0.0
 * Based on LG_GroupExecutor Pattern
 */

import { api } from "/scripts/api.js";
import { app } from "/scripts/app.js";

import('./ui-enhancement.js');
import('./migration-helper.js');

if (!window.optimizedExecutionSystemLoaded) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOptimizedExecutionSystem);
    } else {
        initializeOptimizedExecutionSystem();
    }

    function initializeOptimizedExecutionSystem() {
        console.log('[OptimizedExecutionSystem] Starting initialization');
        console.log('[OptimizedExecutionSystem] Version: 2.0.0');
        console.log('[OptimizedExecutionSystem] Based on LG_GroupExecutor pattern');

        try {
            import('./ui-enhancement.js');
            console.log('[OptimizedExecutionSystem] UI Enhancement loaded');
        } catch (error) {
            console.warn('[OptimizedExecutionSystem] UI Enhancement load failed:', error);
        }

        setTimeout(() => {
            console.log('[OptimizedExecutionSystem] Initialization complete');
            console.log('[OptimizedExecutionSystem] Components loaded:');
            console.log('[OptimizedExecutionSystem]   - OptimizedExecutionEngine');
            console.log('[OptimizedExecutionSystem]   - CacheControlEvents');
            console.log('[OptimizedExecutionSystem]   - UIEnhancementManager');

            window.optimizedExecutionSystemLoaded = true;

            const initEvent = new CustomEvent('optimizedExecutionSystemReady', {
                detail: {
                    version: '2.0.0',
                    timestamp: Date.now(),
                    components: ['OptimizedExecutionEngine', 'CacheControlEvents', 'UIEnhancementManager']
                }
            });
            document.dispatchEvent(initEvent);

            // CRITICAL FIX: Hook api.queuePrompt() to filter prompt nodes
            // This follows the LG_GroupExecutor pattern
            try {
                if (api && !api._originalQueuePrompt) {
                    console.log('[OptimizedExecutionSystem] Installing api.queuePrompt hook...');
                    
                    api._originalQueuePrompt = api.queuePrompt;
                    window._queueNodeIds = null;
                    
                    api.queuePrompt = async function(index, prompt) {
                        console.log('[OptimizedExecutionSystem] api.queuePrompt called');
                        
                        // Filter prompt if _queueNodeIds is set
                        if (window._queueNodeIds && window._queueNodeIds.length && prompt.output) {
                            console.log('[OptimizedExecutionSystem] Filtering to nodes:', window._queueNodeIds);
                            
                            const oldOutput = prompt.output;
                            let newOutput = {};
                            
                            // Recursively add specified nodes and dependencies
                            for (const queueNodeId of window._queueNodeIds) {
                                recursiveAddNodes(String(queueNodeId), oldOutput, newOutput);
                            }
                            
                            prompt.output = newOutput;
                            console.log('[OptimizedExecutionSystem] Original nodes:', Object.keys(oldOutput).length);
                            console.log('[OptimizedExecutionSystem] Filtered nodes:', Object.keys(newOutput).length);
                            console.log('[OptimizedExecutionSystem] Final node IDs:', Object.keys(newOutput).join(', '));
                        }
                        
                        // Call original method
                        const response = api._originalQueuePrompt.apply(this, [index, prompt]);
                        
                        // Reset queue node IDs
                        window._queueNodeIds = null;
                        console.log('[OptimizedExecutionSystem] api.queuePrompt completed, reset _queueNodeIds');
                        
                        return response;
                    };
                    console.log('[OptimizedExecutionSystem] api.queuePrompt hook installed successfully');
                }
            } catch (error) {
                console.warn('[OptimizedExecutionSystem] Hook installation failed:', error);
                console.error(error.stack);
            }

        }, 1000);
    }
}

// Helper function: recursively add nodes and dependencies
function recursiveAddNodes(nodeId, oldOutput, newOutput) {
    if (newOutput[nodeId] != null) {
        return;
    }
    
    const currentNode = oldOutput[nodeId];
    if (!currentNode) {
        return;
    }
    
    newOutput[nodeId] = currentNode;
    
    // Recursively add dependent nodes
    Object.values(currentNode.inputs || {}).forEach(inputValue => {
        if (Array.isArray(inputValue)) {
            recursiveAddNodes(String(inputValue[0]), oldOutput, newOutput);
        }
    });
}

export const OPTIMIZED_EXECUTION_CONFIG = {
    version: '2.0.0',
    debugMode: true,
    defaultTimeout: 300000,
    maxRetries: 3
};

console.log('[OptimizedExecutionSystem] Module loaded');

