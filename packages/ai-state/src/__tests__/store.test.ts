import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../store';

describe('createStore', () => {
  it('初始状态可通过 getState 获取', () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('setState updater 返回新对象则更新状态', () => {
    const store = createStore({ count: 0 });
    store.setState(prev => ({ count: prev.count + 1 }));
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('setState updater 返回 prev 则 Object.is 短路跳过通知', () => {
    const listener = vi.fn();
    const onChange = vi.fn();
    const store = createStore({ count: 0 }, onChange);
    store.subscribe(listener);

    // 返回 prev — Object.is 短路
    store.setState(prev => prev);
    expect(store.getState()).toEqual({ count: 0 });
    expect(listener).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('状态变更时通知所有订阅者', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const store = createStore({ count: 0 });
    store.subscribe(listener1);
    store.subscribe(listener2);

    store.setState(prev => ({ count: prev.count + 1 }));
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe 后不再收到通知', () => {
    const listener = vi.fn();
    const store = createStore({ count: 0 });
    const unsub = store.subscribe(listener);

    store.setState(prev => ({ count: prev.count + 1 }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.setState(prev => ({ count: prev.count + 2 }));
    expect(listener).toHaveBeenCalledTimes(1); // 不再触发
  });

  it('onChange 集中式副作用拦截', () => {
    const onChange = vi.fn();
    const store = createStore({ count: 0 }, onChange);

    store.setState(prev => ({ count: prev.count + 1 }));
    expect(onChange).toHaveBeenCalledWith({
      newState: { count: 1 },
      oldState: { count: 0 }
    });
  });

  it('onChange 不传则无副作用', () => {
    const store = createStore({ count: 0 });
    store.setState(prev => ({ count: prev.count + 1 }));
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('多次 setState 每次都触发通知', () => {
    const listener = vi.fn();
    const store = createStore({ count: 0 });
    store.subscribe(listener);

    store.setState(prev => ({ count: prev.count + 1 }));
    store.setState(prev => ({ count: prev.count + 1 }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState()).toEqual({ count: 2 });
  });

  it('支持任意类型的状态', () => {
    const store = createStore('hello');
    store.setState(() => 'world');
    expect(store.getState()).toBe('world');
  });

  it('支持数组状态', () => {
    const store = createStore<number[]>([1, 2, 3]);
    store.setState(prev => [...prev, 4]);
    expect(store.getState()).toEqual([1, 2, 3, 4]);
  });
});
