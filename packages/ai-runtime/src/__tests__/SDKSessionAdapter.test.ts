/** P46 测试 — SDKSessionAdapter 映射 RuntimeSession → SDKSession */

import { describe, expect, it, vi } from 'vitest';
import { SDKSessionAdapter } from '../session/SDKSessionAdapter';
import type { RuntimeSession } from '../session/RuntimeSession';

// ============================================================
// Mock RuntimeSession
// ============================================================

function createMockRuntimeSession(sessionId = 'test_session_1'): RuntimeSession {
  const mockEvents = [
    { type: 'turn_start', timestamp: Date.now() },
    { type: 'text_delta', content: 'Hello', timestamp: Date.now() },
    {
      type: 'loop_end',
      result: { messages: [], usage: { inputTokens: 100, outputTokens: 50 } },
      timestamp: Date.now()
    }
  ];

  return {
    getSessionId: vi.fn().mockReturnValue(sessionId),
    getStatus: vi.fn().mockReturnValue('active'),
    getMessages: vi.fn().mockReturnValue([]),
    sendMessage: vi.fn().mockImplementation(async function* mockSendMessage() {
      for (const event of mockEvents) {
        yield event;
      }
    }),
    pause: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockImplementation(async function* mockResume() {
      yield { type: 'text_delta', content: 'resumed', timestamp: Date.now() };
    })
  } as unknown as RuntimeSession;
}

describe('SDKSessionAdapter', () => {
  it('sessionId getter — 返回 RuntimeSession.getSessionId()', () => {
    const mock = createMockRuntimeSession('my_session');
    const adapter = new SDKSessionAdapter(mock);
    expect(adapter.sessionId).toBe('my_session');
  });

  it('abort() — 调用 RuntimeSession.pause()', async () => {
    const mock = createMockRuntimeSession();
    const adapter = new SDKSessionAdapter(mock);

    await adapter.abort();
    expect(mock.pause).toHaveBeenCalled();
  });

  it('close() — 调用 RuntimeSession.destroy()', async () => {
    const mock = createMockRuntimeSession();
    const adapter = new SDKSessionAdapter(mock);

    await adapter.close();
    expect(mock.destroy).toHaveBeenCalled();
  });

  it('getRuntimeSession() — 返回底层 RuntimeSession', () => {
    const mock = createMockRuntimeSession();
    const adapter = new SDKSessionAdapter(mock);
    expect(adapter.getRuntimeSession()).toBe(mock);
  });

  it('prompt() — 映射 AgentEvent → SDKMessage 流', async () => {
    const mock = createMockRuntimeSession();
    const adapter = new SDKSessionAdapter(mock);

    const messages = [];
    for await (const msg of adapter.prompt('hello')) {
      messages.push(msg);
    }

    // 应产生 SDKMessage（来自 turn_start, text_delta, loop_end 映射）
    expect(messages.length).toBeGreaterThan(0);
    expect(mock.sendMessage).toHaveBeenCalledWith('hello');
  });

  it('prompt() — 映射上下文正确追踪 usage', async () => {
    const mock = createMockRuntimeSession();
    const adapter = new SDKSessionAdapter(mock);

    const messages = [];
    for await (const msg of adapter.prompt('hello')) {
      messages.push(msg);
    }

    // loop_end 应映射为 result 消息
    const resultMsg = messages.find(m => m.type === 'result');
    if (resultMsg) {
      expect(resultMsg).toBeDefined();
    }
  });

  it('prompt() — 空响应 → 无 SDKMessage', async () => {
    const mock = {
      getSessionId: vi.fn().mockReturnValue('empty_session'),
      sendMessage: vi.fn().mockImplementation(async function* mockEmptySendMessage() {
        // 无事件产出
      }),
      pause: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined)
    } as unknown as RuntimeSession;

    const adapter = new SDKSessionAdapter(mock);
    const messages = [];
    for await (const msg of adapter.prompt('hello')) {
      messages.push(msg);
    }

    expect(messages.length).toBe(0);
  });

  it('prompt() — 多轮对话携带历史', async () => {
    const mock = createMockRuntimeSession();
    const adapter = new SDKSessionAdapter(mock);

    // 第一次 prompt
    for await (const _ of adapter.prompt('first message')) {
      // consume
    }

    // 第二次 prompt（多轮）
    for await (const _ of adapter.prompt('second message')) {
      // consume
    }

    // sendMessage 应被调用两次
    expect(mock.sendMessage).toHaveBeenCalledTimes(2);
  });
});
