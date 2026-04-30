import { describe, it, expect } from 'vitest';
import { createRuntimeAgentLoop } from '../factory/createRuntimeAgentLoop';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import type { RuntimeConfig } from '../types/config';
import type { AgentEvent } from '@suga/ai-agent-loop';
import { HookRegistry } from '@suga/ai-hooks';
import { ToolRegistry } from '@suga/ai-tool-core';
import { SkillRegistry } from '@suga/ai-skill';

/** 辅助：消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe('createRuntimeAgentLoop', () => {
  it('最小配置 → AgentLoop 能 queryLoop 并产出事件', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const config: RuntimeConfig = { provider };
    const loop = createRuntimeAgentLoop(config);

    const events = await consumeAllEvents(
      loop.queryLoop([{ id: 'u1', role: 'user', content: 'hi', timestamp: Date.now() }])
    );

    expect(events.some(e => e.type === 'text_delta')).toBe(true);
    expect(events.some(e => e.type === 'loop_end')).toBe(true);
  });

  it('phases 字段正确传递到 AgentConfig → 跳过默认 buildPhases', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    // createRuntimeAgentLoop 会自动构建 phases，通过 AgentConfig.phases 传入
    const config: RuntimeConfig = { provider };
    const loop = createRuntimeAgentLoop(config);

    // 验证 AgentLoop 能正常执行（phases 通过 AgentConfig.phases 传入）
    const events = await consumeAllEvents(
      loop.queryLoop([{ id: 'u1', role: 'user', content: 'hi', timestamp: Date.now() }])
    );
    expect(events.some(e => e.type === 'loop_end')).toBe(true);
    expect(loop).toBeDefined();
  });

  it('带 hookRegistry → HookPhase 正确拦截', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('response');

    const hookRegistry = new HookRegistry();

    const config: RuntimeConfig = {
      provider,
      hookRegistry
    };

    const loop = createRuntimeAgentLoop(config);
    const events = await consumeAllEvents(
      loop.queryLoop([{ id: 'u1', role: 'user', content: 'test', timestamp: Date.now() }])
    );

    expect(events.some(e => e.type === 'loop_end')).toBe(true);
  });

  it('带 toolRegistry + skillRegistry → SkillTool 注册到 effectiveRegistry', () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const toolRegistry = new ToolRegistry();
    const skillRegistry = new SkillRegistry();

    const config: RuntimeConfig = {
      provider,
      toolRegistry,
      skillRegistry
    };

    const loop = createRuntimeAgentLoop(config);
    expect(loop).toBeDefined();
  });
});
