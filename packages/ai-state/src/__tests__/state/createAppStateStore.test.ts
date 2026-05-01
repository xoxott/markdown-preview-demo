/** createAppStateStore 测试 — Store创建+setState+subscribe */

import { describe, expect, it, vi } from 'vitest';
import { createAppStateStore, getDefaultAppState } from '../../state/createAppStateStore';

describe('createAppStateStore', () => {
  it('创建 store — 默认初始状态', () => {
    const store = createAppStateStore();
    expect(store.getState().permissions.currentMode).toBe('default');
    expect(store.getState().settings.settingsCacheValid).toBe(true);
    expect(store.getState().tasks.tasks.size).toBe(0);
  });

  it('创建 store — 自定义初始状态覆盖', () => {
    const store = createAppStateStore({
      permissions: {
        ...getDefaultAppState().permissions,
        currentMode: 'auto'
      }
    } as any);
    expect(store.getState().permissions.currentMode).toBe('auto');
  });

  it('setState — immutable update', () => {
    const store = createAppStateStore();
    store.setState(prev => ({
      ...prev,
      ui: { ...prev.ui, expandedView: 'tasks' }
    }));
    expect(store.getState().ui.expandedView).toBe('tasks');
  });

  it('setState — Object.is 短路跳过通知', () => {
    const listener = vi.fn();
    const store = createAppStateStore();
    store.subscribe(listener);
    store.setState(prev => prev); // 返回 prev
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribe — 变更通知', () => {
    const listener = vi.fn();
    const onChange = vi.fn();
    const store = createAppStateStore(undefined, onChange);
    store.subscribe(listener);
    store.setState(prev => ({
      ...prev,
      ui: { ...prev.ui, expandedView: 'teammates' }
    }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
