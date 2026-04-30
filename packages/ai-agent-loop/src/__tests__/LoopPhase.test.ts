/** composePhases 阶段链测试 — 组合与短路 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { composePhases } from '../phase/LoopPhase';
import type { LoopPhase } from '../phase/LoopPhase';
import type { AgentEvent } from '../types/events';
import type { MutableAgentContext } from '../context/AgentContext';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';

/** 辅助：创建测试上下文 */
function createTestCtx(): MutableAgentContext {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  const state: AgentState = {
    sessionId: 'test',
    turnCount: 0,
    messages: [],
    toolUseContext: createAgentToolUseContext('test', 0, registry, abortController),
    transition: { type: 'next_turn' }
  };
  return createMutableAgentContext(state);
}

/** 辅助：消费所有事件 */
async function consumeAll(gen: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

describe('composePhases', () => {
  it('空阶段列表不产出任何事件', async () => {
    const composed = composePhases([]);
    const events = await consumeAll(composed(createTestCtx()));
    expect(events).toEqual([]);
  });

  it('单阶段正确执行并产出事件', async () => {
    const phase: LoopPhase = {
      async *execute(_ctx, _next) {
        yield { type: 'text_delta', delta: 'hello' };
        yield* _next();
      }
    };

    const composed = composePhases([phase]);
    const events = await consumeAll(composed(createTestCtx()));
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 'hello' });
  });

  it('多阶段按顺序执行，yield* 正确传递', async () => {
    const phase1: LoopPhase = {
      async *execute(_ctx, next) {
        yield { type: 'turn_start', turnCount: 0 };
        yield* next();
        yield { type: 'turn_end', turnCount: 0 };
      }
    };
    const phase2: LoopPhase = {
      async *execute(_ctx, next) {
        yield { type: 'text_delta', delta: 'a' };
        yield* next();
      }
    };

    const composed = composePhases([phase1, phase2]);
    const events = await consumeAll(composed(createTestCtx()));
    // 顺序：turn_start → text_delta → turn_end
    expect(events.map(e => e.type)).toEqual(['turn_start', 'text_delta', 'turn_end']);
  });

  it('上下文有错误时跳过后续阶段', async () => {
    const phase1: LoopPhase = {
      async *execute(ctx, _next) {
        ctx.setError(new Error('fail'));
        yield { type: 'text_delta', delta: 'before-error' };
        // 不调用 next，直接 return
      }
    };
    const phase2: LoopPhase = {
      async *execute(_ctx, _next) {
        yield { type: 'text_delta', delta: 'should-not-appear' };
        yield* _next();
      }
    };

    const composed = composePhases([phase1, phase2]);
    const events = await consumeAll(composed(createTestCtx()));
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 'before-error' });
  });

  it('阶段修改 meta 后后续阶段可见', async () => {
    const phase1: LoopPhase = {
      async *execute(ctx, next) {
        ctx.meta.step1 = true;
        yield* next();
      }
    };
    const phase2: LoopPhase = {
      async *execute(ctx, next) {
        // 验证 phase1 的 meta 修改可见
        if (ctx.meta.step1) {
          yield { type: 'text_delta', delta: 'visible' };
        }
        yield* next();
      }
    };

    const composed = composePhases([phase1, phase2]);
    const events = await consumeAll(composed(createTestCtx()));
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 'visible' });
  });
});
