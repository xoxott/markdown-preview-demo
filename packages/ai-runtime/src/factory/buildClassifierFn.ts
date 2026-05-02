/** buildClassifierFn — 从 RuntimeConfig 构建 PermissionClassifier */

import type { PermissionClassifier } from '@suga/ai-tool-core';
import { LLMPermissionClassifier, YoloPermissionClassifier } from '@suga/ai-tools';
import type { RuntimeConfig } from '../types/config';

/**
 * 从 RuntimeConfig 构建 PermissionClassifier
 *
 * - 有 classifierConfig → 创建 LLMPermissionClassifier（两阶段LLM分类）
 * - 无 classifierConfig → 创建 YoloPermissionClassifier（stub, always-allow）
 *
 * @param config RuntimeConfig
 * @returns PermissionClassifier 实例
 */
export function buildClassifierFn(config: RuntimeConfig): PermissionClassifier {
  if (config.classifierConfig) {
    return new LLMPermissionClassifier(config.classifierConfig);
  }

  return new YoloPermissionClassifier();
}
