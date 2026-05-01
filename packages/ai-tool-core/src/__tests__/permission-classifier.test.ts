/** PermissionClassifier 接口 + ClassifierResult 类型测试 */

import { describe, expect, it } from 'vitest';
import type {
  ClassifierResult,
  IronGate,
  PermissionClassifier,
  ToolClassifierInput
} from '../types/permission-classifier';

describe('ToolClassifierInput', () => {
  it('应包含 5 个必需字段', () => {
    const input: ToolClassifierInput = {
      toolName: 'bash',
      input: { command: 'git push' },
      safetyLabel: 'system',
      isReadOnly: false,
      isDestructive: false
    };
    expect(input.toolName).toBe('bash');
    expect(input.safetyLabel).toBe('system');
    expect(input.isReadOnly).toBe(false);
    expect(input.isDestructive).toBe(false);
  });
});

describe('ClassifierResult', () => {
  it('正常结果 — allow', () => {
    const result: ClassifierResult = {
      behavior: 'allow',
      reason: '安全命令',
      confidence: 'high'
    };
    expect(result.behavior).toBe('allow');
    expect(result.unavailable).toBeUndefined();
    expect(result.transcriptTooLong).toBeUndefined();
  });

  it('正常结果 — deny', () => {
    const result: ClassifierResult = {
      behavior: 'deny',
      reason: '危险命令',
      confidence: 'high'
    };
    expect(result.behavior).toBe('deny');
  });

  it('正常结果 — ask', () => {
    const result: ClassifierResult = {
      behavior: 'ask',
      reason: '不确定',
      confidence: 'low'
    };
    expect(result.behavior).toBe('ask');
  });

  it('分类器不可用 — unavailable=true', () => {
    const result: ClassifierResult = {
      behavior: 'deny',
      reason: 'API 错误',
      confidence: 'low',
      unavailable: true
    };
    expect(result.unavailable).toBe(true);
  });

  it('转录过长 — transcriptTooLong=true', () => {
    const result: ClassifierResult = {
      behavior: 'ask',
      reason: '上下文溢出',
      confidence: 'low',
      transcriptTooLong: true
    };
    expect(result.transcriptTooLong).toBe(true);
  });

  it('confidence 可为 high/medium/low', () => {
    const levels: ClassifierResult[] = [
      { behavior: 'allow', reason: 'test', confidence: 'high' },
      { behavior: 'allow', reason: 'test', confidence: 'medium' },
      { behavior: 'allow', reason: 'test', confidence: 'low' }
    ];
    expect(levels.map(r => r.confidence)).toEqual(['high', 'medium', 'low']);
  });
});

describe('PermissionClassifier', () => {
  it('接口应可被宿主实现', async () => {
    const mockClassifier: PermissionClassifier = {
      name: 'test-classifier',
      classify: async input => ({
        behavior: 'allow',
        reason: `分类 ${input.toolName}`,
        confidence: 'high'
      })
    };
    const result = await mockClassifier.classify({
      toolName: 'bash',
      input: { command: 'ls' },
      safetyLabel: 'system',
      isReadOnly: false,
      isDestructive: false
    });
    expect(result.behavior).toBe('allow');
    expect(mockClassifier.name).toBe('test-classifier');
  });
});

describe('IronGate', () => {
  it('failClosed=true — 分类器不可用时拒绝所有', () => {
    const gate: IronGate = { failClosed: true };
    expect(gate.failClosed).toBe(true);
  });

  it('failClosed=false — 分类器不可用时退回后续步骤', () => {
    const gate: IronGate = { failClosed: false };
    expect(gate.failClosed).toBe(false);
  });
});
