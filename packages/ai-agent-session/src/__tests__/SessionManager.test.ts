/** SessionManager 测试 — 创建、查找、序列化/反序列化、生命周期 */

import { describe, expect, it } from 'vitest';
import type { AgentEvent } from '@suga/ai-agent-loop';
import { SessionManager } from '../session/SessionManager';
import type { ProviderConfig, SessionConfig } from '../types/session';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 辅助：创建测试配置（含 providerFactory 以避免实际 HTTP 调用） */
function createTestConfig(): SessionConfig {
  return {
    providerConfig: {
      baseURL: 'https://test.api',
      apiKey: 'test-key',
      model: 'test-model'
    },
    providerFactory: (_cfg: ProviderConfig) => new MockLLMProvider()
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

describe('SessionManager', () => {
  describe('create', () => {
    it('应创建新会话', () => {
      const manager = new SessionManager();
      const config = createTestConfig();
      const session = manager.create(config);

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.getStatus()).toBe('active');
    });

    it('创建的会话应被缓存', () => {
      const manager = new SessionManager();
      const config = createTestConfig();
      const session = manager.create(config);

      const found = manager.getSession(session.sessionId);
      expect(found).toBe(session);
    });
  });

  describe('getSession', () => {
    it('不存在 → undefined', () => {
      const manager = new SessionManager();
      const found = manager.getSession('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('完整生命周期', () => {
    it('create → send → pause → resume → destroy', async () => {
      const manager = new SessionManager();

      // 设置 provider 响应
      const provider = new MockLLMProvider();
      provider.addSimpleTextResponse('hello');

      // 创建 session，注入 mock provider
      const testConfig: SessionConfig = {
        ...createTestConfig(),
        providerFactory: (_cfg: ProviderConfig) => provider
      };
      const testSession = manager.create(testConfig);
      provider.addSimpleTextResponse('hello');

      // 发送消息
      const events = await consumeAllEvents(testSession.sendMessage('hi'));
      expect(events.some(e => e.type === 'loop_end')).toBe(true);
      expect(testSession.getStatus()).toBe('completed');
    });

    it('destroy → 从缓存移除', async () => {
      const manager = new SessionManager();
      const config = createTestConfig();
      const session = manager.create(config);

      await manager.destroy(session.sessionId);
      expect(manager.getSession(session.sessionId)).toBeUndefined();
    });
  });

  describe('serialize + deserialize', () => {
    it('序列化 → 反序列化 → 恢复会话', async () => {
      const manager = new SessionManager();
      const config: SessionConfig = {
        ...createTestConfig(),
        providerFactory: (_cfg: ProviderConfig) => {
          const p = new MockLLMProvider();
          p.addSimpleTextResponse('hello');
          return p;
        }
      };

      const session = manager.create(config);
      const serialized = manager.serialize(session.sessionId);

      expect(serialized.sessionId).toBe(session.sessionId);
      expect(serialized.status).toBe('active');

      // 反序列化
      const restored = await manager.deserialize(serialized);
      expect(restored.sessionId).toBe(session.sessionId);
    });

    it('反序列化已存在 → 返回缓存', async () => {
      const manager = new SessionManager();
      const config = createTestConfig();
      const session = manager.create(config);

      const serialized = manager.serialize(session.sessionId);
      const restored = await manager.deserialize(serialized);
      expect(restored).toBe(session);
    });
  });

  describe('listSessions', () => {
    it('应返回所有会话信息', () => {
      const manager = new SessionManager();
      const config = createTestConfig();

      const s1 = manager.create(config);
      const s2 = manager.create(config);

      const list = manager.listSessions();
      expect(list).toHaveLength(2);
      expect(list.some(s => s.sessionId === s1.sessionId)).toBe(true);
      expect(list.some(s => s.sessionId === s2.sessionId)).toBe(true);
    });
  });

  describe('pause', () => {
    it('不存在 → 抛出错误', () => {
      const manager = new SessionManager();
      try {
        manager.pause('nonexistent');
        expect.unreachable('应抛出错误');
      } catch (err) {
        expect((err as Error).message).toContain('不存在');
      }
    });
  });
});
