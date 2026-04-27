/* eslint-disable no-param-reassign */
/**
 * 响应式适配器管理器
 *
 * 通过 Symbol key 在实例上存储适配器，避免全局状态污染 默认不加载任何框架适配器，由消费者根据环境显式设置
 *
 * @module adapters/manager
 */

import type { ReactiveAdapter } from './types';

/** 内部符号键，用于存储适配器（避免命名冲突） */
const ADAPTER_KEY = Symbol('__reactiveAdapter');

/** 可存储适配器的对象类型 */
interface AdapterHost {
  [ADAPTER_KEY]?: ReactiveAdapter;
}

/** 默认适配器（延迟初始化，由消费者设置） */
let defaultAdapter: ReactiveAdapter | null = null;

/**
 * 设置默认适配器
 *
 * 必须在使用上传模块前调用。Vue 环境应设置 vueReactiveAdapter，纯 JS 环境应设置 plainReactiveAdapter
 *
 * @param adapter - 默认适配器实例
 */
export function setDefaultAdapter(adapter: ReactiveAdapter): void {
  defaultAdapter = adapter;
}

/**
 * 设置适配器到实例上
 *
 * @param instance - 上传模块实例（如 orchestrator/controller）
 * @param adapter - 响应式适配器
 */
export function setAdapter(instance: object, adapter: ReactiveAdapter): void {
  (instance as AdapterHost)[ADAPTER_KEY] = adapter;
}

/**
 * 获取适配器
 *
 * 优先从实例上获取，未设置时返回默认适配器 如果两者都未设置，抛出错误提示消费者配置适配器
 *
 * @param instance - 上传模块实例（可选）
 * @returns 响应式适配器
 */
export function getAdapter(instance?: object): ReactiveAdapter {
  // 1. 从实例上获取
  if (instance) {
    const adapter = (instance as AdapterHost)[ADAPTER_KEY];
    if (adapter) {
      return adapter;
    }
  }

  // 2. 返回默认适配器
  if (defaultAdapter) {
    return defaultAdapter;
  }

  // 3. 无适配器可用，提示配置
  throw new Error(
    '未设置响应式适配器。请在使用上传模块前调用 setDefaultAdapter()，' +
      'Vue 环境使用 vueReactiveAdapter，纯 JS 环境使用 plainReactiveAdapter'
  );
}

/**
 * 检查实例是否已设置适配器
 *
 * @param instance - 上传模块实例
 * @returns 是否已设置适配器
 */
export function hasAdapter(instance: object): boolean {
  return Boolean((instance as AdapterHost)[ADAPTER_KEY]);
}
