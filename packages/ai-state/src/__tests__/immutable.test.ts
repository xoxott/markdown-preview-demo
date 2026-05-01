import { describe, expect, it, vi } from 'vitest';
import { createImmutableStore } from '../immutable';

describe('createImmutableStore', () => {
  it('创建 immutable store 并读取初始状态', () => {
    const store = createImmutableStore({ count: 0, name: 'test' });
    expect(store.getState()).toEqual({ count: 0, name: 'test' });
  });

  it('setState 更新 immutable 状态', () => {
    const store = createImmutableStore({ count: 0 });
    store.setState(prev => ({ ...prev, count: prev.count + 1 }));
    expect(store.getState().count).toBe(1);
  });

  it('onChange 副作用拦截', () => {
    const onChange = vi.fn();
    const store = createImmutableStore({ items: [] as readonly string[] }, onChange);

    store.setState(prev => ({ ...prev, items: [...prev.items, 'a'] }));
    expect(onChange).toHaveBeenCalledWith({
      newState: { items: ['a'] },
      oldState: { items: [] }
    });
  });

  it('subscribe + unsubscribe', () => {
    const listener = vi.fn();
    const store = createImmutableStore({ value: 0 });
    const unsub = store.subscribe(listener);

    store.setState(prev => ({ ...prev, value: prev.value + 1 }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.setState(prev => ({ ...prev, value: prev.value + 1 }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('Object.is 短路 — 返回 prev 不触发通知', () => {
    const listener = vi.fn();
    const store = createImmutableStore({ count: 0 });
    store.subscribe(listener);

    store.setState(prev => prev);
    expect(listener).not.toHaveBeenCalled();
  });
});
