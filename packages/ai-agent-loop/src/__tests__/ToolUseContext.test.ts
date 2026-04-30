/** ToolUseContext 桥接测试 — interface merging 扩展验证 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentToolUseContext } from '../context/ToolUseContext';

describe('ToolUseContext', () => {
  describe('createAgentToolUseContext', () => {
    it('应创建包含 agentId 和 turnCount 的完整上下文', () => {
      const registry = new ToolRegistry();
      const abortController = new AbortController();
      const ctx = createAgentToolUseContext('agent-1', 5, registry, abortController);

      expect(ctx.agentId).toBe('agent-1');
      expect(ctx.turnCount).toBe(5);
      expect(ctx.abortController).toBe(abortController);
      expect(ctx.tools).toBe(registry);
    });

    it('agentId 和 sessionId 应相同', () => {
      const registry = new ToolRegistry();
      const abortController = new AbortController();
      const ctx = createAgentToolUseContext('my-session', 0, registry, abortController);

      expect(ctx.agentId).toBe(ctx.sessionId);
    });
  });

  describe('interface merging 扩展', () => {
    it('扩展的 agentId 和 turnCount 应可通过 ToolUseContext 类型访问', () => {
      const registry = new ToolRegistry();
      const abortController = new AbortController();
      const ctx: AgentToolUseContext = createAgentToolUseContext(
        'test',
        3,
        registry,
        abortController
      );

      // TypeScript 类型层面验证：这些字段在 ToolUseContext 扩展后可访问
      expect(ctx.agentId).toBe('test');
      expect(ctx.turnCount).toBe(3);
    });

    it('AgentToolUseContext 应保留 ai-tool-core 原始字段', () => {
      const registry = new ToolRegistry();
      const abortController = new AbortController();
      const ctx = createAgentToolUseContext('test', 0, registry, abortController);

      // ai-tool-core 原始字段
      expect(ctx.abortController).toBe(abortController);
      expect(ctx.tools).toBe(registry);
      expect(ctx.sessionId).toBe('test');
    });
  });
});
