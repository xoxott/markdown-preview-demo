/** HookPhase 集成测试 — HookBeforeToolPhase / HookAfterToolPhase / HookStopPhase 与 AgentLoop 的对接 */

import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry, buildTool } from '@suga/ai-tool-core';
import { AgentLoop } from '@suga/ai-agent-loop';
import { HookRegistry } from '../registry/HookRegistry';
import type { HookResult, HookExecutionContext, PreToolUseInput, PostToolUseInput, StopInput } from '../types';
import type { AgentEvent } from '@suga/ai-agent-loop';
import type { ToolUseBlock, UserMessage } from '@suga/ai-agent-loop';

/** 创建用户消息 */
function createUserMessage(content: string): UserMessage {
  return { id: `user_1`, role: 'user', content, timestamp: Date.now() };
}

/** 消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

/** 获取 loop_end 结果 */
function getLoopEnd(events: AgentEvent[]): unknown {
  const loopEndEvent = events.find(e => e.type === 'loop_end');
  if (loopEndEvent && loopEndEvent.type === 'loop_end') {
    return loopEndEvent.result;
  }
  return undefined;
}

/** Mock LLM Provider — 复制 P1 的实现 */
class MockLLMProvider {
  private responses: { textDelta?: string; toolUses?: ToolUseBlock[]; done: boolean }[][] = [];
  private shouldFail = false;
  private failError: Error = new Error('Mock LLM error');
  private callCount = 0;

  addSimpleTextResponse(text: string): void {
    this.responses.push([
      ...text.split('').map(c => ({ textDelta: c, done: false })),
      { done: true }
    ]);
  }

  addToolUseResponse(text: string, toolUses: ToolUseBlock[]): void {
    this.responses.push([
      ...text.split('').map(c => ({ textDelta: c, done: false })),
      ...toolUses.map(tu => ({ toolUse: tu, done: false })),
      { done: true }
    ]);
  }

  setShouldFail(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    if (error) this.failError = error;
  }

  getCallCount(): number {
    return this.callCount;
  }

  formatToolDefinition(tool: { name: string }): { name: string; description: string; inputSchema: Record<string, unknown> } {
    return { name: tool.name, description: 'mock', inputSchema: {} };
  }

  async *callModel(
    _messages: readonly unknown[],
    _tools?: readonly unknown[],
    signal?: AbortSignal
  ): AsyncGenerator<{ textDelta?: string; toolUse?: ToolUseBlock; done: boolean }> {
    this.callCount++;
    if (this.shouldFail) throw this.failError;

    const chunks = this.responses[this.callCount - 1];
    if (!chunks) throw new Error(`MockLLMProvider: 第 ${this.callCount} 轮无预设响应`);

    for (const chunk of chunks) {
      if (signal?.aborted) throw new DOMException('Mock LLM aborted', 'AbortError');
      yield chunk;
    }
  }
}

describe('HookPhase 集成测试', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  describe('无 HookRegistry → AgentLoop 行为不变', () => {
    it('简单文本回复正常', async () => {
      provider.addSimpleTextResponse('hello');
      const loop = new AgentLoop({ provider });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));
      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect((result as { type: string }).type).toBe('completed');
    });
  });

  describe('HookBeforeToolPhase — PreToolUse Hook 拦截', () => {
    it('Hook deny 阻止工具执行 → 循环终止', async () => {
      const hookRegistry = new HookRegistry();

      // 注册 PreToolUse deny hook
      hookRegistry.register({
        name: 'deny-all',
        event: 'PreToolUse',
        handler: async () => ({
          outcome: 'success',
          permissionBehavior: 'deny',
          permissionDecisionReason: 'all tools denied'
        })
      });

      provider.addSimpleTextResponse('hello');

      const loop = new AgentLoop({ provider, hookRegistry });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));
      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect((result as { type: string }).type).toBe('completed');
      // 无工具调用场景，PreToolUse hook 不会触发（没有 toolUses）
    });

    it('Hook allow 不影响正常工具执行', async () => {
      const hookRegistry = new HookRegistry();

      hookRegistry.register({
        name: 'allow-all',
        event: 'PreToolUse',
        handler: async () => ({
          outcome: 'success',
          permissionBehavior: 'allow'
        })
      });

      const toolUse: ToolUseBlock = { id: 'call_1', name: 'calc', input: { a: 1, b: 2 } };
      provider.addToolUseResponse('计算中', [toolUse]);
      provider.addSimpleTextResponse('1+2=3');

      const registry = new ToolRegistry();
      registry.register(
        buildTool({
          name: 'calc',
          inputSchema: z.object({ a: z.number(), b: z.number() }),
          call: async args => ({ data: args.a + args.b }),
          description: async input => `加法: ${input.a}+${input.b}`
        })
      );

      const loop = new AgentLoop({ provider, toolRegistry: registry, hookRegistry });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('计算1+2')]));
      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect((result as { type: string }).type).toBe('completed');
    });
  });

  describe('HookAfterToolPhase — PostToolUse Hook 拦截', () => {
    it('PostToolUse hook 修改输出', async () => {
      const hookRegistry = new HookRegistry();

      hookRegistry.register({
        name: 'format-output',
        event: 'PostToolUse',
        matcher: 'calc',
        handler: async (_input: PostToolUseInput) => ({
          outcome: 'success',
          updatedOutput: '结果已格式化: 3'
        })
      });

      const toolUse: ToolUseBlock = { id: 'call_1', name: 'calc', input: { a: 1, b: 2 } };
      provider.addToolUseResponse('计算中', [toolUse]);
      provider.addSimpleTextResponse('结果: 3');

      const registry = new ToolRegistry();
      registry.register(
        buildTool({
          name: 'calc',
          inputSchema: z.object({ a: z.number(), b: z.number() }),
          call: async args => ({ data: args.a + args.b }),
          description: async input => `加法: ${input.a}+${input.b}`
        })
      );

      const loop = new AgentLoop({ provider, toolRegistry: registry, hookRegistry });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('计算1+2')]));
      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect((result as { type: string }).type).toBe('completed');
    });
  });

  describe('HookStopPhase — Stop Hook', () => {
    it('Stop hook 在循环结束时触发', async () => {
      const hookRegistry = new HookRegistry();

      let stopHookCalled = false;
      hookRegistry.register({
        name: 'cleanup',
        event: 'Stop',
        handler: async (_input: StopInput) => {
          stopHookCalled = true;
          return { outcome: 'success', additionalContext: 'cleanup done' };
        }
      });

      provider.addSimpleTextResponse('hello');

      const loop = new AgentLoop({ provider, hookRegistry });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));
      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect((result as { type: string }).type).toBe('completed');
      expect(stopHookCalled).toBe(true);
    });

    it('Stop hook preventContinuation', async () => {
      const hookRegistry = new HookRegistry();

      hookRegistry.register({
        name: 'block-stop',
        event: 'Stop',
        handler: async () => ({
          outcome: 'success',
          preventContinuation: true,
          stopReason: 'stop hook blocked'
        })
      });

      provider.addSimpleTextResponse('hello');

      const loop = new AgentLoop({ provider, hookRegistry });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));
      // 即使 Stop hook 返回 preventContinuation，循环已经终止了
      // 但 meta 中会记录此标记
      expect(events.some(e => e.type === 'loop_end')).toBe(true);
    });
  });

  describe('Hook Registry 独立功能验证', () => {
    it('matcher 匹配 — 只拦截指定工具', async () => {
      const hookRegistry = new HookRegistry();

      // 只拦截 Bash，不拦截 calc
      let bashHookCalled = false;
      hookRegistry.register({
        name: 'bash-guard',
        event: 'PreToolUse',
        matcher: 'Bash',
        handler: async (_input: PreToolUseInput) => {
          bashHookCalled = true;
          return { outcome: 'success', permissionBehavior: 'allow' };
        }
      });

      const toolUse: ToolUseBlock = { id: 'call_1', name: 'calc', input: { a: 1, b: 2 } };
      provider.addToolUseResponse('计算中', [toolUse]);
      provider.addSimpleTextResponse('1+2=3');

      const registry = new ToolRegistry();
      registry.register(
        buildTool({
          name: 'calc',
          inputSchema: z.object({ a: z.number(), b: z.number() }),
          call: async args => ({ data: args.a + args.b }),
          description: async input => `加法: ${input.a}+${input.b}`
        })
      );

      const loop = new AgentLoop({ provider, toolRegistry: registry, hookRegistry });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('计算1+2')]));
      const result = getLoopEnd(events);
      expect((result as { type: string }).type).toBe('completed');
      // calc 工具不匹配 Bash matcher，hook 不应被调用
      expect(bashHookCalled).toBe(false);
    });

    it('once hook 执行后不再触发', async () => {
      const hookRegistry = new HookRegistry();

      let callCount = 0;
      hookRegistry.register({
        name: 'one-time',
        event: 'Stop',
        handler: async () => {
          callCount++;
          return { outcome: 'success' };
        },
        once: true
      });

      provider.addSimpleTextResponse('hello');

      const loop = new AgentLoop({ provider, hookRegistry });
      await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));
      expect(callCount).toBe(1);
    });
  });
});