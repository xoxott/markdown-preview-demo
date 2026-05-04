/** P76 C1 测试 — ForkGuard + ForkSpawner */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildTool, ToolRegistry } from '@suga/ai-tool-core';
import {
  FORK_BOILERPLATE,
  isInForkChild,
  getForkDepth,
  injectForkBoilerplate,
  ForkSpawner
} from '../index';
import { MockLLMProvider } from './mocks/MockLLMProvider';

// ============================================================
// ForkGuard
// ============================================================

describe('ForkGuard', () => {
  describe('isInForkChild', () => {
    it('无 fork 标签 → false', () => {
      const messages = [
        { id: '1', role: 'user', content: 'hello', timestamp: 0 },
        { id: '2', role: 'assistant', content: 'response', timestamp: 0, toolUses: [] }
      ];
      expect(isInForkChild(messages)).toBe(false);
    });

    it('assistant 消息含 fork 标签 → true', () => {
      const messages = [
        { id: '1', role: 'assistant', content: `${FORK_BOILERPLATE}\n\nFork response`, timestamp: 0, toolUses: [] }
      ];
      expect(isInForkChild(messages)).toBe(true);
    });

    it('多条消息中有一条含 fork 标签 → true', () => {
      const messages = [
        { id: '1', role: 'user', content: 'hello', timestamp: 0 },
        { id: '2', role: 'assistant', content: 'normal response', timestamp: 0, toolUses: [] },
        { id: '3', role: 'assistant', content: `${FORK_BOILERPLATE} fork child`, timestamp: 0, toolUses: [] }
      ];
      expect(isInForkChild(messages)).toBe(true);
    });

    it('user 消息含 fork 标签 → false（只检查 assistant）', () => {
      const messages = [
        { id: '1', role: 'user', content: `${FORK_BOILERPLATE} some text`, timestamp: 0 }
      ];
      expect(isInForkChild(messages)).toBe(false);
    });
  });

  describe('getForkDepth', () => {
    it('无 fork 标签 → depth 0', () => {
      const messages = [
        { id: '1', role: 'assistant', content: 'normal', timestamp: 0, toolUses: [] }
      ];
      expect(getForkDepth(messages)).toBe(0);
    });

    it('1条 assistant 含 fork 标签 → depth 1', () => {
      const messages = [
        { id: '1', role: 'assistant', content: `${FORK_BOILERPLATE} child`, timestamp: 0, toolUses: [] }
      ];
      expect(getForkDepth(messages)).toBe(1);
    });

    it('2条 assistant 含 fork 标签 → depth 2（嵌套 fork）', () => {
      const messages = [
        { id: '1', role: 'assistant', content: `${FORK_BOILERPLATE} first fork`, timestamp: 0, toolUses: [] },
        { id: '2', role: 'assistant', content: `${FORK_BOILERPLATE} nested fork`, timestamp: 0, toolUses: [] }
      ];
      expect(getForkDepth(messages)).toBe(2);
    });
  });

  describe('injectForkBoilerplate', () => {
    it('注入标记到 system prompt', () => {
      const result = injectForkBoilerplate('你是一个助手');
      expect(result).toContain(FORK_BOILERPLATE);
      expect(result).toContain('你是一个助手');
    });

    it('已有标记不再重复注入', () => {
      const result = injectForkBoilerplate(`${FORK_BOILERPLATE}\n\n已有标记`);
      expect(result).toBe(`${FORK_BOILERPLATE}\n\n已有标记`);
    });

    it('空 system prompt → 标记 + 空内容', () => {
      const result = injectForkBoilerplate('');
      expect(result).toContain(FORK_BOILERPLATE);
    });
  });

  describe('FORK_BOILERPLATE 常量', () => {
    it('是 <fork-boilerplate> 字符串', () => {
      expect(FORK_BOILERPLATE).toBe('<fork-boilerplate>');
    });
  });
});

// ============================================================
// ForkSpawner
// ============================================================

describe('ForkSpawner', () => {
  const mockProvider = new MockLLMProvider();

  it('构造器创建实例', () => {
    const spawner = new ForkSpawner(mockProvider);
    expect(spawner).toBeDefined();
    expect(spawner.getMaxForkDepth()).toBe(2); // 默认 DEFAULT_MAX_FORK_DEPTH
  });

  it('自定义 maxForkDepth', () => {
    const spawner = new ForkSpawner(mockProvider, { maxForkDepth: 3 });
    expect(spawner.getMaxForkDepth()).toBe(3);
  });

  it('createScopedRegistry — 复用 SubagentSpawner 逻辑', () => {
    const registry = new ToolRegistry();
    const readTool = buildTool({
      name: 'read',
      inputSchema: z.object({}),
      call: async () => ({ data: 'ok' }),
      description: async () => 'Read tool'
    });
    registry.register(readTool);

    const spawner = new ForkSpawner(mockProvider);

    // 白名单: 只保留指定工具
    const def = { agentType: 'explore', tools: ['read'] } as any;
    const scoped = spawner.createScopedRegistry(registry, def);
    expect(scoped.getAll().length).toBe(1);
    expect(scoped.getAll()[0].name).toBe('read');
  });

  it('spawn — fork 子代理执行（递归防护拒绝）', async () => {
    const spawner = new ForkSpawner(mockProvider);

    // def.systemPromptPrefix 包含 fork 标签 → 递归防护拒绝
    const def = {
      agentType: 'fork',
      systemPromptPrefix: `${FORK_BOILERPLATE}\n\nFork child`
    } as any;

    const result = await spawner.spawn(def, 'test task');

    expect(result.success).toBe(false);
    expect(result.summary).toContain('Fork 递归防护');
  });

  it('spawn — 正常 fork 子代理执行', async () => {
    const spawner = new ForkSpawner(mockProvider);
    const def = {
      agentType: 'general-purpose',
      tools: undefined,
      maxTurns: 1
    } as any;

    const result = await spawner.spawn(def, 'hello');

    // MockLLMProvider 返回简单响应
    expect(result.agentType).toBe('general-purpose');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});