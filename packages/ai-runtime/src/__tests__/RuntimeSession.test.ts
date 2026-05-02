import { describe, expect, it } from 'vitest';
import type { AgentEvent } from '@suga/ai-agent-loop';
import { RuntimeSession } from '../session/RuntimeSession';
import type { RuntimeConfig } from '../types/config';
import { MockLLMProvider } from './mocks/MockLLMProvider';

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

    expect(session.getStatus()).toBe('active');
    expect(session.getStore().getState().status).toBe('active');
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

describe('RuntimeSession P34多轮持久化', () => {
  it('连续2次sendMessage → 消息历史累积', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello'); // 第1轮
    provider.addSimpleTextResponse('world'); // 第2轮

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    // 第1轮
    const events1 = await consumeAllEvents(session.sendMessage('hi'));
    expect(events1.some(e => e.type === 'text_delta')).toBe(true);
    const history1 = session.getMessages().length;
    expect(history1).toBeGreaterThan(0);

    // 第2轮 — 携带第1轮的历史
    const events2 = await consumeAllEvents(session.sendMessage('more'));
    expect(events2.some(e => e.type === 'text_delta')).toBe(true);
    // 第2轮历史应比第1轮更长（累积了第1轮+第2轮的消息）
    expect(session.getMessages().length).toBeGreaterThan(history1);
  });

  it('sendMessage完成后status仍active → 可继续发送', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('done');

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    await consumeAllEvents(session.sendMessage('hi'));
    expect(session.getStatus()).toBe('active');
    // 可以继续sendMessage（多轮对话）
  });

  it('getMessages → 返回完整历史', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('response');

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    expect(session.getMessages()).toHaveLength(0);

    await consumeAllEvents(session.sendMessage('hi'));
    expect(session.getMessages().length).toBeGreaterThan(0);
  });

  it('destroy后sendMessage → throw', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('ok');

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);

    await consumeAllEvents(session.sendMessage('hi'));
    await session.destroy();

    try {
      await consumeAllEvents(session.sendMessage('another'));
      expect.unreachable('应抛出错误');
    } catch (err) {
      expect((err as Error).message).toContain('已销毁');
    }
  });
});
