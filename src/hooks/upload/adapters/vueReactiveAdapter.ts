/**
 * Vue 响应式适配器
 *
 * 使用 Vue 的 ref/computed/watch/onUnmounted/nextTick 实现响应式接口
 *
 * @module adapters/vueReactiveAdapter
 */

import { computed, isRef, nextTick, onUnmounted, ref, watch } from 'vue';
import type {
  ReactiveAdapter,
  ReactiveComputed,
  ReactiveRef,
  WatchOptions,
  WatchSource,
  WatchStopHandle
} from './types';

/** Vue 响应式适配器 — 适配 Vue 3 响应式系统 */
export const vueReactiveAdapter: ReactiveAdapter = {
  ref<T>(initialValue: T): ReactiveRef<T> {
    return ref(initialValue) as unknown as ReactiveRef<T>;
  },

  computed<T>(fn: () => T): ReactiveComputed<T> {
    return computed(fn) as unknown as ReactiveComputed<T>;
  },

  watch<T>(
    source: WatchSource<T>,
    callback: (newValue: T, oldValue: T) => void,
    watchOpts?: WatchOptions
  ): WatchStopHandle {
    const vueOptions: Record<string, unknown> = {};
    if (watchOpts?.deep) {
      vueOptions.deep = true;
    }
    if (watchOpts?.immediate) {
      vueOptions.immediate = true;
    }

    // WatchSource 可以是 ref、computed 或 getter 函数
    const watched = isRef(source) ? source : typeof source === 'function' ? source : source;

    return watch(
      watched,
      callback as (...args: unknown[]) => unknown,
      vueOptions
    ) as WatchStopHandle;
  },

  onUnmounted(callback: () => void): void {
    onUnmounted(callback);
  },

  isDev(): boolean {
    return import.meta.env.DEV;
  },

  nextTick(callback: () => void): Promise<void> {
    return nextTick(callback);
  }
};
