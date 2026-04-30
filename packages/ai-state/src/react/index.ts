/** @suga/ai-state/react — React hook（可选扩展） */

import { useSyncExternalStore } from 'react';
import type { Store } from '../store';

/**
 * 从 Store 中订阅状态，selector 返回值不变则组件不重渲染
 *
 * 细粒度 selector 订阅，避免整棵树重渲染
 */
export function useAppState<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
