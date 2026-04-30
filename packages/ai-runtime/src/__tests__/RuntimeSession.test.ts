import { describe, it, expect } from 'vitest';
import { RuntimeSession } from '../session/RuntimeSession';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import type { RuntimeConfig } from '../types/config';
import type { AgentEvent } from '@suga/ai-agent-loop';

/** 辅助：消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe('RuntimeSession', () => {
  it('sendMessage → 产出事件流 + Store 状态更新', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    const events = await consumeAllEvents(session.sendMessage('hi'));

    expect(events.some(e => e.type === 'text_delta')).toBe(true);
    expect(events.some(e => e.type === 'loop_end')).toBe(true);

    const state = session.getStore().getState();
    expect(state.lastEvent).toBeDefined();
    expect(state.lastEvent!.type).toBe('loop_end');
  });

  it('Store lastEvent 每次事件更新', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hi');

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    const gen = session.sendMessage('test');
    const events: AgentEvent[] = [];

    for await (const event of gen) {
      events.push(event);
      // 每次 yield 后检查 lastEvent 是否更新
      expect(session.getStore().getState().lastEvent).toEqual(event);
    }
  });

  it('loop_end 后 → Store 状态变为 completed', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('done');

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    await consumeAllEvents(session.sendMessage('hi'));

    expect(session.getStatus()).toBe('completed');
    expect(session.getStore().getState().status).toBe('completed');
  });

  it('destroy → Store 状态变为 destroyed', async () => {
    const provider = new MockLLMProvider();
    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    await session.destroy();
    expect(session.getStatus()).toBe('destroyed');
    expect(session.getStore().getState().status).toBe('destroyed');
  });

  it('destroyed 状态 sendMessage → 抛出错误', async () => {
    const provider = new MockLLMProvider();
    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    await session.destroy();

    try {
      await consumeAllEvents(session.sendMessage('hi'));
      expect.unreachable('应抛出错误');
    } catch (err) {
      expect((err as Error).message).toContain('已销毁');
    }
  });

  it('getSessionId → 返回 runtime_ 前缀的 ID', () => {
    const provider = new MockLLMProvider();
    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    expect(session.getSessionId().startsWith('runtime_')).toBe(true);
  });

  it('getStore → 返回 Store 实例', () => {
    const provider = new MockLLMProvider();
    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    const store = session.getStore();
    expect(store).toBeDefined();
    expect(store.getState().sessionId).toBe(session.getSessionId());
    expect(store.getState().status).toBe('active');
    expect(store.getState().turnCount).toBe(0);
    expect(store.getState().lastEvent).toBeNull();
  });
});
