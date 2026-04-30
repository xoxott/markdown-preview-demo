/** Serializer 测试 — AgentState 序列化/反序列化 + SerializedSession 构建 */

import { describe, expect, it } from 'vitest';
import type { AgentState } from '@suga/ai-agent-loop';
import {
  buildSerializedSession,
  deserializeAgentState,
  serializeAgentState
} from '../serialize/Serializer';
import type { SessionConfig } from '../types/session';
import type { SerializedSession } from '../types/serialized';

/** 辅助：创建测试用 AgentState */
function createTestState(
  overrides?: Partial<Omit<AgentState, 'toolUseContext'>>
): Omit<AgentState, 'toolUseContext'> {
  return {
    sessionId: 'test_session_1',
    turnCount: 2,
    messages: [
      { id: 'u1', role: 'user', content: 'hello', timestamp: 1000 },
      { id: 'a1', role: 'assistant', content: 'hi', timestamp: 2000, toolUses: [] }
    ],
    transition: { type: 'next_turn' },
    ...overrides
  };
}

/** 辅助：创建测试用 SessionConfig */
function createTestConfig(): SessionConfig {
  return {
    providerConfig: {
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      model: 'claude-3-haiku'
    }
  };
}

describe('Serializer', () => {
  describe('serializeAgentState', () => {
    it('应正确序列化基本 AgentState', () => {
      const state = createTestState();
      const serialized = serializeAgentState(state as AgentState);

      expect(serialized.sessionId).toBe('test_session_1');
      expect(serialized.turnCount).toBe(2);
      expect(serialized.messages).toHaveLength(2);
      expect(serialized.transition).toEqual({ type: 'next_turn' });
    });

    it('model_error transition → Error 转为 errorMessage/errorStack', () => {
      const state = createTestState({
        transition: { type: 'model_error', error: new Error('API fail') }
      });
      const serialized = serializeAgentState(state as AgentState);

      expect(serialized.transition.type).toBe('model_error');
      if (serialized.transition.type === 'model_error') {
        expect(serialized.transition.errorMessage).toBe('API fail');
        expect(serialized.transition.errorStack).toBeDefined();
      }
    });

    it('messages 保持完整', () => {
      const state = createTestState({
        messages: [
          { id: 'u1', role: 'user', content: 'hello', timestamp: 1000 },
          { id: 'a1', role: 'assistant', content: 'hi there', timestamp: 2000, toolUses: [] },
          {
            id: 'r1',
            role: 'tool_result',
            toolUseId: 't1',
            toolName: 'calc',
            result: 42,
            isSuccess: true,
            timestamp: 3000
          }
        ]
      });
      const serialized = serializeAgentState(state as AgentState);

      expect(serialized.messages).toHaveLength(3);
      expect(serialized.messages[0].role).toBe('user');
      expect(serialized.messages[1].role).toBe('assistant');
      expect(serialized.messages[2].role).toBe('tool_result');
    });
  });

  describe('deserializeAgentState', () => {
    it('应正确还原基本 AgentState（不含 toolUseContext）', () => {
      const state = createTestState();
      const serialized = serializeAgentState(state as AgentState);
      const deserialized = deserializeAgentState(serialized);

      expect(deserialized.sessionId).toBe('test_session_1');
      expect(deserialized.turnCount).toBe(2);
      expect(deserialized.messages).toHaveLength(2);
      expect(deserialized.transition).toEqual({ type: 'next_turn' });
    });

    it('model_error → 重建 Error 对象', () => {
      const state = createTestState({
        transition: { type: 'model_error', error: new Error('fail') }
      });
      const serialized = serializeAgentState(state as AgentState);
      const deserialized = deserializeAgentState(serialized);

      expect(deserialized.transition.type).toBe('model_error');
      if (deserialized.transition.type === 'model_error') {
        expect(deserialized.transition.error).toBeInstanceOf(Error);
        expect(deserialized.transition.error.message).toBe('fail');
      }
    });
  });

  describe('buildSerializedSession', () => {
    it('应构建完整 SerializedSession', () => {
      const state = createTestState() as AgentState;
      const config = createTestConfig();
      const now = Date.now();

      const session = buildSerializedSession(state, config, 'active', now, now);

      expect(session.sessionId).toBe('test_session_1');
      expect(session.providerConfig).toEqual(config.providerConfig);
      expect(session.maxTurns).toBe(10);
      expect(session.toolTimeout).toBe(30000);
      expect(session.status).toBe('active');
      expect(session.createdAt).toBe(now);
      expect(session.updatedAt).toBe(now);
      expect(session.state.sessionId).toBe('test_session_1');
    });

    it('自定义 maxTurns/toolTimeout → 使用配置值', () => {
      const state = createTestState() as AgentState;
      const config: SessionConfig = {
        ...createTestConfig(),
        maxTurns: 5,
        toolTimeout: 10000
      };
      const now = Date.now();

      const session = buildSerializedSession(state, config, 'paused', now, now);

      expect(session.maxTurns).toBe(5);
      expect(session.toolTimeout).toBe(10000);
      expect(session.status).toBe('paused');
    });
  });

  describe('JSON round-trip', () => {
    it('SerializedSession 可完整 JSON 序列化/反序列化', () => {
      const state = createTestState() as AgentState;
      const config = createTestConfig();
      const now = Date.now();

      const session = buildSerializedSession(state, config, 'active', now, now);
      const json = JSON.stringify(session);
      const parsed = JSON.parse(json) as SerializedSession;

      expect(parsed.sessionId).toBe(session.sessionId);
      expect(parsed.state.turnCount).toBe(session.state.turnCount);
      expect(parsed.state.messages).toHaveLength(2);
      expect(parsed.maxTurns).toBe(session.maxTurns);
    });

    it('model_error → JSON round-trip 保持 errorMessage', () => {
      const state = createTestState({
        transition: { type: 'model_error', error: new Error('timeout') }
      }) as AgentState;
      const config = createTestConfig();
      const now = Date.now();

      const session = buildSerializedSession(state, config, 'active', now, now);
      const json = JSON.stringify(session);
      const parsed = JSON.parse(json) as SerializedSession;

      expect(parsed.state.transition.type).toBe('model_error');
      if (parsed.state.transition.type === 'model_error') {
        expect(parsed.state.transition.errorMessage).toBe('timeout');
      }
    });
  });
});
