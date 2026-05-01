/** @suga/ai-state/react — React hook（可选扩展） */

import { useCallback, useSyncExternalStore } from 'react';
import type { Store } from '../store';

/**
 * 从 Store 中订阅状态，selector 返回值不变则组件不重渲染
 *
 * 细粒度 selector 订阅，避免整棵树重渲染
 */
export function useAppState<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

/**
 * 获取 setState 但不订阅状态变化
 *
 * 适用于只需要修改状态而不需要读取状态的场景（如事件回调）， 避免因状态变化导致的无效重渲染。
 */
export function useSetAppState<T>(store: Store<T>): (updater: (prev: T) => T) => void {
  return useCallback((updater: (prev: T) => T) => store.setState(updater), [store]);
}
