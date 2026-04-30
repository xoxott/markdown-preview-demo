/** partitionToolCalls 测试 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import type { ToolUseBlock } from '@suga/ai-agent-loop';
import { partitionToolCalls } from '../scheduler/partition';
import { createSafeMockTool, createUnsafeMockTool } from './mocks/MockToolHelper';

/** 创建测试 ToolUseBlock */
function createToolUse(name: string): ToolUseBlock {
  return { id: `tu_${name}`, name, input: {} };
}

function createTestRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(createSafeMockTool({ name: 'read' }));
  registry.register(createSafeMockTool({ name: 'glob' }));
  registry.register(createUnsafeMockTool({ name: 'bash' }));
  registry.register(createUnsafeMockTool({ name: 'write' }));
  return registry;
}

describe('partitionToolCalls', () => {
  it('空输入应返回空数组', () => {
    const registry = createTestRegistry();
    expect(partitionToolCalls([], registry)).toHaveLength(0);
  });

  it('单个 safe 工具应产生一个 safe batch', () => {
    const registry = createTestRegistry();
    const batches = partitionToolCalls([createToolUse('read')], registry);
    expect(batches).toHaveLength(1);
    expect(batches[0].isConcurrencySafe).toBe(true);
    expect(batches[0].blocks).toHaveLength(1);
  });

  it('单个 unsafe 工具应产生一个 unsafe batch', () => {
    const registry = createTestRegistry();
    const batches = partitionToolCalls([createToolUse('bash')], registry);
    expect(batches).toHaveLength(1);
    expect(batches[0].isConcurrencySafe).toBe(false);
  });

  it('连续 safe 工具应合并到同一 batch', () => {
    const registry = createTestRegistry();
    const batches = partitionToolCalls([createToolUse('read'), createToolUse('glob')], registry);
    expect(batches).toHaveLength(1);
    expect(batches[0].isConcurrencySafe).toBe(true);
    expect(batches[0].blocks).toHaveLength(2);
  });

  it('mixed safe/unsafe 应正确分区', () => {
    const registry = createTestRegistry();
    const batches = partitionToolCalls(
      [createToolUse('read'), createToolUse('read'), createToolUse('bash'), createToolUse('glob')],
      registry
    );
    expect(batches).toHaveLength(3);
    expect(batches[0].isConcurrencySafe).toBe(true);
    expect(batches[0].blocks).toHaveLength(2);
    expect(batches[1].isConcurrencySafe).toBe(false);
    expect(batches[1].blocks).toHaveLength(1);
    expect(batches[2].isConcurrencySafe).toBe(true);
    expect(batches[2].blocks).toHaveLength(1);
  });

  it('未注册工具应视为 unsafe', () => {
    const registry = createTestRegistry();
    const batches = partitionToolCalls([createToolUse('unknown')], registry);
    expect(batches).toHaveLength(1);
    expect(batches[0].isConcurrencySafe).toBe(false);
  });

  it('连续 unsafe 工具不应合并', () => {
    const registry = createTestRegistry();
    const batches = partitionToolCalls([createToolUse('bash'), createToolUse('write')], registry);
    expect(batches).toHaveLength(2);
    expect(batches[0].isConcurrencySafe).toBe(false);
    expect(batches[1].isConcurrencySafe).toBe(false);
  });

  it('交替 safe/unsafe 应产生多个 batch', () => {
    const registry = createTestRegistry();
    const batches = partitionToolCalls(
      [createToolUse('read'), createToolUse('bash'), createToolUse('glob')],
      registry
    );
    expect(batches).toHaveLength(3);
    expect(batches[0].isConcurrencySafe).toBe(true);
    expect(batches[1].isConcurrencySafe).toBe(false);
    expect(batches[2].isConcurrencySafe).toBe(true);
  });
});
