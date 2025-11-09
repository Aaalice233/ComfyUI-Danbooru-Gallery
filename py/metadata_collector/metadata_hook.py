import sys
import inspect
from .metadata_registry import MetadataRegistry
from ..utils.logger import get_logger

# 初始化logger
logger = get_logger(__name__)

class MetadataHook:
    """Install hooks for metadata collection with chain support"""

    # 类级别标志，避免重复安装
    _installed = False

    @staticmethod
    def is_installed():
        """Check if metadata hook is already installed"""
        return MetadataHook._installed

    @staticmethod
    def install():
        """Install hooks to collect metadata during execution (with chain support)"""
        # 避免重复安装
        if MetadataHook._installed:
            logger.info("Metadata hook already installed, skipping")
            return

        try:
            # Import ComfyUI's execution module
            execution = None
            try:
                # Try direct import first
                import execution # type: ignore
            except ImportError:
                # Try to locate from system modules
                for module_name in sys.modules:
                    if module_name.endswith('.execution'):
                        execution = sys.modules[module_name]
                        break
                    
            # If we can't find the execution module, we can't install hooks
            if execution is None:
                logger.info("Could not locate ComfyUI execution module, metadata collection disabled")
                return

            # 检测是否已有其他 hook 安装
            map_node_func = getattr(execution, '_map_node_over_list', None) or getattr(execution, '_async_map_node_over_list', None)
            has_existing_hook = False
            if map_node_func and (hasattr(map_node_func, '__wrapped__') or 'metadata' in map_node_func.__name__.lower()):
                has_existing_hook = True
                logger.info("Detected existing metadata hook (possibly from another plugin)")

            # Detect whether we're using the new async version of ComfyUI
            is_async = False
            map_node_func_name = '_map_node_over_list'

            if hasattr(execution, '_async_map_node_over_list'):
                is_async = inspect.iscoroutinefunction(execution._async_map_node_over_list)
                map_node_func_name = '_async_map_node_over_list'
            elif hasattr(execution, '_map_node_over_list'):
                is_async = inspect.iscoroutinefunction(execution._map_node_over_list)

            if is_async:
                logger.info("Detected async ComfyUI execution, installing async metadata hooks with chain support")
                MetadataHook._install_async_hooks(execution, map_node_func_name)
            else:
                logger.info("Detected sync ComfyUI execution, installing sync metadata hooks with chain support")
                MetadataHook._install_sync_hooks(execution)

            # 标记为已安装
            MetadataHook._installed = True
            logger.info("✓ Metadata collection hooks installed successfully")
            
        except Exception as e:
            logger.error(f"Error installing metadata hooks: {str(e)}")
    
    @staticmethod
    def _install_sync_hooks(execution):
        """Install hooks for synchronous execution model (with chain support)"""
        # Store the original _map_node_over_list function (可能是其他插件的 hook)
        original_map_node_over_list = execution._map_node_over_list

        # Define the wrapped _map_node_over_list function
        def map_node_over_list_with_metadata(obj, input_data_all, func, allow_interrupt=False, execution_block_cb=None, pre_execute_cb=None):
            # 收集元数据（前置）- 异常隔离，不影响其他 hook
            if func == obj.FUNCTION and hasattr(obj, '__class__'):
                try:
                    registry = MetadataRegistry()
                    prompt_id = registry.current_prompt_id

                    if prompt_id is not None:
                        class_type = obj.__class__.__name__
                        node_id = getattr(obj, 'unique_id', None)

                        if node_id is None and pre_execute_cb:
                            frame = inspect.currentframe()
                            while frame:
                                if 'unique_id' in frame.f_locals:
                                    node_id = frame.f_locals['unique_id']
                                    break
                                frame = frame.f_back

                        if node_id is not None:
                            registry.record_node_execution(node_id, class_type, input_data_all, None)
                except Exception as e:
                    logger.error(f"Metadata collection error (pre): {e}")

            # 调用原始函数（可能包含其他插件的 hook）
            results = original_map_node_over_list(obj, input_data_all, func, allow_interrupt, execution_block_cb, pre_execute_cb)

            # 收集元数据（后置）- 异常隔离
            if func == obj.FUNCTION and hasattr(obj, '__class__'):
                try:
                    registry = MetadataRegistry()
                    prompt_id = registry.current_prompt_id

                    if prompt_id is not None:
                        class_type = obj.__class__.__name__
                        node_id = getattr(obj, 'unique_id', None)

                        if node_id is None and pre_execute_cb:
                            frame = inspect.currentframe()
                            while frame:
                                if 'unique_id' in frame.f_locals:
                                    node_id = frame.f_locals['unique_id']
                                    break
                                frame = frame.f_back

                        if node_id is not None:
                            registry.update_node_execution(node_id, class_type, results)
                except Exception as e:
                    logger.error(f"Metadata collection error (post): {e}")

            return results

        # 添加标记，便于其他插件检测和链式调用
        map_node_over_list_with_metadata.__wrapped__ = original_map_node_over_list
        map_node_over_list_with_metadata.__module__ = 'ComfyUI-Danbooru-Gallery'
        map_node_over_list_with_metadata.__name__ = 'map_node_over_list_with_metadata'
            
        # Also hook the execute function to track the current prompt_id
        original_execute = execution.execute

        def execute_with_prompt_tracking(*args, **kwargs):
            # 异常隔离
            try:
                if len(args) >= 7:
                    server, prompt, caches, node_id, extra_data, executed, prompt_id = args[:7]
                    registry = MetadataRegistry()

                    if not registry.current_prompt_id or registry.current_prompt_id != prompt_id:
                        registry.start_collection(prompt_id)

                    if hasattr(prompt, 'original_prompt'):
                        registry.set_current_prompt(prompt)
            except Exception as e:
                logger.error(f"Prompt tracking error: {e}")

            # 调用原始函数（可能包含其他插件的 hook）
            return original_execute(*args, **kwargs)

        # 添加标记
        execute_with_prompt_tracking.__wrapped__ = original_execute
        execute_with_prompt_tracking.__module__ = 'ComfyUI-Danbooru-Gallery'

        # Replace the functions
        execution._map_node_over_list = map_node_over_list_with_metadata
        execution.execute = execute_with_prompt_tracking
    
    @staticmethod
    def _install_async_hooks(execution, map_node_func_name='_async_map_node_over_list'):
        """Install hooks for asynchronous execution model (with chain support)"""
        # Store the original function (可能是其他插件的 hook)
        original_map_node_over_list = getattr(execution, map_node_func_name)

        # Wrapped async function, compatible with both stable and nightly
        async def async_map_node_over_list_with_metadata(prompt_id, unique_id, obj, input_data_all, func, allow_interrupt=False, execution_block_cb=None, pre_execute_cb=None, *args, **kwargs):
            hidden_inputs = kwargs.get('hidden_inputs', None)

            # 收集元数据（前置）- 异常隔离
            if func == obj.FUNCTION and hasattr(obj, '__class__'):
                try:
                    registry = MetadataRegistry()
                    if prompt_id is not None:
                        class_type = obj.__class__.__name__
                        node_id = unique_id
                        if node_id is not None:
                            registry.record_node_execution(node_id, class_type, input_data_all, None)
                except Exception as e:
                    logger.error(f"Async metadata collection error (pre): {e}")

            # 调用原始函数（可能包含其他插件的 hook）
            # 使用关键字参数传递以确保链式钩子的兼容性
            results = await original_map_node_over_list(
                prompt_id, unique_id, obj, input_data_all, func,
                allow_interrupt=allow_interrupt,
                execution_block_cb=execution_block_cb,
                pre_execute_cb=pre_execute_cb,
                *args, **kwargs
            )

            # 收集元数据（后置）- 异常隔离
            if func == obj.FUNCTION and hasattr(obj, '__class__'):
                try:
                    registry = MetadataRegistry()
                    if prompt_id is not None:
                        class_type = obj.__class__.__name__
                        node_id = unique_id
                        if node_id is not None:
                            registry.update_node_execution(node_id, class_type, results)
                except Exception as e:
                    logger.error(f"Async metadata collection error (post): {e}")

            return results

        # 添加标记
        async_map_node_over_list_with_metadata.__wrapped__ = original_map_node_over_list
        async_map_node_over_list_with_metadata.__module__ = 'ComfyUI-Danbooru-Gallery'
        async_map_node_over_list_with_metadata.__name__ = 'async_map_node_over_list_with_metadata'
        
        # Also hook the execute function to track the current prompt_id
        original_execute = execution.execute

        async def async_execute_with_prompt_tracking(*args, **kwargs):
            # 异常隔离
            try:
                if len(args) >= 7:
                    server, prompt, caches, node_id, extra_data, executed, prompt_id = args[:7]
                    registry = MetadataRegistry()

                    if not registry.current_prompt_id or registry.current_prompt_id != prompt_id:
                        registry.start_collection(prompt_id)

                    if hasattr(prompt, 'original_prompt'):
                        registry.set_current_prompt(prompt)
            except Exception as e:
                logger.error(f"Async prompt tracking error: {e}")

            # 调用原始函数（可能包含其他插件的 hook）
            return await original_execute(*args, **kwargs)

        # 添加标记
        async_execute_with_prompt_tracking.__wrapped__ = original_execute
        async_execute_with_prompt_tracking.__module__ = 'ComfyUI-Danbooru-Gallery'

        # Replace the functions with async versions
        setattr(execution, map_node_func_name, async_map_node_over_list_with_metadata)
        execution.execute = async_execute_with_prompt_tracking
