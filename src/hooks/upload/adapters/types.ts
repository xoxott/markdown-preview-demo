/**
 * 响应式适配器类型定义
 *
 * 解耦核心层与框架响应式系统，使 upload hook 可脱离 Vue 独立使用
 *
 * @module adapters/types
 */

/** 响应式引用类型 */
export type ReactiveRef<T> = { value: T };

/** 计算属性类型 */
export type ReactiveComputed<T> = { value: T };

/** Watch 返回的停止函数 */
export type WatchStopHandle = () => void;

/** Watch 源类型 */
export type WatchSource<T> = ReactiveRef<T> | ReactiveComputed<T> | (() => T);

/** Watch 选项 */
export interface WatchOptions {
  /** 是否深度观察 */
  deep?: boolean;
  /** 是否立即触发 */
  immediate?: boolean;
}

/**
 * 响应式适配器接口 — 解耦核心层与框架响应式系统
 *
 * @example
 *   ```typescript
 *   // Vue 适配器（项目中已有）
 *   const adapter: ReactiveAdapter = vueReactiveAdapter;
 *
 *   // 纯 JS 适配器（非 Vue 环境）
 *   const adapter: ReactiveAdapter = createPlainReactiveAdapter({ isDev: false });
 *   ```;
 */
export interface ReactiveAdapter {
  /** 创建响应式引用 */
  ref<T>(initialValue: T): ReactiveRef<T>;

  /** 创建计算属性 */
  computed<T>(fn: () => T): ReactiveComputed<T>;

  /** 观察响应式数据变化 */
  watch<T>(
    source: WatchSource<T>,
    callback: (newValue: T, oldValue: T) => void,
    options?: WatchOptions
  ): WatchStopHandle;

  /** 注册卸载回调 */
  onUnmounted(callback: () => void): void;

  /** 是否开发环境 */
  isDev(): boolean;

  /** 下一帧执行（类似 nextTick） */
  nextTick(callback: () => void): Promise<void>;
}
