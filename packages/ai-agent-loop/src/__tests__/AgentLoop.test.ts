/** AgentLoop 核心集成测试 — 全流程 AsyncGenerator 循环 */

import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry, buildTool } from '@suga/ai-tool-core';
import { StreamingToolScheduler } from '@suga/ai-stream-executor';
import { AgentLoop } from '../loop/AgentLoop';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentEvent } from '../types/events';
import type { LoopResult } from '../types/result';
import type { ToolUseBlock, UserMessage } from '../types/messages';
import type { AgentState } from '../types/state';
import { MockToolScheduler } from './mocks/MockToolScheduler';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 辅助：创建用户消息 */
function createUserMessage(content: string): UserMessage {
  return { id: `user_1`, role: 'user', content, timestamp: Date.now() };
}

/** 辅助：消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

/** 辅助：获取 loop_end 结果 */
function getLoopEnd(events: AgentEvent[]): LoopResult | undefined {
  const loopEndEvent = events.find(e => e.type === 'loop_end');
  if (loopEndEvent && loopEndEvent.type === 'loop_end') {
    return loopEndEvent.result;
  }
  return undefined;
}

describe('AgentLoop', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  describe('简单问答（无工具调用）', () => {
    it('LLM 直接返回文本 → completed', async () => {
      provider.addSimpleTextResponse('hello');

      const loop = new AgentLoop({ provider, maxTurns: 5 });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));

      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect(result!.type).toBe('completed');

      // 应有 turn_start + text_delta + turn_end + loop_end
      expect(events.some(e => e.type === 'turn_start')).toBe(true);
      expect(events.some(e => e.type === 'turn_end')).toBe(true);
      expect(events.some(e => e.type === 'text_delta')).toBe(true);
      expect(events.some(e => e.type === 'loop_end')).toBe(true);
    });

    it('应流式产出文本增量', async () => {
      provider.addSimpleTextResponse('abc');

      const loop = new AgentLoop({ provider });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));

      const deltas = events
        .filter(e => e.type === 'text_delta')
        .map(e => (e as { type: 'text_delta'; delta: string }).delta);

      expect(deltas).toEqual(['a', 'b', 'c']);
    });
  });

  describe('单轮工具调用（完整流程）', () => {
    it('LLM 调用工具 → 工具结果 → 下一轮 LLM 回复 → completed', async () => {
      const toolUse: ToolUseBlock = {
        id: 'call_1',
        name: 'calc',
        input: { a: 1, b: 2 }
      };

      // 第一轮：LLM 调用工具
      provider.addToolUseResponse('计算中', [toolUse]);

      // 第二轮：LLM 回复结果（不再调用工具）
      provider.addSimpleTextResponse('1+2=3');

      const calcTool = buildTool({
        name: 'calc',
        inputSchema: z.object({ a: z.number(), b: z.number() }),
        call: async args => ({ data: args.a + args.b }),
        description: async input => `加法: ${input.a}+${input.b}`
      });

      const registry = new ToolRegistry();
      registry.register(calcTool);

      const loop = new AgentLoop({ provider, maxTurns: 5, toolRegistry: registry });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('计算1+2')]));

      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect(result!.type).toBe('completed');

      // 事件流应包含：2个 turn_start, tool_use_start, tool_result, 2个 turn_end
      expect(events.filter(e => e.type === 'turn_start')).toHaveLength(2);
      expect(events.filter(e => e.type === 'turn_end')).toHaveLength(2);
      expect(events.some(e => e.type === 'tool_use_start')).toBe(true);
      expect(events.some(e => e.type === 'tool_result')).toBe(true);

      // 工具结果应该是成功的
      const toolResultEvent = events.find(e => e.type === 'tool_result');
      if (toolResultEvent && toolResultEvent.type === 'tool_result') {
        expect(toolResultEvent.result.isSuccess).toBe(true);
        expect(toolResultEvent.result.toolUseId).toBe('call_1');
      }
    });
  });

  describe('maxTurns 限制', () => {
    it('达到最大轮次 → max_turns 终止', async () => {
      const toolUse: ToolUseBlock = {
        id: 'call_loop',
        name: 'loop-tool',
        input: {}
      };

      // 第一轮：调用工具
      provider.addToolUseResponse('', [toolUse]);
      // 第二轮：继续调用工具（模拟无限调用）
      provider.addToolUseResponse('', [toolUse]);

      const registry = new ToolRegistry();
      registry.register(
        buildTool({
          name: 'loop-tool',
          inputSchema: z.object({}),
          call: async () => ({ data: 'looping' }),
          description: async () => 'loop'
        })
      );

      const scheduler = new MockToolScheduler();
      scheduler.setPresetResult('call_loop', {
        id: 'result_loop',
        role: 'tool_result',
        toolUseId: 'call_loop',
        toolName: 'loop-tool',
        result: 'looping',
        isSuccess: true,
        timestamp: Date.now()
      });

      const loop = new AgentLoop({
        provider,
        maxTurns: 1,
        toolRegistry: registry,
        scheduler
      });

      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('start')]));

      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect(result!.type).toBe('max_turns');
    });
  });

  describe('LLM 错误', () => {
    it('provider 抛出错误 → model_error 终止', async () => {
      provider.setShouldFail(true, new Error('API rate limit'));

      const loop = new AgentLoop({ provider });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));

      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect(result!.type).toBe('model_error');
    });
  });

  describe('外部中断', () => {
    it('signal.abort() → aborted 终止', async () => {
      provider.addSimpleTextResponse('hello');
      provider.setDelay(50); // 加延迟确保中途可中断

      const loop = new AgentLoop({ provider });
      const abortController = new AbortController();

      const gen = loop.queryLoop([createUserMessage('hi')], abortController.signal);

      // 消费第一个事件后触发中断
      const events: AgentEvent[] = [];
      for await (const event of gen) {
        events.push(event);
        if (events.length === 1) {
          abortController.abort();
        }
      }

      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect(result!.type).toBe('aborted');
    });
  });

  describe('无工具配置', () => {
    it('不带工具时跳过 ExecuteToolsPhase', async () => {
      provider.addSimpleTextResponse('no tools');

      const loop = new AgentLoop({ provider });
      const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));

      expect(events.some(e => e.type === 'tool_use_start')).toBe(false);
      expect(events.some(e => e.type === 'tool_result')).toBe(false);

      const result = getLoopEnd(events);
      expect(result!.type).toBe('completed');
    });
  });

  describe('resumeLoop — 从已有状态恢复', () => {
    it('应从已有 AgentState 继续循环', async () => {
      // 先用 queryLoop 跑一轮拿到中间状态
      provider.addSimpleTextResponse('first');

      const loop = new AgentLoop({ provider, maxTurns: 5 });
      const gen = loop.queryLoop([createUserMessage('hi')]);

      // 消费所有事件（不追踪中间状态）
      const eventsBeforePause: AgentEvent[] = [];
      for await (const event of gen) {
        eventsBeforePause.push(event);
        if (event.type === 'turn_end' && event.type === 'turn_end') {
          // 在 turn_end 后中断，模拟暂停
          // 这里无法直接拿到 state，需要手动构建
          break;
        }
      }

      // 手动构建一个恢复状态（模拟暂停后的状态）
      provider.addSimpleTextResponse('resumed reply');

      const registry = new ToolRegistry();
      const resumedState: AgentState = {
        sessionId: 'test_resume_session',
        turnCount: 1,
        messages: [
          { id: 'u1', role: 'user', content: 'hi', timestamp: Date.now() },
          { id: 'a1', role: 'assistant', content: 'first', timestamp: Date.now(), toolUses: [] }
        ],
        toolUseContext: createAgentToolUseContext(
          'test_resume_session',
          1,
          registry,
          new AbortController()
        ),
        transition: { type: 'next_turn' }
      };

      const resumeGen = loop.resumeLoop(resumedState);
      const resumedEvents = await consumeAllEvents(resumeGen);

      const result = getLoopEnd(resumedEvents);
      expect(result).toBeDefined();
      expect(result!.type).toBe('completed');
      expect(resumedEvents.some(e => e.type === 'text_delta')).toBe(true);
    });

    it('resumeLoop + 外部 signal → aborted', async () => {
      provider.addSimpleTextResponse('resuming...');
      provider.setDelay(50);

      const registry = new ToolRegistry();
      const resumedState: AgentState = {
        sessionId: 'test_abort_resume',
        turnCount: 0,
        messages: [{ id: 'u1', role: 'user', content: 'resume test', timestamp: Date.now() }],
        toolUseContext: createAgentToolUseContext(
          'test_abort_resume',
          0,
          registry,
          new AbortController()
        ),
        transition: { type: 'next_turn' }
      };

      const loop = new AgentLoop({ provider });
      const abortController = new AbortController();

      const gen = loop.resumeLoop(resumedState, abortController.signal);
      const events: AgentEvent[] = [];
      for await (const event of gen) {
        events.push(event);
        if (events.length === 1) {
          abortController.abort();
        }
      }

      const result = getLoopEnd(events);
      expect(result).toBeDefined();
      expect(result!.type).toBe('aborted');
    });
  });
});

describe('AgentLoop P42 — 流式模式路由', () => {
  let p42Provider: MockLLMProvider;

  beforeEach(() => {
    p42Provider = new MockLLMProvider();
  });

  it('scheduler=StreamingToolScheduler → 流式模式完整流程', async () => {
    const toolUse: ToolUseBlock = {
      id: 'call_stream_1',
      name: 'calc',
      input: { a: 1, b: 2 }
    };

    // 第一轮：LLM 调用工具
    p42Provider.addToolUseResponse('计算中', [toolUse]);
    // 第二轮：LLM 回复结果
    p42Provider.addSimpleTextResponse('1+2=3');

    const calcTool = buildTool({
      name: 'calc',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      call: async args => ({ data: args.a + args.b }),
      description: async input => `加法: ${input.a}+${input.b}`
    });

    const registry = new ToolRegistry();
    registry.register(calcTool);

    const scheduler = new StreamingToolScheduler();

    const loop = new AgentLoop({
      provider: p42Provider,
      maxTurns: 5,
      toolRegistry: registry,
      scheduler
    });
    const events = await consumeAllEvents(loop.queryLoop([createUserMessage('计算1+2')]));

    const result = getLoopEnd(events);
    expect(result).toBeDefined();
    expect(result!.type).toBe('completed');

    // 事件流应包含 tool_use_start + tool_result
    expect(events.some(e => e.type === 'tool_use_start')).toBe(true);
    expect(events.some(e => e.type === 'tool_result')).toBe(true);
  });

  it('scheduler=MockToolScheduler(batch) → batch模式不变', async () => {
    const toolUse: ToolUseBlock = {
      id: 'call_batch_1',
      name: 'calc',
      input: { a: 1, b: 2 }
    };

    p42Provider.addToolUseResponse('', [toolUse]);
    p42Provider.addSimpleTextResponse('done');

    const registry = new ToolRegistry();
    registry.register(
      buildTool({
        name: 'calc',
        inputSchema: z.object({ a: z.number(), b: z.number() }),
        call: async args => ({ data: args.a + args.b }),
        description: async input => `加法: ${input.a}+${input.b}`
      })
    );

    const scheduler = new MockToolScheduler();
    scheduler.setPresetResult('call_batch_1', {
      id: 'result_batch',
      role: 'tool_result',
      toolUseId: 'call_batch_1',
      toolName: 'calc',
      result: 3,
      isSuccess: true,
      timestamp: Date.now()
    });

    const loop = new AgentLoop({
      provider: p42Provider,
      maxTurns: 5,
      toolRegistry: registry,
      scheduler
    });
    const events = await consumeAllEvents(loop.queryLoop([createUserMessage('计算')]));

    const result = getLoopEnd(events);
    expect(result).toBeDefined();
    expect(result!.type).toBe('completed');
  });

  it('scheduler=undefined → 默认流式模式', async () => {
    const toolUse: ToolUseBlock = {
      id: 'call_default_1',
      name: 'calc',
      input: { a: 1 }
    };

    p42Provider.addToolUseResponse('', [toolUse]);
    p42Provider.addSimpleTextResponse('result');

    const registry = new ToolRegistry();
    registry.register(
      buildTool({
        name: 'calc',
        inputSchema: z.object({ a: z.number() }),
        call: async args => ({ data: args.a }),
        description: async () => 'calc'
      })
    );

    // 不传 scheduler → 默认 StreamingToolScheduler → 流式模式
    const loop = new AgentLoop({ provider: p42Provider, maxTurns: 5, toolRegistry: registry });
    const events = await consumeAllEvents(loop.queryLoop([createUserMessage('计算')]));

    const result = getLoopEnd(events);
    expect(result).toBeDefined();
    expect(result!.type).toBe('completed');
  });
});
