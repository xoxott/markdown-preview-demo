/** ToolScheduler 测试 — 并行/串行调度策略 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ToolExecutor, ToolRegistry, buildTool } from '@suga/ai-tool-core';
import { ParallelScheduler, SerialScheduler } from '../scheduler/ToolScheduler';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { ToolResultMessage, ToolUseBlock } from '../types/messages';

/** 辅助：创建测试 ToolUseContext */
function createTestContext() {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  return createAgentToolUseContext('test', 0, registry, abortController);
}

/** 辅助：消费所有调度结果 */
async function consumeAllResults(
  gen: AsyncGenerator<ToolResultMessage>
): Promise<ToolResultMessage[]> {
  const results: ToolResultMessage[] = [];
  for await (const result of gen) {
    results.push(result);
  }
  return results;
}

/** 注册加法工具 */
function createCalcRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(
    buildTool({
      name: 'calc',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      call: async args => ({ data: args.a + args.b }),
      description: async input => `加法: ${input.a}+${input.b}`
    })
  );
  return registry;
}

/** 注册会失败的工具 */
function createFailRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(
    buildTool({
      name: 'fail-tool',
      inputSchema: z.object({ msg: z.string() }),
      call: async () => {
        throw new Error('工具执行失败');
      },
      description: async () => '会失败的工具'
    })
  );
  return registry;
}

const toolUse1: ToolUseBlock = { id: 'call_1', name: 'calc', input: { a: 1, b: 2 } };
const toolUse2: ToolUseBlock = { id: 'call_2', name: 'calc', input: { a: 3, b: 4 } };

describe('ParallelScheduler', () => {
  it('单个工具调用 → 成功返回结果', async () => {
    const scheduler = new ParallelScheduler();
    const executor = new ToolExecutor();
    const registry = createCalcRegistry();
    const context = createTestContext();

    const results = await consumeAllResults(
      scheduler.schedule([toolUse1], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(1);
    expect(results[0].isSuccess).toBe(true);
    expect(results[0].toolUseId).toBe('call_1');
    expect(results[0].result).toBe(3);
  });

  it('多个工具调用 → 并行执行并全部返回', async () => {
    const scheduler = new ParallelScheduler();
    const executor = new ToolExecutor();
    const registry = createCalcRegistry();
    const context = createTestContext();

    const results = await consumeAllResults(
      scheduler.schedule([toolUse1, toolUse2], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(2);
    expect(results.every(r => r.isSuccess)).toBe(true);
  });

  it('未注册工具 → 返回 isSuccess=false 的结果', async () => {
    const scheduler = new ParallelScheduler();
    const executor = new ToolExecutor();
    const registry = new ToolRegistry(); // 空注册表
    const context = createTestContext();

    const unknownToolUse: ToolUseBlock = { id: 'call_x', name: 'unknown', input: {} };
    const results = await consumeAllResults(
      scheduler.schedule([unknownToolUse], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(1);
    expect(results[0].isSuccess).toBe(false);
    expect(results[0].error).toContain('未注册');
  });

  it('工具执行失败 → 返回 isSuccess=false', async () => {
    const scheduler = new ParallelScheduler();
    const executor = new ToolExecutor();
    const registry = createFailRegistry();
    const context = createTestContext();

    const failToolUse: ToolUseBlock = { id: 'call_f', name: 'fail-tool', input: { msg: 'boom' } };
    const results = await consumeAllResults(
      scheduler.schedule([failToolUse], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(1);
    expect(results[0].isSuccess).toBe(false);
  });

  it('混合成功和失败 → 全部返回结果', async () => {
    const scheduler = new ParallelScheduler();
    const executor = new ToolExecutor();
    const registry = createCalcRegistry(); // 只有 calc
    const context = createTestContext();

    const unknownToolUse: ToolUseBlock = { id: 'call_x', name: 'unknown', input: {} };
    const results = await consumeAllResults(
      scheduler.schedule([toolUse1, unknownToolUse], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(2);
    const successResults = results.filter(r => r.isSuccess);
    const failResults = results.filter(r => !r.isSuccess);
    expect(successResults).toHaveLength(1);
    expect(failResults).toHaveLength(1);
  });
});

describe('SerialScheduler', () => {
  it('单个工具调用 → 成功返回结果', async () => {
    const scheduler = new SerialScheduler();
    const executor = new ToolExecutor();
    const registry = createCalcRegistry();
    const context = createTestContext();

    const results = await consumeAllResults(
      scheduler.schedule([toolUse1], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(1);
    expect(results[0].isSuccess).toBe(true);
    expect(results[0].result).toBe(3);
  });

  it('多个工具调用 → 逐个执行，顺序产出', async () => {
    const scheduler = new SerialScheduler();
    const executor = new ToolExecutor();
    const registry = createCalcRegistry();
    const context = createTestContext();

    const results = await consumeAllResults(
      scheduler.schedule([toolUse1, toolUse2], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(2);
    expect(results[0].toolUseId).toBe('call_1');
    expect(results[1].toolUseId).toBe('call_2');
    expect(results.every(r => r.isSuccess)).toBe(true);
  });

  it('未注册工具 → 返回 isSuccess=false', async () => {
    const scheduler = new SerialScheduler();
    const executor = new ToolExecutor();
    const registry = new ToolRegistry();
    const context = createTestContext();

    const unknownToolUse: ToolUseBlock = { id: 'call_x', name: 'unknown', input: {} };
    const results = await consumeAllResults(
      scheduler.schedule([unknownToolUse], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(1);
    expect(results[0].isSuccess).toBe(false);
  });

  it('前一个失败不影响后续执行', async () => {
    const scheduler = new SerialScheduler();
    const executor = new ToolExecutor();
    const registry = createCalcRegistry();
    const context = createTestContext();

    const unknownToolUse: ToolUseBlock = { id: 'call_x', name: 'unknown', input: {} };
    const results = await consumeAllResults(
      scheduler.schedule([unknownToolUse, toolUse1], executor, registry, context, 30000)
    );

    expect(results).toHaveLength(2);
    expect(results[0].isSuccess).toBe(false);
    expect(results[1].isSuccess).toBe(true);
  });
});
