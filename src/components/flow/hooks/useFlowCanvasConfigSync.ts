/**
 * FlowCanvas 配置同步 Hook
 *
 * 负责将配置变化同步到选择选项
 */

import { watch, type Ref } from 'vue';
import type { FlowConfig } from '../types';
import type { SelectionOptions } from '../core/interaction/FlowSelectionHandler';

/**
 * FlowCanvas 配置同步 Hook 选项
 */
export interface UseFlowCanvasConfigSyncOptions {
  /** 配置对象 */
  config: Ref<FlowConfig>;
  /** 设置选择选项的方法 */
  setSelectionOptions: (options: Partial<SelectionOptions>) => void;
}

/**
 * FlowCanvas 配置同步 Hook 返回值
 */
export interface UseFlowCanvasConfigSyncReturn {
  /** 开始同步（通常在组件挂载后调用） */
  start: () => void;
  /** 停止同步（通常在组件卸载时调用） */
  stop: () => void;
}

/**
 * FlowCanvas 配置同步 Hook
 *
 * 监听配置变化，更新选择选项
 *
 * @param options Hook 选项
 * @returns 同步控制方法
 *
 * @example
 * ```typescript
 * const { start, stop } = useFlowCanvasConfigSync({
 *   config,
 *   setSelectionOptions
 * });
 *
 * onMounted(() => start());
 * onUnmounted(() => stop());
 * ```
 */
export function useFlowCanvasConfigSync(
  options: UseFlowCanvasConfigSyncOptions
): UseFlowCanvasConfigSyncReturn {
  const {
    config,
    setSelectionOptions
  } = options;

  let stopWatch: (() => void) | null = null;

  /**
   * 开始同步
   */
  const start = () => {
    // 监听配置变化，更新选择选项（性能优化：只监听需要的属性，避免深度监听）
    stopWatch = watch(
      () => [
        config.value.interaction?.enableMultiSelection,
        config.value.interaction?.multiSelectKey,
        config.value.interaction?.enableBoxSelection,
        config.value.interaction?.boxSelectionKey
      ] as const,
      ([enableMultiSelection, multiSelectKey, enableBoxSelection, boxSelectionKey]) => {
        setSelectionOptions({
          enableMultiSelection: enableMultiSelection !== false,
          multiSelectKey: multiSelectKey || 'ctrl',
          enableBoxSelection: enableBoxSelection !== false,
          boxSelectionKey: boxSelectionKey || 'shift'
        });
      },
      { immediate: true } // 立即执行一次，确保初始配置生效
    );
  };

  /**
   * 停止同步
   */
  const stop = () => {
    if (stopWatch) {
      stopWatch();
      stopWatch = null;
    }
  };

  return {
    start,
    stop
  };
}

