import { describe, expect, it } from 'vitest';
import { InMemorySessionHookStore } from '../registry/SessionHookStore';
import type { HookDefinition, HookEvent } from '../types/hooks';

/** 辅助：创建简单 HookDefinition */
function createHookDef(event: HookEvent, name: string): HookDefinition {
  return {
    name,
    event,
    handler: async () => ({ outcome: 'success' as const, preventContinuation: false })
  };
}

describe('InMemorySessionHookStore', () => {
  it('addSessionHook + getSessionHooks', () => {
    const store = new InMemorySessionHookStore();

    store.addSessionHook(createHookDef('Stop', 'notify_stop'));
    store.addSessionHook(createHookDef('PreToolUse', 'check_read'));

    const hooks = store.getSessionHooks();
    expect(hooks.length).toBe(2);
    expect(hooks.some(h => h.name === 'notify_stop')).toBe(true);
    expect(hooks.some(h => h.name === 'check_read')).toBe(true);
  });

  it('removeSessionHook', () => {
    const store = new InMemorySessionHookStore();

    store.addSessionHook(createHookDef('Stop', 'notify_stop'));
    store.addSessionHook(createHookDef('Stop', 'cleanup_stop'));
    store.removeSessionHook('notify_stop');

    const hooks = store.getSessionHooks();
    expect(hooks.length).toBe(1);
    expect(hooks[0].name).toBe('cleanup_stop');
  });

  it('addFunctionHook 返回 ID', () => {
    const store = new InMemorySessionHookStore();

    const id1 = store.addFunctionHook({
      event: 'PreToolUse',
      callback: async () => true,
      timeout: 5000
    });
    const id2 = store.addFunctionHook({
      event: 'Stop',
      callback: async () => false,
      errorMessage: 'blocked'
    });

    expect(id1).toMatch(/^fh_\d+$/);
    expect(id2).toMatch(/^fh_\d+$/);
    expect(id1).not.toBe(id2);
  });

  it('getSessionFunctionHooks', () => {
    const store = new InMemorySessionHookStore();

    const id = store.addFunctionHook({
      event: 'PreToolUse',
      matcher: 'Read',
      callback: async () => true
    });

    const hooks = store.getSessionFunctionHooks();
    expect(hooks.length).toBe(1);
    expect(hooks[0].id).toBe(id);
    expect(hooks[0].matcher).toBe('Read');
  });

  it('removeFunctionHook', () => {
    const store = new InMemorySessionHookStore();

    const id = store.addFunctionHook({
      event: 'Stop',
      callback: async () => true
    });
    store.removeFunctionHook(id);

    expect(store.getSessionFunctionHooks().length).toBe(0);
  });

  it('clearSessionHooks — 清除所有 session 和 function hooks', () => {
    const store = new InMemorySessionHookStore();

    store.addSessionHook(createHookDef('Stop', 'notify'));
    store.addFunctionHook({
      event: 'PreToolUse',
      callback: async () => true
    });

    store.clearSessionHooks();

    expect(store.getSessionHooks().length).toBe(0);
    expect(store.getSessionFunctionHooks().length).toBe(0);
  });
});
