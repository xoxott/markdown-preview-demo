/** DiskTaskOutput + OutputFileBridge 测试 — 噪声隔离 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LoopResult } from '@suga/ai-agent-loop';
import { DiskTaskOutput } from '../output/DiskTaskOutput';
import { OutputFileBridge } from '../output/OutputFileBridge';
import { DEFAULT_MAX_IN_MEMORY_CHARS } from '../constants';
import type { SubagentResult } from '../types/result';

/** 创建默认 SubagentResult */
const makeResult = (summary: string, overrides?: Partial<SubagentResult>): SubagentResult => ({
  agentType: 'test-agent',
  loopResult: {
    type: 'completed',
    reason: '完成',
    messages: []
  } as LoopResult,
  summary,
  success: true,
  durationMs: 100,
  ...overrides
});

describe('DiskTaskOutput', () => {
  let diskOutput: DiskTaskOutput;

  beforeEach(() => {
    diskOutput = new DiskTaskOutput({ outputDir: '/tmp/ai-subagent-test-output' });
  });

  afterEach(async () => {
    await diskOutput.cleanup();
  });

  it('小输出保留在内存 — 不触发持久化', () => {
    const content = '这是一个小输出';
    const result = diskOutput.processOutput(content, 'tu_1');

    expect(result).toBe(content); // 原样返回
    expect(result.length).toBeLessThanOrEqual(DEFAULT_MAX_IN_MEMORY_CHARS);
  });

  it('大输出持久化到磁盘 — 返回 summary 标签', () => {
    // 创建超出阈值的大内容
    const bigContent = 'A'.repeat(DEFAULT_MAX_IN_MEMORY_CHARS + 1000);
    const result = diskOutput.processOutput(bigContent, 'tu_big');

    expect(result).toContain('<persisted-output>');
    expect(result).toContain('预览');
    expect(result).toContain('/tmp/ai-subagent-test-output/tu_big.txt');
    expect(result.length).toBeLessThan(bigContent.length); // summary 远小于原内容
  });

  it('maxInMemoryChars 可自定义', () => {
    const customOutput = new DiskTaskOutput({
      maxInMemoryChars: 100,
      outputDir: '/tmp/ai-subagent-test-custom'
    });

    expect(customOutput.getMaxInMemoryChars()).toBe(100);

    // 101 字符就触发持久化
    const content = 'A'.repeat(101);
    const result = customOutput.processOutput(content, 'tu_custom');
    expect(result).toContain('<persisted-output>');

    // 100 字符保留在内存
    const smallContent = 'A'.repeat(100);
    const smallResult = customOutput.processOutput(smallContent, 'tu_small');
    expect(smallResult).toBe(smallContent);
  });

  it('flush — 等待所有写入完成', async () => {
    const bigContent = 'B'.repeat(DEFAULT_MAX_IN_MEMORY_CHARS + 500);
    diskOutput.processOutput(bigContent, 'tu_flush1');
    diskOutput.processOutput(bigContent, 'tu_flush2');

    await diskOutput.flush();
    // flush 后写入队列清空
  });
});

describe('OutputFileBridge', () => {
  let bridge: OutputFileBridge;

  beforeEach(() => {
    bridge = new OutputFileBridge({ outputDir: '/tmp/ai-subagent-test-bridge' });
  });

  afterEach(async () => {
    await bridge.cleanup();
  });

  it('小结果不持久化 — summary 原样保留', () => {
    const result = makeResult('完成研究员任务');
    const processed = bridge.processResult(result);

    expect(processed.summary).toBe('完成研究员任务');
    expect(processed.outputPath).toBeUndefined();
  });

  it('大结果持久化 — summary 替换为标签 + outputPath', () => {
    const bigSummary = 'S'.repeat(DEFAULT_MAX_IN_MEMORY_CHARS + 2000);
    const result = makeResult(bigSummary);
    const processed = bridge.processResult(result);

    expect(processed.summary).toContain('<persisted-output>');
    expect(processed.outputPath).toBeDefined();
    expect(processed.agentType).toBe('test-agent'); // 其他字段不变
  });

  it('createSummary — 生成 OutputSummary', () => {
    const content = 'C'.repeat(DEFAULT_MAX_IN_MEMORY_CHARS + 500);
    const summary = bridge.createSummary(content, '/tmp/result.txt');

    expect(summary.preview.length).toBeLessThanOrEqual(2000);
    expect(summary.filePath).toBe('/tmp/result.txt');
    expect(summary.totalLength).toBe(DEFAULT_MAX_IN_MEMORY_CHARS + 500);
    expect(summary.truncated).toBe(true);
  });

  it('getDiskTaskOutput — 获取底层实例', () => {
    const diskOutput = bridge.getDiskTaskOutput();
    expect(diskOutput).toBeInstanceOf(DiskTaskOutput);
  });
});
