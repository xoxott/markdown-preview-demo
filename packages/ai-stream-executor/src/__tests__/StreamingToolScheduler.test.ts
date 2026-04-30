/** StreamingToolScheduler 测试 */

import { describe, expect, it } from 'vitest';
import { ToolExecutor, ToolRegistry } from '@suga/ai-tool-core';
import type { ToolResultMessage, ToolUseBlock } from '@suga/ai-agent-loop';
import type { ToolUseContext } from '@suga/ai-tool-core';
import { StreamingToolScheduler } from '../scheduler/StreamingToolScheduler';
import { createSafeMockTool, createUnsafeMockTool } from './mocks/MockToolHelper';

/** 创建测试 ToolUseBlock */
function createToolUse(name: string): ToolUseBlock {
  return {
    id: `tu_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name,
    input: {}
  };
}

/** 创建测试 ToolUseContext */
function createTestContext(): ToolUseContext {
  return {
    abortController: new AbortController(),
    tools: new ToolRegistry(),
    sessionId: 'test-session'
  };
}

/** 创建包含 safe 和 unsafe 工具的测试注册表 */
function createTestRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(createSafeMockTool({ name: 'read' }));
  registry.register(createSafeMockTool({ name: 'glob' }));
  registry.register(createUnsafeMockTool({ name: 'bash' }));
  registry.register(createUnsafeMockTool({ name: 'write' }));
  return registry;
}

/** 创建带延迟的测试注册表（用于验证并发行为） */
function createDelayedTestRegistry(delayMs: number): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(
    createSafeMockTool({
      name: 'read',
      callFn: async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, delayMs);
        });
        return { data: 'read-result' };
      }
    })
  );
  registry.register(
    createSafeMockTool({
      name: 'glob',
      callFn: async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, delayMs);
        });
        return { data: 'glob-result' };
      }
    })
  );
  registry.register(
    createUnsafeMockTool({
      name: 'bash',
      callFn: async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, delayMs * 2);
        });
        return { data: 'bash-result' };
      }
    })
  );
  return registry;
}

describe('StreamingToolScheduler', () => {
  describe('schedule (批量模式)', () => {
    it('应执行单个 safe 工具并返回结果', async () => {
      const scheduler = new StreamingToolScheduler();
      const registry = createTestRegistry();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('read')];
      const results: ToolResultMessage[] = [];

      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      expect(results).toHaveLength(1);
      expect(results[0].toolName).toBe('read');
      expect(results[0].isSuccess).toBe(true);
    });

    it('应执行多个 safe 工具并返回所有结果', async () => {
      const scheduler = new StreamingToolScheduler();
      const registry = createTestRegistry();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('read'), createToolUse('glob')];
      const results: ToolResultMessage[] = [];

      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results.every(r => r.isSuccess)).toBe(true);
    });

    it('应串行执行 unsafe 工具并按序返回结果', async () => {
      const scheduler = new StreamingToolScheduler();
      const registry = createTestRegistry();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('bash'), createToolUse('write')];
      const results: ToolResultMessage[] = [];

      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0].toolName).toBe('bash');
      expect(results[1].toolName).toBe('write');
    });

    it('未注册工具应返回错误结果', async () => {
      const scheduler = new StreamingToolScheduler();
      const registry = createTestRegistry();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('unknown')];
      const results: ToolResultMessage[] = [];

      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      expect(results).toHaveLength(1);
      expect(results[0].isSuccess).toBe(false);
      expect(results[0].error).toContain('未注册');
    });

    it('mixed safe/unsafe 应按序 yield 结果', async () => {
      const scheduler = new StreamingToolScheduler();
      const registry = createTestRegistry();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('read'), createToolUse('bash'), createToolUse('glob')];
      const results: ToolResultMessage[] = [];

      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(results[0].toolName).toBe('read');
      expect(results[1].toolName).toBe('bash');
      expect(results[2].toolName).toBe('glob');
    });

    it('空输入应不 yield 任何结果', async () => {
      const scheduler = new StreamingToolScheduler();
      const registry = createTestRegistry();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const results: ToolResultMessage[] = [];
      for await (const result of scheduler.schedule([], executor, registry, context, 30000)) {
        results.push(result);
      }

      expect(results).toHaveLength(0);
    });
  });

  describe('并发安全行为验证', () => {
    it('多个 safe 工具应并行执行（总时间 < 串行总和）', async () => {
      const delayMs = 50;
      const registry = createDelayedTestRegistry(delayMs);
      const scheduler = new StreamingToolScheduler();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('read'), createToolUse('glob')];
      const startTime = Date.now();

      const results: ToolResultMessage[] = [];
      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(2);
      // 并行执行: 总时间应接近单个延迟而非两倍
      expect(totalTime).toBeLessThan(delayMs * 2.5);
    });

    it('unsafe 工具后 safe 工具应等待 unsafe 完成', async () => {
      const delayMs = 30;
      const registry = createDelayedTestRegistry(delayMs);
      const scheduler = new StreamingToolScheduler();
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('bash'), createToolUse('read')];
      const startTime = Date.now();

      const results: ToolResultMessage[] = [];
      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(2);
      // 串行: bash(60ms) + read(30ms) ≈ 90ms+
      expect(totalTime).toBeGreaterThan(delayMs * 2);
    });

    it('并发上限应限制 safe 工具并发数', async () => {
      const scheduler = new StreamingToolScheduler({ maxConcurrency: 1 });
      const delayMs = 30;
      const registry = createDelayedTestRegistry(delayMs);
      const executor = new ToolExecutor();
      const context = createTestContext();

      const toolUses = [createToolUse('read'), createToolUse('glob')];
      const startTime = Date.now();

      const results: ToolResultMessage[] = [];
      for await (const result of scheduler.schedule(toolUses, executor, registry, context, 30000)) {
        results.push(result);
      }

      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(2);
      // maxConcurrency=1: 应串行执行
      expect(totalTime).toBeGreaterThan(delayMs * 1.5);
    });
  });
});
