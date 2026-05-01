/** PromptRunner 测试 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { PromptRunner } from '../runner/PromptRunner';
import type { LLMQueryResult, LLMQueryService } from '../types/llmQuery';
import type { HookDefinition, HookExecutionContext } from '../types/hooks';

/** MockLLMQueryService — 预设 LLM 查询响应 */
class MockLLMQueryService implements LLMQueryService {
  private singleResult: LLMQueryResult = { text: '{"ok":true}', success: true };

  setSingleResult(result: LLMQueryResult): void {
    this.singleResult = result;
  }

  async querySingle(): Promise<LLMQueryResult> {
    return this.singleResult;
  }

  async queryMultiTurn(): Promise<any> {
    throw new Error('MockLLMQueryService.queryMultiTurn not implemented');
  }
}

/** 创建 HookExecutionContext */
function createContext(): HookExecutionContext {
  return {
    sessionId: 'test-session',
    abortSignal: new AbortController().signal,
    toolRegistry: new ToolRegistry(),
    meta: {}
  };
}

describe('PromptRunner', () => {
  describe('LLM 返回 ok=true', () => {
    it('应返回 success', async () => {
      const service = new MockLLMQueryService();
      service.setSingleResult({ text: '{"ok":true}', success: true });
      const runner = new PromptRunner(service);

      const hook: HookDefinition = {
        name: 'test-prompt',
        event: 'PreToolUse',
        type: 'prompt',
        prompt: 'Is this operation safe? $INPUT',
        matcher: 'Bash'
      };

      const result = await runner.run(
        hook,
        {
          hookEventName: 'PreToolUse',
          toolName: 'Bash',
          toolInput: { command: 'ls' },
          toolUseId: '1'
        } as any,
        createContext()
      );
      expect(result.outcome).toBe('success');
    });
  });

  describe('LLM 返回 ok=false', () => {
    it('应返回 blocking', async () => {
      const service = new MockLLMQueryService();
      service.setSingleResult({ text: '{"ok":false,"reason":"unsafe command"}', success: true });
      const runner = new PromptRunner(service);

      const hook: HookDefinition = {
        name: 'test-prompt-block',
        event: 'PreToolUse',
        type: 'prompt',
        prompt: 'Is this safe? $INPUT',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('blocking');
      expect(result.stopReason).toBe('unsafe command');
    });
  });

  describe('LLM 查询失败', () => {
    it('应返回 non_blocking_error', async () => {
      const service = new MockLLMQueryService();
      service.setSingleResult({ text: '', success: false, error: 'API timeout' });
      const runner = new PromptRunner(service);

      const hook: HookDefinition = {
        name: 'test-prompt-fail',
        event: 'PreToolUse',
        type: 'prompt',
        prompt: 'Check safety',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('non_blocking_error');
      expect(result.error).toContain('API timeout');
    });
  });

  describe('LLM 返回非 JSON', () => {
    it('应返回 non_blocking_error', async () => {
      const service = new MockLLMQueryService();
      service.setSingleResult({ text: 'This is just plain text', success: true });
      const runner = new PromptRunner(service);

      const hook: HookDefinition = {
        name: 'test-prompt-nojson',
        event: 'PreToolUse',
        type: 'prompt',
        prompt: 'Check',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('non_blocking_error');
    });
  });
});
