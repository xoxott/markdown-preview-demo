/** buildClassifierFn 测试 — 从 RuntimeConfig 构建 PermissionClassifier */

import { describe, expect, it } from 'vitest';
import { LLMPermissionClassifier, YoloPermissionClassifier } from '@suga/ai-tools';
import type { RuntimeConfig } from '../types/config';
import { buildClassifierFn } from '../factory/buildClassifierFn';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 辅助：创建最小配置 */
function createMinimalConfig(): RuntimeConfig {
  return { provider: new MockLLMProvider(), fsProvider: new MockFileSystemProvider() };
}

describe('buildClassifierFn', () => {
  it('无 classifierConfig → 返回 YoloPermissionClassifier stub', () => {
    const config = createMinimalConfig();
    const classifier = buildClassifierFn(config);

    expect(classifier).toBeInstanceOf(YoloPermissionClassifier);
    expect(classifier.name).toBe('yolo-stub');
  });

  it('有 classifierConfig → 返回 LLMPermissionClassifier', () => {
    const config: RuntimeConfig = {
      ...createMinimalConfig(),
      classifierConfig: {
        callModel: async () => ({
          content: 'ALLOW',
          model: 'mock-model'
        })
      }
    };
    const classifier = buildClassifierFn(config);

    expect(classifier).toBeInstanceOf(LLMPermissionClassifier);
    expect(classifier.name).toBe('yolo-llm');
  });

  it('有 classifierConfig + 自定义模型 → LLMPermissionClassifier 使用自定义模型', async () => {
    let capturedModel = '';
    const config: RuntimeConfig = {
      ...createMinimalConfig(),
      classifierConfig: {
        callModel: async req => {
          capturedModel = req.model;
          return { content: 'ALLOW', model: req.model };
        },
        model: 'claude-opus-4-6'
      }
    };
    const classifier = buildClassifierFn(config);

    // 执行分类来验证模型名传递
    await classifier.classify({
      toolName: 'glob',
      input: {},
      safetyLabel: 'readonly',
      isReadOnly: true,
      isDestructive: false
    });

    expect(capturedModel).toBe('claude-opus-4-6');
  });
});
