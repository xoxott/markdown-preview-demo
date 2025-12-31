/**
 * RAF 循环 Hook
 *
 * 使用 requestAnimationFrame 创建持续循环执行的函数。
 * 适用于需要每帧都执行的场景，如：
 * - FPS 监控
 * - 动画循环
 * - 持续更新状态
 *
 * @example
 * ```typescript
 * // 基础用法：循环执行
 * const { start, stop } = useRafLoop(() => {
 *   updateFPS();
 * });
 *
 * // 自动开始（默认）
 * onMounted(() => {
 *   start();
 * });
 *
 * // 手动停止
 * stop();
 * ```
 *
 * @example
 * ```typescript
 * // 响应式控制
 * const enabled = ref(true);
 * const { start, stop } = useRafLoop(() => {
 *   updateMetrics();
 * }, enabled);
 *
 * // 动态控制
 * enabled.value = false; // 自动停止
 * enabled.value = true;  // 自动开始
 * ```
 */

import { ref, watch, onUnmounted, type Ref } from 'vue';
import { isFunction, isBoolean, isRef } from '../utils/type-utils';

/**
 * RAF 循环 Hook 返回值
 */
export interface UseRafLoopReturn {
  /**
   * 开始循环
   *
   * 如果循环未运行，则开始执行
   */
  start: () => void;

  /**
   * 停止循环
   *
   * 取消 RAF，停止循环执行
   */
  stop: () => void;

  /**
   * 是否正在运行
   *
   * 响应式引用，表示循环是否正在运行
   */
  isRunning: Ref<boolean>;
}

/**
 * RAF 循环 Hook
 *
 * 使用 requestAnimationFrame 创建持续循环执行的函数。
 * 循环会在每帧执行一次，直到手动停止或组件卸载。
 *
 * @param callback 循环执行的函数
 * @param enabled 是否启用循环（可以是响应式引用）
 * @returns 循环控制方法
 *
 * @example
 * ```typescript
 * // FPS 监控
 * const { start, stop } = useRafLoop(() => {
 *   const now = performance.now();
 *   frameCount++;
 *   if (now - lastTime >= 1000) {
 *     fps.value = Math.round((frameCount * 1000) / (now - lastTime));
 *     frameCount = 0;
 *     lastTime = now;
 *   }
 * });
 *
 * onMounted(() => start());
 * ```
 */
export function useRafLoop(
  callback: () => void,
  enabled: Ref<boolean> | (() => boolean) | boolean = true
): UseRafLoopReturn {
  /** RAF 请求 ID（用于取消） */
  let rafId: number | null = null;

  /** 是否正在运行（响应式） */
  const isRunning = ref(false);

  /**
   * 检查是否启用
   *
   * 根据 enabled 的类型（函数、布尔值、响应式引用）返回当前是否启用
   *
   * @returns 是否启用
   */
  const checkEnabled = (): boolean => {
    if (isFunction(enabled)) {
      return enabled();
    }
    if (isBoolean(enabled)) {
      return enabled;
    }
    return enabled.value;
  };

  /**
   * 循环执行函数
   *
   * 在每帧执行回调，然后请求下一帧继续执行
   */
  const loop = () => {
    // 检查是否仍然启用
    if (!checkEnabled()) {
      isRunning.value = false;
      rafId = null;
      return;
    }

    // 执行回调
    callback();

    // 请求下一帧继续执行
    rafId = requestAnimationFrame(loop);
  };

  /**
   * 开始循环
   *
   * 如果循环未运行，则开始执行
   */
  const start = () => {
    if (rafId !== null) return; // 已经在运行
    isRunning.value = true;
    rafId = requestAnimationFrame(loop);
  };

  /**
   * 停止循环
   *
   * 取消 RAF，停止循环执行
   */
  const stop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    isRunning.value = false;
  };


  /**
   * 初始化循环
   *
   * 根据 enabled 的类型决定如何初始化：
   * - 响应式引用：监听变化，自动开始/停止
   * - 函数/布尔值：根据初始值决定是否开始
   */
  const initializeLoop = () => {
    if (isRef(enabled)) {  // 响应式引用：监听变化
      watch(
        () => enabled.value,
        (newVal) => {
          if (newVal) {
            start();
          } else {
            stop();
          }
        },
        { immediate: true }
      );
      return;
    }
    // 函数或布尔值：根据初始值决定
    const shouldStart = checkEnabled();
    if (shouldStart) requestAnimationFrame(() => checkEnabled() ? start() : stop());
  };

  initializeLoop();

  onUnmounted(() => {
    stop();
  });

  return {
    start,
    stop,
    isRunning
  };
}

