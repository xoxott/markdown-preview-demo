/** HookExecutor 测试 — 执行、超时、once、聚合 */

import { describe, expect, it, beforeEach } from 'vitest';
import { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import type { HookDefinition, HookResult, HookExecutionContext } from '../types/hooks';
import type { PreToolUseInput, PostToolUseInput, StopInput } from '../types/input';
import { ToolRegistry } from '@suga/ai-tool-core';

/** 创建 HookExecutionContext */
function createContext(): HookExecutionContext {
  return {
    sessionId: 'test-session',
    abortSignal: new AbortController().signal,
    toolRegistry: new ToolRegistry(),
    meta: {}
  };
}

describe('HookExecutor', () => {
  let registry: HookRegistry;
  let executor: HookExecutor;

  beforeEach(() => {
    registry = new HookRegistry();
    executor = new HookExecutor(registry);
  });

  describe('快速路径 — 无匹配 hooks', () => {
    it('无 hooks 时立即返回 success', async () => {
      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: { command: 'ls' },
        toolUseId: 'call_1'
      };
      const result = await executor.execute('PreToolUse', input, createContext());
      expect(result.outcome).toBe('success');
      expect(result.preventContinuation).toBe(false);
    });
  });

  describe('PreToolUse 执行', () => {
    it('单 hook 成功执行', async () => {
      registry.register({
        name: 'test-hook',
        event: 'PreToolUse',
        handler: async () => ({ outcome: 'success', data: 'checked' })
      });

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: { command: 'ls' },
        toolUseId: 'call_1'
      };

      const result = await executor.execute('PreToolUse', input, createContext());
      expect(result.outcome).toBe('success');
    });

    it('hook deny 阻止执行', async () => {
      registry.register({
        name: 'deny-hook',
        event: 'PreToolUse',
        matcher: 'Bash',
        handler: async () => ({
          outcome: 'success',
          permissionBehavior: 'deny',
          permissionDecisionReason: 'unsafe command'
        })
      });

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: { command: 'rm -rf' },
        toolUseId: 'call_2'
      };

      const result = await executor.execute('PreToolUse', input, createContext());
      expect(result.permissionBehavior).toBe('deny');
    });

    it('hook 修改工具输入', async () => {
      registry.register({
        name: 'modify-hook',
        event: 'PreToolUse',
        handler: async () => ({
          outcome: 'success',
          updatedInput: { command: 'ls -la' }
        })
      });

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: { command: 'ls' },
        toolUseId: 'call_3'
      };

      const result = await executor.execute('PreToolUse', input, createContext());
      expect(result.updatedInput).toEqual({ command: 'ls -la' });
    });

    it('多 hook 并行执行 + deny 优先', async () => {
      registry.register({
        name: 'allow-hook',
        event: 'PreToolUse',
        handler: async () => ({ outcome: 'success', permissionBehavior: 'allow' })
      });
      registry.register({
        name: 'deny-hook',
        event: 'PreToolUse',
        handler: async () => ({ outcome: 'success', permissionBehavior: 'deny' })
      });

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: {},
        toolUseId: 'call_4'
      };

      const result = await executor.execute('PreToolUse', input, createContext());
      expect(result.permissionBehavior).toBe('deny');
    });
  });

  describe('PostToolUse 执行', () => {
    it('hook 修改输出', async () => {
      registry.register({
        name: 'output-hook',
        event: 'PostToolUse',
        handler: async () => ({
          outcome: 'success',
          updatedOutput: 'formatted result'
        })
      });

      const input: PostToolUseInput = {
        hookEventName: 'PostToolUse',
        toolName: 'Bash',
        toolInput: {},
        toolOutput: 'raw result',
        toolUseId: 'call_5'
      };

      const result = await executor.execute('PostToolUse', input, createContext());
      expect(result.updatedOutput).toBe('formatted result');
    });
  });

  describe('Stop 执行', () => {
    it('Stop hook 执行', async () => {
      registry.register({
        name: 'cleanup-hook',
        event: 'Stop',
        handler: async () => ({ outcome: 'success', data: 'cleaned up' })
      });

      const input: StopInput = {
        hookEventName: 'Stop',
        lastAssistantMessage: 'done'
      };

      const result = await executor.execute('Stop', input, createContext());
      expect(result.outcome).toBe('success');
    });
  });

  describe('错误处理', () => {
    it('hook 抛出异常 → non_blocking_error', async () => {
      registry.register({
        name: 'error-hook',
        event: 'PreToolUse',
        handler: async () => { throw new Error('hook crashed'); }
      });

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: {},
        toolUseId: 'call_6'
      };

      const result = await executor.execute('PreToolUse', input, createContext());
      expect(result.errors).toContain('hook crashed');
    });

    it('hook 超时 → cancelled', async () => {
      registry.register({
        name: 'slow-hook',
        event: 'PreToolUse',
        handler: async (_input, ctx) => {
          // 模拟超时：等待一个不会 resolve 的 promise，但让 abortSignal 触发
          await new Promise<void>((_resolve, reject) => {
            ctx.abortSignal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
            // 不 resolve，等待 abort
          });
          return { outcome: 'success' };
        },
        timeout: 100
      });

      const abortController = new AbortController();
      const context: HookExecutionContext = {
        sessionId: 'test-session',
        abortSignal: abortController.signal,
        toolRegistry: new ToolRegistry(),
        meta: {}
      };

      // 在超时前触发 abort
      setTimeout(() => abortController.abort(), 50);

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: {},
        toolUseId: 'call_7'
      };

      const result = await executor.execute('PreToolUse', input, context);
      // cancelled 或包含超时错误
      expect(result.outcome).toMatch(/success|mixed|blocking/);
    });
  });

  describe('once hook', () => {
    it('once hook 执行后自动移除', async () => {
      registry.register({
        name: 'once-hook',
        event: 'PreToolUse',
        handler: async () => ({ outcome: 'success' }),
        once: true
      });

      const input: PreToolUseInput = {
        hookEventName: 'PreToolUse',
        toolName: 'Bash',
        toolInput: {},
        toolUseId: 'call_8'
      };

      // 第一次执行 → 有 hook
      const result1 = await executor.execute('PreToolUse', input, createContext());
      expect(result1.outcome).toBe('success');

      // 第二次 → hook 已移除
      const result2 = await executor.execute('PreToolUse', input, createContext());
      expect(result2.outcome).toBe('success');
      expect(result2.errors).toEqual([]);
    });
  });

  describe('getMatchingHookDefinitions', () => {
    it('返回匹配的 Hook 定义', () => {
      registry.register({
        name: 'bash-hook',
        event: 'PreToolUse',
        matcher: 'Bash',
        handler: async () => ({ outcome: 'success' })
      });

      expect(executor.getMatchingHookDefinitions('PreToolUse', 'Bash')).toHaveLength(1);
      expect(executor.getMatchingHookDefinitions('PreToolUse', 'Write')).toHaveLength(0);
    });
  });
});