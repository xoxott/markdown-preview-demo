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
    const vueOptions: Record<string, unknown> = { flush: 'sync' };

    // ref 值为 Array/Map/Set/Object 时需要 deep watch 才能追踪内部变化
    // （如 array.shift()、map.set() 等原地修改不会触发浅层 watch）
    if (isRef(source)) {
      const raw = (source as any).value;
      if (raw instanceof Map || raw instanceof Set || Array.isArray(raw)) {
        vueOptions.deep = true;
      }
    }

    if (watchOpts?.deep) {
      vueOptions.deep = true;
    }
    if (watchOpts?.immediate) {
      vueOptions.immediate = true;
    }

    // WatchSource 可以是 ref、computed 或 getter 函数
    let watched: any;
    if (isRef(source)) {
      watched = source;
    } else if (typeof source === 'function') {
      watched = source;
    } else {
      watched = source;
    }

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
