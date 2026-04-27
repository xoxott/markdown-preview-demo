/**
 * 纯 JS 响应式适配器
 *
 * 无框架依赖的响应式实现，用于非 Vue 环境（SSR、测试、纯 JS 项目）
 *
 * @module adapters/plainReactiveAdapter
 */

import type {
  ReactiveAdapter,
  ReactiveComputed,
  ReactiveRef,
  WatchOptions,
  WatchSource,
  WatchStopHandle
} from './types';

/** 纯 JS 适配器配置 */
export interface PlainReactiveAdapterOptions {
  /** 是否开发环境 */
  isDev?: boolean;
  /** watch 轮询间隔（毫秒），默认 200 */
  pollInterval?: number;
}

/** 共享轮询器 — 所有 watcher 共用一个定时器，减少资源消耗 */
class SharedPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private watchers: Set<() => void> = new Set();
  readonly interval: number;

  constructor(interval: number) {
    this.interval = interval;
  }

  add(watcher: () => void): void {
    this.watchers.add(watcher);
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        for (const fn of this.watchers) fn();
      }, this.interval);
    }
  }

  remove(watcher: () => void): void {
    this.watchers.delete(watcher);
    if (this.watchers.size === 0 && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.watchers.clear();
  }
}

let sharedPoller: SharedPoller | null = null;

function getSharedPoller(interval: number): SharedPoller {
  if (!sharedPoller || sharedPoller.interval !== interval) {
    if (sharedPoller) sharedPoller.destroy();
    sharedPoller = new SharedPoller(interval);
  }
  return sharedPoller;
}

/** 重置共享轮询器（仅供测试使用） */
export function resetSharedPoller(): void {
  if (sharedPoller) {
    sharedPoller.destroy();
    sharedPoller = null;
  }
}

/**
 * 创建纯 JS 响应式适配器
 *
 * 无响应式追踪，ref/computed 返回普通对象，watch 使用共享轮询器检测变化
 *
 * @param options - 适配器配置
 * @returns ReactiveAdapter 实例
 */
export function createPlainReactiveAdapter(options?: PlainReactiveAdapterOptions): ReactiveAdapter {
  const unmountCallbacks: (() => void)[] = [];
  const isDevFlag = options?.isDev ?? false;
  const pollInterval = options?.pollInterval ?? 200;
  const poller = getSharedPoller(pollInterval);

  return {
    ref<T>(initialValue: T): ReactiveRef<T> {
      return { value: initialValue };
    },

    computed<T>(fn: () => T): ReactiveComputed<T> {
      const computedRef: ReactiveComputed<T> = {
        get value(): T {
          return fn();
        },
        set value(_val: T) {
          // 计算属性不可赋值
        }
      };
      return computedRef;
    },

    watch<T>(
      source: WatchSource<T>,
      callback: (newValue: T, oldValue: T) => void,
      watchOpts?: WatchOptions
    ): WatchStopHandle {
      const getValue = (): T => {
        if (typeof source === 'function') {
          return source();
        }
        return source.value;
      };

      // 初始快照：深克隆保存初始状态，确保就地修改可被检测
      let oldValue: unknown = snapshot(getValue());

      // immediate 选项：立即触发一次
      if (watchOpts?.immediate) {
        const initialValue = getValue();
        callback(initialValue, initialValue);
      }

      // 使用共享轮询器检测变化
      const check = () => {
        const newValue = getValue();
        if (isValueChanged(newValue, oldValue)) {
          callback(newValue, oldValue as T);
          oldValue = snapshot(newValue);
        }
      };

      poller.add(check);

      const stop = () => {
        poller.remove(check);
      };

      unmountCallbacks.push(stop);

      return stop;
    },

    onUnmounted(callback: () => void): void {
      unmountCallbacks.push(callback);
    },

    isDev(): boolean {
      return isDevFlag;
    },

    nextTick(callback: () => void): Promise<void> {
      return Promise.resolve().then(callback);
    }
  };
}

/** 默认纯 JS 适配器实例 */
export const plainReactiveAdapter: ReactiveAdapter = createPlainReactiveAdapter({ isDev: false });

/** 创建值快照（原始值直接返回，引用类型深克隆） */
function snapshot(value: unknown): unknown {
  if (value instanceof Map) return new Map(value);
  if (value instanceof Set) return new Set(value);
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      if (Array.isArray(value)) return [...value];
      return { ...value };
    }
  }
  return value;
}

/** 检测值是否发生变化（支持原始值和引用类型的就地修改） */
function isValueChanged(newValue: unknown, oldValue: unknown): boolean {
  // Map 比较（无论引用是否相同）
  if (newValue instanceof Map && oldValue instanceof Map) {
    if (newValue.size !== oldValue.size) return true;
    for (const [key, val] of newValue) {
      if (oldValue.get(key) !== val) return true;
    }
    return false;
  }

  // Set 比较
  if (newValue instanceof Set && oldValue instanceof Set) {
    if (newValue.size !== oldValue.size) return true;
    return false;
  }

  // 原始值：简单比较
  if (newValue !== oldValue) {
    // 引用类型引用不同时，比较内容
    if (
      typeof newValue === 'object' &&
      newValue !== null &&
      typeof oldValue === 'object' &&
      oldValue !== null
    ) {
      return !shallowEqual(newValue, oldValue);
    }
    return true;
  }

  // 同一引用：就地修改检测
  if (Array.isArray(newValue) && Array.isArray(oldValue)) {
    if (newValue.length !== oldValue.length) return true;
    for (let i = 0; i < newValue.length; i++) {
      if (newValue[i] !== oldValue[i]) return true;
    }
    return false;
  }

  if (
    typeof newValue === 'object' &&
    newValue !== null &&
    typeof oldValue === 'object' &&
    oldValue !== null
  ) {
    return !shallowEqual(newValue, oldValue);
  }

  return false;
}

/** 浅层内容比较（仅比较一层属性/元素） */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) return false;
    }
    return true;
  }

  return a === b;
}
