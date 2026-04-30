/** Session 测试 — 会话生命周期（sendMessage, pause, resume, destroy） */

import { describe, expect, it } from 'vitest';
import type { AgentEvent } from '@suga/ai-agent-loop';
import { Session } from '../session/Session';
import type { SessionConfig } from '../types/session';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 辅助：创建测试用配置 */
function createTestConfig(): SessionConfig {
  return {
    providerConfig: {
      baseURL: 'https://test.api',
      apiKey: 'test-key',
      model: 'test-model'
    }
  };
}

/** 辅助：消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe('Session', () => {
  describe('构造', () => {
    it('应正确创建会话实例', () => {
      const provider = new MockLLMProvider();
      const config = createTestConfig();
      const session = new Session(config, provider);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId.startsWith('session_')).toBe(true);
      expect(session.getStatus()).toBe('active');
      expect(session.createdAt).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    it('简单文本 → completed', async () => {
      const provider = new MockLLMProvider();
      provider.addSimpleTextResponse('hello');

      const config = createTestConfig();
      const session = new Session(config, provider);

      const events = await consumeAllEvents(session.sendMessage('hi'));

      expect(events.some(e => e.type === 'text_delta')).toBe(true);
      expect(events.some(e => e.type === 'loop_end')).toBe(true);
      expect(session.getStatus()).toBe('completed');
    });

    it('destroyed 状态 → 抛出错误', async () => {
      const provider = new MockLLMProvider();
      const config = createTestConfig();
      const session = new Session(config, provider);

      await session.destroy();

      try {
        await consumeAllEvents(session.sendMessage('hi'));
        expect.unreachable('应抛出错误');
      } catch (err) {
        expect((err as Error).message).toContain('已销毁');
      }
    });
  });

  describe('pause + resume', () => {
    it('pause → 状态变为 paused', async () => {
      const provider = new MockLLMProvider();
      provider.addSimpleTextResponse('hello');
      provider.setDelay(100);

      const config = createTestConfig();
      const session = new Session(config, provider);

      // 发送消息但不消费完（后台运行）
      const gen = session.sendMessage('hi');

      // 消费几个事件后暂停
      const events: AgentEvent[] = [];
      let paused = false;
      for await (const event of gen) {
        events.push(event);
        if (events.length >= 2 && !paused) {
          session.pause();
          paused = true;
        }
      }

      // 应包含 loop_end（因为 abort）
      expect(events.some(e => e.type === 'loop_end')).toBe(true);
      expect(session.getStatus()).toBe('paused');
    });
  });

  describe('destroy', () => {
    it('destroy → 状态变为 destroyed', async () => {
      const provider = new MockLLMProvider();
      provider.addSimpleTextResponse('bye');

      const config = createTestConfig();
      const session = new Session(config, provider);

      await session.destroy();
      expect(session.getStatus()).toBe('destroyed');
    });
  });

  describe('serialize', () => {
    it('初始会话 → 可序列化', () => {
      const provider = new MockLLMProvider();
      const config = createTestConfig();
      const session = new Session(config, provider);

      const serialized = session.serialize();
      expect(serialized.sessionId).toBe(session.sessionId);
      expect(serialized.status).toBe('active');
      expect(serialized.providerConfig).toEqual(config.providerConfig);
      expect(serialized.maxTurns).toBe(10);
    });

    it('completed 会话 → 状态序列化正确', async () => {
      const provider = new MockLLMProvider();
      provider.addSimpleTextResponse('done');

      const config = createTestConfig();
      const session = new Session(config, provider);

      await consumeAllEvents(session.sendMessage('hi'));
      const serialized = session.serialize();

      expect(serialized.status).toBe('completed');
      expect(serialized.state.messages.length).toBeGreaterThan(0);
    });
  });
});
