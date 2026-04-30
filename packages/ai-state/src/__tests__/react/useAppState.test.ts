// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createStore } from '../../store';
import { useAppState } from '../../react';

describe('useAppState', () => {
  it('返回 selector 选择的状态片段', () => {
    const store = createStore({ count: 0, name: 'test' });
    const { result } = renderHook(() => useAppState(store, state => state.count));
    expect(result.current).toBe(0);
  });

  it('状态更新后 selector 返回新值', () => {
    const store = createStore({ count: 0 });
    const { result } = renderHook(() => useAppState(store, state => state.count));

    act(() => {
      store.setState(prev => ({ count: prev.count + 1 }));
    });

    expect(result.current).toBe(1);
  });

  it('selector 返回值不变则组件不重渲染', () => {
    const store = createStore({ count: 0, name: 'test' });
    const selector = vi.fn(state => state.count);
    const { result } = renderHook(() => useAppState(store, selector));

    // 更新 name 但 count 不变
    act(() => {
      store.setState(prev => ({ ...prev, name: 'changed' }));
    });

    // selector 被调用（subscribe 触发），但返回值不变 → 不重渲染
    expect(result.current).toBe(0);
  });
});
