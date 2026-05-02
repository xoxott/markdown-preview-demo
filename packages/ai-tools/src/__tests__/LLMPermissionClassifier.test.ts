/** LLMPermissionClassifier 测试 — 两阶段分类逻辑 + Iron Gate + API错误 */

import { describe, expect, it } from 'vitest';
import type { ToolClassifierInput } from '@suga/ai-tool-core';
import type { CallModelFn, ClassifierModelResponse } from '../provider/LLMPermissionClassifier';
import { LLMPermissionClassifier } from '../provider/LLMPermissionClassifier';

/** 辅助：创建最小分类器输入 */
function createClassifierInput(
  toolName: string,
  overrides?: Partial<ToolClassifierInput>
): ToolClassifierInput {
  return {
    toolName,
    input: {},
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false,
    ...overrides
  };
}

/** 辅助：创建 mock callModel 函数 */
function createMockCallModel(responses: ClassifierModelResponse[]): CallModelFn {
  let callIndex = 0;
  return async () => {
    const response = responses[callIndex++];
    if (!response) {
      return {
        content: '',
        model: 'mock-model',
        unavailable: true
      };
    }
    return response;
  };
}

describe('LLMPermissionClassifier', () => {
  it('name = yolo-llm', () => {
    const classifier = new LLMPermissionClassifier({
      callModel: async () => ({ content: '', model: 'mock' })
    });
    expect(classifier.name).toBe('yolo-llm');
  });

  it('Stage 1 ALLOW → 直接返回 allow, confidence=medium', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([{ content: 'ALLOW', model: 'mock-model' }])
    });

    const result = await classifier.classify(
      createClassifierInput('glob', { isReadOnly: true, safetyLabel: 'readonly' })
    );

    expect(result.behavior).toBe('allow');
    expect(result.confidence).toBe('medium');
    expect(result.reason).toContain('fast classifier');
  });

  it('Stage 1 BLOCK → 升级 Stage 2 thinking → deny', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([
        { content: 'BLOCK', model: 'mock-model' },
        {
          content: '<decision>BLOCK</decision><reason>Destructive file write</reason>',
          model: 'mock-model'
        }
      ])
    });

    const result = await classifier.classify(
      createClassifierInput('file-write', { isDestructive: true, safetyLabel: 'destructive' })
    );

    expect(result.behavior).toBe('deny');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('Destructive file write');
  });

  it('Stage 1 BLOCK → Stage 2 ASK → ask, confidence=high', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([
        { content: 'BLOCK', model: 'mock-model' },
        {
          content: '<decision>ASK</decision><reason>Bash command with unclear intent</reason>',
          model: 'mock-model'
        }
      ])
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.behavior).toBe('ask');
    expect(result.confidence).toBe('high');
  });

  it('Stage 1 不可解析 → 升级 Stage 2 thinking', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([
        { content: 'gibberish unclear text', model: 'mock-model' },
        {
          content: '<decision>ALLOW</decision><reason>Safe read operation</reason>',
          model: 'mock-model'
        }
      ])
    });

    const result = await classifier.classify(
      createClassifierInput('file-read', { isReadOnly: true, safetyLabel: 'readonly' })
    );

    expect(result.behavior).toBe('allow');
    expect(result.confidence).toBe('high');
  });

  it('Stage 1 不可解析 + thinking禁用 → deny (fail-closed)', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([{ content: 'random text', model: 'mock-model' }]),
      enableThinking: false
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.behavior).toBe('deny');
    expect(result.confidence).toBe('low');
  });

  it('Stage 1 BLOCK + thinking禁用 → deny', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([{ content: 'BLOCK', model: 'mock-model' }]),
      enableThinking: false
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.behavior).toBe('deny');
    expect(result.confidence).toBe('low');
  });

  it('API 不可用 → unavailable + fail-open → ask', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([{ content: '', model: 'mock-model', unavailable: true }]),
      ironGate: { failClosed: false }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.unavailable).toBe(true);
    expect(result.behavior).toBe('ask');
  });

  it('API 不可用 → unavailable + fail-closed → deny', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([{ content: '', model: 'mock-model', unavailable: true }]),
      ironGate: { failClosed: true }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.unavailable).toBe(true);
    expect(result.behavior).toBe('deny');
  });

  it('transcriptTooLong → ask + transcriptTooLong标记', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([
        { content: '', model: 'mock-model', unavailable: true, transcriptTooLong: true }
      ]),
      ironGate: { failClosed: false }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.unavailable).toBe(true);
    expect(result.transcriptTooLong).toBe(true);
    expect(result.behavior).toBe('ask');
  });

  it('transcriptTooLong + fail-closed → deny', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([
        { content: '', model: 'mock-model', unavailable: true, transcriptTooLong: true }
      ]),
      ironGate: { failClosed: true }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.behavior).toBe('deny');
    expect(result.unavailable).toBe(true);
  });

  it('Stage 2 API 不可用 → unavailable + Iron Gate', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([
        { content: 'BLOCK', model: 'mock-model' }, // Stage 1: block → 升级
        { content: '', model: 'mock-model', unavailable: true } // Stage 2: unavailable
      ]),
      ironGate: { failClosed: false }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.unavailable).toBe(true);
    expect(result.behavior).toBe('ask');
  });

  it('Stage 2 不可解析 → unavailable', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([
        { content: 'BLOCK', model: 'mock-model' },
        { content: 'completely random text no decision', model: 'mock-model' }
      ]),
      ironGate: { failClosed: false }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.unavailable).toBe(true);
    expect(result.behavior).toBe('ask');
  });

  it('只读安全标签 + isReadOnly → fast classifier allow', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([{ content: 'ALLOW', model: 'mock-model' }])
    });

    const result = await classifier.classify(
      createClassifierInput('file-read', { isReadOnly: true, safetyLabel: 'readonly' })
    );

    expect(result.behavior).toBe('allow');
    expect(result.confidence).toBe('medium');
  });

  it('Stage 1 callModel 抛异常 → unavailable + fail-open', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: async () => {
        throw new Error('Network error');
      },
      ironGate: { failClosed: false }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.unavailable).toBe(true);
    expect(result.behavior).toBe('ask');
  });

  it('Stage 2 callModel 抛异常 → unavailable + fail-open', async () => {
    let callCount = 0;
    const classifier = new LLMPermissionClassifier({
      callModel: async () => {
        callCount++;
        if (callCount === 1) {
          return { content: 'BLOCK', model: 'mock-model' };
        }
        throw new Error('Stage 2 network error');
      },
      ironGate: { failClosed: false }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', { safetyLabel: 'system' })
    );

    expect(result.unavailable).toBe(true);
    expect(result.behavior).toBe('ask');
  });

  it('自定义模型名 → 传递到 callModel', async () => {
    let capturedModel = '';
    const classifier = new LLMPermissionClassifier({
      callModel: async req => {
        capturedModel = req.model;
        return { content: 'ALLOW', model: req.model };
      },
      model: 'claude-sonnet-4-6'
    });

    await classifier.classify(
      createClassifierInput('glob', { isReadOnly: true, safetyLabel: 'readonly' })
    );

    expect(capturedModel).toBe('claude-sonnet-4-6');
  });

  // ===== P38: Bash确定性快速路径委托 =====

  it('bash "ls -la" → allow (确定性，不调用callModel)', async () => {
    let callModelCount = 0;
    const classifier = new LLMPermissionClassifier({
      callModel: async () => {
        callModelCount++;
        return { content: 'ALLOW', model: 'mock-model' };
      }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', {
        input: { command: 'ls -la /tmp' },
        safetyLabel: 'system',
        isReadOnly: false
      })
    );

    expect(result.behavior).toBe('allow');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('ls');
    expect(callModelCount).toBe(0); // 确定性分类，不调用LLM
  });

  it('bash "rm -rf /" → deny (确定性，不调用callModel)', async () => {
    let callModelCount = 0;
    const classifier = new LLMPermissionClassifier({
      callModel: async () => {
        callModelCount++;
        return { content: 'BLOCK', model: 'mock-model' };
      }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', {
        input: { command: 'rm -rf /' },
        safetyLabel: 'system',
        isReadOnly: false
      })
    );

    expect(result.behavior).toBe('deny');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('rm');
    expect(callModelCount).toBe(0);
  });

  it('bash "curl https://..." → ask → 继续LLM两阶段', async () => {
    let callModelCount = 0;
    const countingClassifier = new LLMPermissionClassifier({
      callModel: async () => {
        callModelCount++;
        if (callModelCount === 1) return { content: 'BLOCK', model: 'mock-model' };
        return {
          content: '<decision>ASK</decision><reason>Network operation unclear</reason>',
          model: 'mock-model'
        };
      }
    });

    const result = await countingClassifier.classify(
      createClassifierInput('bash', {
        input: { command: 'curl https://example.com' },
        safetyLabel: 'system',
        isReadOnly: false
      })
    );

    // curl不在白/黑名单 → ask → 继续走LLM两阶段
    expect(result.behavior).toBe('ask');
    expect(result.confidence).toBe('high');
    expect(callModelCount).toBe(2); // Stage 1 + Stage 2
  });

  it('bash 无command字段 → 继续LLM两阶段', async () => {
    const classifier = new LLMPermissionClassifier({
      callModel: createMockCallModel([{ content: 'ALLOW', model: 'mock-model' }])
    });

    const result = await classifier.classify(
      createClassifierInput('bash', {
        input: {}, // 无command字段
        safetyLabel: 'system',
        isReadOnly: false
      })
    );

    // 无command → 无法确定性分类 → 继续LLM
    expect(result.behavior).toBe('allow');
    expect(result.confidence).toBe('medium'); // fast classifier allow → medium confidence
  });

  it('bash "sudo ls" → deny (sudo黑名单，不调用callModel)', async () => {
    let callModelCount = 0;
    const classifier = new LLMPermissionClassifier({
      callModel: async () => {
        callModelCount++;
        return { content: 'ALLOW', model: 'mock-model' };
      }
    });

    const result = await classifier.classify(
      createClassifierInput('bash', {
        input: { command: 'sudo ls' },
        safetyLabel: 'system',
        isReadOnly: false
      })
    );

    expect(result.behavior).toBe('deny');
    expect(result.reason).toContain('sudo');
    expect(callModelCount).toBe(0);
  });
});
