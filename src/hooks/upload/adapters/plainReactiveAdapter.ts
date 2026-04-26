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
}

/**
 * 创建纯 JS 响应式适配器
 *
 * 无响应式追踪，ref/computed 返回普通对象， watch 使用简单轮询或手动触发机制
 *
 * @param options - 适配器配置
 * @returns ReactiveAdapter 实例
 */
export function createPlainReactiveAdapter(options?: PlainReactiveAdapterOptions): ReactiveAdapter {
  const unmountCallbacks: (() => void)[] = [];
  const isDevFlag = options?.isDev ?? false;

  return {
    ref<T>(initialValue: T): ReactiveRef<T> {
      return { value: initialValue };
    },

    computed<T>(fn: () => T): ReactiveComputed<T> {
      // 纯 JS 模式：计算属性每次访问重新计算（无缓存）
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

      let oldValue = getValue();

      // immediate 选项：立即触发一次
      if (watchOpts?.immediate) {
        callback(oldValue, oldValue);
      }

      // 纯 JS 模式：使用定时器轮询检测变化（简化版，性能较低）
      // 生产环境应使用 Vue 适配器获得真正的响应式追踪
      const intervalId = setInterval(() => {
        const newValue = getValue();
        if (newValue !== oldValue) {
          callback(newValue, oldValue);
          oldValue = newValue;
        }
      }, 100);

      const stop = () => {
        clearInterval(intervalId);
      };

      // 注册到卸载回调
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

/** 默认纯 JS 适配器实例（开发环境模式） */
export const plainReactiveAdapter: ReactiveAdapter = createPlainReactiveAdapter({ isDev: false });
