/** AgentContext 测试 — 创建与可变操作 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';

/** 辅助：创建测试用的 AgentState */
function createTestState(turnCount = 0): AgentState {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  return {
    sessionId: 'test-session',
    turnCount,
    messages: [],
    toolUseContext: createAgentToolUseContext('test-session', turnCount, registry, abortController),
    transition: { type: 'next_turn' }
  };
}

describe('AgentContext', () => {
  describe('createMutableAgentContext', () => {
    it('初始状态正确（空文本、空 toolUses、无错误）', () => {
      const state = createTestState();
      const ctx = createMutableAgentContext(state);

      expect(ctx.state).toBe(state);
      expect(ctx.accumulatedText).toBe('');
      expect(ctx.accumulatedThinking).toBe('');
      expect(ctx.toolUses).toEqual([]);
      expect(ctx.needsToolExecution).toBe(false);
      expect(ctx.error).toBeUndefined();
      expect(ctx.meta).toEqual({});
    });
  });

  describe('MutableAgentContext 操作', () => {
    it('appendText 应累积文本增量', () => {
      const ctx = createMutableAgentContext(createTestState());
      ctx.appendText('hello');
      ctx.appendText(' world');
      expect(ctx.accumulatedText).toBe('hello world');
    });

    it('appendThinking 应累积思考增量', () => {
      const ctx = createMutableAgentContext(createTestState());
      ctx.appendThinking('thinking...');
      ctx.appendThinking(' more');
      expect(ctx.accumulatedThinking).toBe('thinking... more');
    });

    it('pushToolUse 应追加工具调用块', () => {
      const ctx = createMutableAgentContext(createTestState());
      ctx.pushToolUse({ id: 'call_1', name: 'calc', input: { a: 1 } });
      ctx.pushToolUse({ id: 'call_2', name: 'read', input: { path: '/test' } });
      expect(ctx.toolUses).toHaveLength(2);
      expect(ctx.toolUses[0].name).toBe('calc');
      expect(ctx.toolUses[1].name).toBe('read');
    });

    it('setNeedsToolExecution 应设置标记', () => {
      const ctx = createMutableAgentContext(createTestState());
      expect(ctx.needsToolExecution).toBe(false);
      ctx.setNeedsToolExecution(true);
      expect(ctx.needsToolExecution).toBe(true);
      ctx.setNeedsToolExecution(false);
      expect(ctx.needsToolExecution).toBe(false);
    });

    it('setError 应设置错误', () => {
      const ctx = createMutableAgentContext(createTestState());
      const error = new Error('test error');
      ctx.setError(error);
      expect(ctx.error).toBe(error);
    });

    it('meta 应可自由读写', () => {
      const ctx = createMutableAgentContext(createTestState());
      ctx.meta.preProcessed = true;
      ctx.meta.customData = { key: 'value' };
      expect(ctx.meta.preProcessed).toBe(true);
      expect(ctx.meta.customData).toEqual({ key: 'value' });
    });

    it('多次操作后所有状态正确反映', () => {
      const ctx = createMutableAgentContext(createTestState());
      ctx.appendText('text');
      ctx.appendThinking('think');
      ctx.pushToolUse({ id: 'c1', name: 'tool', input: {} });
      ctx.setNeedsToolExecution(true);
      ctx.meta.step = 1;

      expect(ctx.accumulatedText).toBe('text');
      expect(ctx.accumulatedThinking).toBe('think');
      expect(ctx.toolUses).toHaveLength(1);
      expect(ctx.needsToolExecution).toBe(true);
      expect(ctx.meta.step).toBe(1);
    });
  });
});
