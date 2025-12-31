/**
 * RAF 节流 Hook
 *
 * 使用 requestAnimationFrame 对函数执行进行节流，确保在每帧最多执行一次。
 * 适用于需要高频触发但不需要每帧都执行的场景，如：
 * - 监听数据变化并更新空间索引
 * - 调度渲染操作
 * - 节流事件处理
 *
 * @example
 * ```typescript
 * // 基础用法：节流执行函数
 * const { throttled, cancel } = useRafThrottle(() => {
 *   console.log('节流执行');
 * });
 *
 * // 在 watch 中使用
 * watch(() => data.value, () => {
 *   throttled(); // 每帧最多执行一次
 * });
 *
 * // 手动取消
 * cancel();
 * ```
 *
 * @example
 * ```typescript
 * // 带参数的函数
 * const { throttled } = useRafThrottle((value: number) => {
 *   updateIndex(value);
 * });
 *
 * watch(() => count.value, (newVal) => {
 *   throttled(newVal); // 参数会被保留，使用最新的参数执行
 * });
 * ```
 */

import { onUnmounted, ref, type Ref } from 'vue';
import { isFunction as isFunctionType } from '../utils/type-utils';

/**
 * RAF 节流配置选项
 */
export interface UseRafThrottleOptions {
  /**
   * 是否立即执行第一次调用
   *
   * 如果为 true，第一次调用会立即执行，后续调用才进行节流
   * 如果为 false，所有调用都进行节流
   *
   * @default false
   */
  immediate?: boolean;

  /**
   * 是否启用节流
   *
   * 可以是响应式引用，用于动态控制节流的启用状态
   *
   * @default true
   */
  enabled?: Ref<boolean> | (() => boolean);
}

/**
 * RAF 节流 Hook 返回值
 */
export interface UseRafThrottleReturn<T extends (...args: any[]) => any> {
  /**
   * 节流后的函数
   *
   * 调用此函数会进行 RAF 节流，确保每帧最多执行一次
   * 如果多次调用，会使用最新的参数执行
   */
  throttled: T;

  /**
   * 取消待执行的 RAF
   *
   * 用于手动取消节流，清理资源
   */
  cancel: () => void;

  /**
   * 是否正在等待执行
   *
   * 响应式引用，表示是否有待执行的 RAF
   */
  isPending: Ref<boolean>;
}

/**
 * RAF 节流 Hook
 *
 * 使用 requestAnimationFrame 对函数执行进行节流。
 * 确保在每帧最多执行一次，避免过度执行导致的性能问题。
 *
 * @param fn 需要节流的函数
 * @param options 配置选项
 * @returns 节流后的函数和控制方法
 *
 * @example
 * ```typescript
 * // 节流更新空间索引
 * const { throttled: updateSpatialIndex } = useRafThrottle(() => {
 *   spatialIndex.value.updateNodes(nodes.value);
 * });
 *
 * watch(() => nodes.value, () => {
 *   updateSpatialIndex();
 * });
 * ```
 */
export function useRafThrottle<T extends (...args: any[]) => any>(
  fn: T,
  options: UseRafThrottleOptions = {}
): UseRafThrottleReturn<T> {
  const { immediate = false, enabled = () => true } = options;

  /** RAF 请求 ID（用于取消） */
  let rafId: number | null = null;

  /** 待执行的函数参数（保留最新的参数） */
  let pendingArgs: Parameters<T> | null = null;

  /** 是否已经执行过第一次（用于 immediate 模式） */
  let hasExecuted = false;

  /** 是否正在等待执行（响应式） */
  const isPending = ref(false);

  /**
   * 执行函数
   *
   * 在 RAF 回调中执行，确保每帧最多执行一次
   */
  const execute = () => {
    if (pendingArgs) {
      // 执行函数，使用最新的参数
      fn(...pendingArgs);
      pendingArgs = null;
    }
    isPending.value = false;
  };

  /**
   * 节流后的函数
   *
   * 调用此函数会进行 RAF 节流，确保每帧最多执行一次
   *
   * @param args 函数参数
   */
  const throttled = ((...args: Parameters<T>) => {
    // 检查是否启用
    const isEnabled = isFunctionType(enabled) ? enabled() : enabled.value;
    if (!isEnabled) {
      return;
    }

    // 保存最新的参数
    pendingArgs = args;

    // 如果启用立即执行模式，且是第一次调用
    if (immediate && !hasExecuted) {
      hasExecuted = true;
      execute();
      return;
    }

    // 如果已经有待执行的 RAF，直接返回（使用最新的参数）
    if (rafId !== null) {
      return;
    }

    // 标记为等待执行
    isPending.value = true;

    // 请求下一帧执行
    rafId = requestAnimationFrame(() => {
      rafId = null;
      execute();
    });
  }) as T;

  /**
   * 取消待执行的 RAF
   *
   * 清理资源，取消待执行的函数调用
   */
  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingArgs = null;
    isPending.value = false;
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    cancel();
  });

  return {
    throttled,
    cancel,
    isPending
  };
}

