/**
 * 点击/拖拽区分 Hook
 *
 * 用于区分点击和拖拽操作，在拖拽发生后阻止后续的点击事件
 */

import { ref, onUnmounted, type Ref } from 'vue';

export interface UseClickDragDistinctionOptions {
  /** 阻止持续时间（毫秒），默认 300ms */
  blockDuration?: number;
}

export interface UseClickDragDistinctionReturn {
  /** 是否点击被阻止（用于区分拖拽和点击） */
  isClickBlocked: Ref<boolean>;
  /** 标记拖拽发生，开始阻止点击 */
  markDragOccurred: () => void;
  /** 清理资源 */
  cleanup: () => void;
}

/**
 * 点击/拖拽区分 Hook
 *
 * 当拖拽发生时，会阻止后续的点击事件一段时间，用于区分点击和拖拽操作
 *
 * @param options 配置选项
 * @returns 点击/拖拽区分相关的状态和方法
 *
 * @example
 * ```typescript
 * const { isClickBlocked, markDragOccurred, cleanup } = useClickDragDistinction({
 *   blockDuration: 300
 * });
 *
 * // 在拖拽结束时调用
 * onDragEnd: (hasMoved) => {
 *   if (hasMoved) {
 *     markDragOccurred();
 *   }
 * }
 *
 * // 在点击事件中检查
 * if (isClickBlocked.value) {
 *   return; // 忽略点击事件
 * }
 * ```
 */
export function useClickDragDistinction(
  options: UseClickDragDistinctionOptions = {}
): UseClickDragDistinctionReturn {
  const { blockDuration = 300 } = options;

  /** 是否点击被阻止 */
  const isClickBlocked = ref(false);

  /** 点击阻止定时器 */
  let clickBlockTimeout: number | null = null;

  /**
   * 标记拖拽发生，开始阻止点击
   */
  const markDragOccurred = () => {
    // 设置阻止标志
    isClickBlocked.value = true;

    // 清除之前的定时器
    if (clickBlockTimeout !== null) {
      clearTimeout(clickBlockTimeout);
    }

    // 在指定时间后清除阻止标志
    clickBlockTimeout = window.setTimeout(() => {
      isClickBlocked.value = false;
      clickBlockTimeout = null;
    }, blockDuration);
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    if (clickBlockTimeout !== null) {
      clearTimeout(clickBlockTimeout);
      clickBlockTimeout = null;
    }
    isClickBlocked.value = false;
  };

  // 组件卸载时清理定时器，防止内存泄漏
  onUnmounted(() => {
    cleanup();
  });

  return {
    isClickBlocked,
    markDragOccurred,
    cleanup
  };
}

