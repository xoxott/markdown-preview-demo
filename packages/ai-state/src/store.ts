/** Store<T> — 响应式状态容器（函数式闭包，与 Claude Code 对齐） */

export type Listener = () => void;
export type OnChange<T> = (args: { newState: T; oldState: T }) => void;

export type Store<T> = {
  readonly getState: () => T;
  readonly setState: (updater: (prev: T) => T) => void;
  readonly subscribe: (listener: Listener) => () => void;
};

/**
 * 创建响应式状态容器
 *
 * - setState(updater) 强制 immutable update，返回 prev 则 Object.is 短路跳过通知
 * - onChange 集中式副作用拦截点
 * - subscribe 返回 unsubscribe 函数，对接 useSyncExternalStore
 */
export function createStore<T>(initialState: T, onChange?: OnChange<T>): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener>();

  const getState = (): T => state;

  const setState = (updater: (prev: T) => T): void => {
    const prev = state;
    const next = updater(prev);
    // Object.is 短路 — updater 返回 prev 则跳过通知
    if (Object.is(prev, next)) return;
    state = next;
    // 集中式副作用拦截
    onChange?.({ newState: next, oldState: prev });
    // 批量通知所有订阅者
    for (const listener of listeners) {
      listener();
    }
  };

  const subscribe = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { getState, setState, subscribe };
}
