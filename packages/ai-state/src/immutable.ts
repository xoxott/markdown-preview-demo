/** DeepImmutable<T> — 递归 readonly 类型 + createImmutableStore 便捷创建 */

/** 递归将所有属性标记为 readonly */
export type DeepImmutable<T> =
  T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
    : T extends ReadonlySet<infer S>
      ? ReadonlySet<DeepImmutable<S>>
      : T extends readonly (infer R)[]
        ? readonly DeepImmutable<R>[]
        : T extends object
          ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
          : T;

import type { OnChange, Store } from './store';
import { createStore } from './store';

/**
 * 创建强制 DeepImmutable 的 Store
 *
 * 便捷创建函数，确保 store 内部状态始终为递归 readonly，
 * 与 P2 AgentState readonly 约束对齐。
 */
export function createImmutableStore<T>(
  initialState: DeepImmutable<T>,
  onChange?: OnChange<DeepImmutable<T>>
): Store<DeepImmutable<T>> {
  return createStore<DeepImmutable<T>>(initialState, onChange);
}
