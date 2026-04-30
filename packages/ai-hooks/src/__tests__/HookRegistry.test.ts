/** HookRegistry 测试 — 注册、匹配、移除、once 机制 */

import { describe, expect, it } from 'vitest';
import { HookRegistry } from '../registry/HookRegistry';
import type { HookDefinition, HookResult } from '../types/hooks';

/** 创建简单 hook handler */
function createHandler(
  name: string,
  outcome: HookResult['outcome'] = 'success'
): HookDefinition['handler'] {
  return async () => ({ outcome, data: name });
}

describe('HookRegistry', () => {
  describe('register', () => {
    it('注册合法 Hook', () => {
      const registry = new HookRegistry();
      const hook: HookDefinition = {
        name: 'my-hook',
        event: 'PreToolUse',
        handler: createHandler('my-hook')
      };
      registry.register(hook);
      expect(registry.getAllHooks('PreToolUse')).toHaveLength(1);
    });

    it('拒绝非法名称', () => {
      const registry = new HookRegistry();
      expect(() =>
        registry.register({
          name: '123-bad',
          event: 'PreToolUse',
          handler: createHandler('bad')
        })
      ).toThrow('不合法');
    });

    it('拒绝重复名称', () => {
      const registry = new HookRegistry();
      registry.register({ name: 'dup', event: 'PreToolUse', handler: createHandler('dup') });
      expect(() =>
        registry.register({ name: 'dup', event: 'PreToolUse', handler: createHandler('dup2') })
      ).toThrow('已存在');
    });

    it('不同事件可有相同名称', () => {
      const registry = new HookRegistry();
      registry.register({ name: 'same', event: 'PreToolUse', handler: createHandler('same') });
      registry.register({ name: 'same', event: 'PostToolUse', handler: createHandler('same2') });
      expect(registry.getAllHooks('PreToolUse')).toHaveLength(1);
      expect(registry.getAllHooks('PostToolUse')).toHaveLength(1);
    });
  });

  describe('getMatchingHooks', () => {
    it('无 matcher 匹配所有', () => {
      const registry = new HookRegistry();
      registry.register({ name: 'all', event: 'PreToolUse', handler: createHandler('all') });
      expect(registry.getMatchingHooks('PreToolUse', 'Bash')).toHaveLength(1);
      expect(registry.getMatchingHooks('PreToolUse', 'Write')).toHaveLength(1);
    });

    it('有 matcher 精确匹配', () => {
      const registry = new HookRegistry();
      registry.register({
        name: 'bash-hook',
        event: 'PreToolUse',
        matcher: 'Bash',
        handler: createHandler('bash')
      });
      registry.register({
        name: 'write-hook',
        event: 'PreToolUse',
        matcher: 'Write',
        handler: createHandler('write')
      });
      expect(registry.getMatchingHooks('PreToolUse', 'Bash')).toHaveLength(1);
      expect(registry.getMatchingHooks('PreToolUse', 'Bash')[0].name).toBe('bash-hook');
    });

    it('glob 模式匹配', () => {
      const registry = new HookRegistry();
      registry.register({
        name: 'bash-glob',
        event: 'PreToolUse',
        matcher: 'Bash*',
        handler: createHandler('bash-glob')
      });
      expect(registry.getMatchingHooks('PreToolUse', 'BashTool')).toHaveLength(1);
      expect(registry.getMatchingHooks('PreToolUse', 'Write')).toHaveLength(0);
    });

    it('不匹配时返回空数组', () => {
      const registry = new HookRegistry();
      registry.register({
        name: 'bash-only',
        event: 'PreToolUse',
        matcher: 'Bash',
        handler: createHandler('bash')
      });
      expect(registry.getMatchingHooks('PreToolUse', 'Write')).toHaveLength(0);
    });

    it('无 matchQuery 返回全部', () => {
      const registry = new HookRegistry();
      registry.register({
        name: 'h1',
        event: 'PreToolUse',
        matcher: 'Bash',
        handler: createHandler('1')
      });
      registry.register({
        name: 'h2',
        event: 'PreToolUse',
        matcher: 'Write',
        handler: createHandler('2')
      });
      registry.register({ name: 'h3', event: 'PreToolUse', handler: createHandler('3') });
      expect(registry.getMatchingHooks('PreToolUse')).toHaveLength(3);
    });
  });

  describe('once hooks', () => {
    it('once hook 执行后自动移除', () => {
      const registry = new HookRegistry();
      registry.register({
        name: 'once-hook',
        event: 'PreToolUse',
        handler: createHandler('once'),
        once: true
      });
      expect(registry.getMatchingHooks('PreToolUse')).toHaveLength(1);
      registry.markOnceHookExecuted('once-hook');
      expect(registry.getMatchingHooks('PreToolUse')).toHaveLength(0);
    });
  });

  describe('remove', () => {
    it('移除指定名称的 Hook', () => {
      const registry = new HookRegistry();
      registry.register({ name: 'removable', event: 'PreToolUse', handler: createHandler('rem') });
      registry.remove('removable');
      expect(registry.getAllHooks('PreToolUse')).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('清除所有 Hook', () => {
      const registry = new HookRegistry();
      registry.register({ name: 'h1', event: 'PreToolUse', handler: createHandler('1') });
      registry.register({ name: 'h2', event: 'PostToolUse', handler: createHandler('2') });
      registry.clear();
      expect(registry.getAllHooks('PreToolUse')).toHaveLength(0);
      expect(registry.getAllHooks('PostToolUse')).toHaveLength(0);
    });
  });
});
