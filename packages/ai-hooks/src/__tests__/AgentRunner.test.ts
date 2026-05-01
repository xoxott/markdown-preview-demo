/** AgentRunner 测试 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { AgentRunner } from '../runner/AgentRunner';
import type { LLMMultiTurnResult, LLMQueryResult, LLMQueryService } from '../types/llmQuery';
import type { HookDefinition, HookExecutionContext } from '../types/hooks';

/** MockLLMQueryService — 预设多轮查询响应 */
class MockLLMQueryService implements LLMQueryService {
  private multiTurnResult: LLMMultiTurnResult = {
    finalText: '{"ok":true}',
    totalTurns: 1,
    success: true
  };

  setMultiTurnResult(result: LLMMultiTurnResult): void {
    this.multiTurnResult = result;
  }

  async querySingle(): Promise<LLMQueryResult> {
    throw new Error('MockLLMQueryService.querySingle not implemented');
  }

  async queryMultiTurn(): Promise<LLMMultiTurnResult> {
    return this.multiTurnResult;
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

describe('AgentRunner', () => {
  describe('Agent 返回 ok=true', () => {
    it('应返回 success', async () => {
      const service = new MockLLMQueryService();
      service.setMultiTurnResult({
        finalText: 'The agent called structured_output with {"ok":true}',
        totalTurns: 2,
        success: true
      });
      const runner = new AgentRunner(service);

      const hook: HookDefinition = {
        name: 'test-agent',
        event: 'PreToolUse',
        type: 'agent',
        agentPrompt: 'Verify this Bash command is safe',
        matcher: 'Bash'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('success');
    });
  });

  describe('Agent 返回 ok=false', () => {
    it('应返回 blocking', async () => {
      const service = new MockLLMQueryService();
      service.setMultiTurnResult({
        finalText: '{"ok":false,"reason":"command deletes critical files"}',
        totalTurns: 3,
        success: true
      });
      const runner = new AgentRunner(service);

      const hook: HookDefinition = {
        name: 'test-agent-block',
        event: 'PreToolUse',
        type: 'agent',
        agentPrompt: 'Verify safety',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('blocking');
      expect(result.stopReason).toBe('command deletes critical files');
    });
  });

  describe('Agent 查询失败', () => {
    it('应返回 non_blocking_error', async () => {
      const service = new MockLLMQueryService();
      service.setMultiTurnResult({
        finalText: '',
        totalTurns: 0,
        success: false,
        error: 'Agent exceeded max turns'
      });
      const runner = new AgentRunner(service);

      const hook: HookDefinition = {
        name: 'test-agent-fail',
        event: 'PreToolUse',
        type: 'agent',
        agentPrompt: 'Verify',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('non_blocking_error');
    });
  });

  describe('Agent 无法解析输出', () => {
    it('应返回 non_blocking_error', async () => {
      const service = new MockLLMQueryService();
      service.setMultiTurnResult({
        finalText: 'I checked and it seems fine but no structured output',
        totalTurns: 10,
        success: true
      });
      const runner = new AgentRunner(service);

      const hook: HookDefinition = {
        name: 'test-agent-noparse',
        event: 'PreToolUse',
        type: 'agent',
        agentPrompt: 'Verify',
        matcher: '*'
      };

      const result = await runner.run(hook, {} as any, createContext());
      expect(result.outcome).toBe('non_blocking_error');
    });
  });
});
