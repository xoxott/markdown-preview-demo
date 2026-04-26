/**
 * 响应式适配器模块入口
 *
 * @module adapters
 */

// 导出类型
export type {
  ReactiveAdapter,
  ReactiveRef,
  ReactiveComputed,
  WatchSource,
  WatchStopHandle,
  WatchOptions
} from './types';

// 导出适配器管理器
export { setAdapter, getAdapter, hasAdapter, setDefaultAdapter } from './manager';

// 导出 Vue 适配器
export { vueReactiveAdapter } from './vueReactiveAdapter';

// 导出纯 JS 适配器
export { createPlainReactiveAdapter, plainReactiveAdapter } from './plainReactiveAdapter';
export type { PlainReactiveAdapterOptions } from './plainReactiveAdapter';
