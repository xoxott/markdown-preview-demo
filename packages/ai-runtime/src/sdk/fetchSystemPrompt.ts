/** fetchSystemPrompt — 组装完整 system prompt 段落（含 Memory 注入） */

import type { SystemPrompt } from '@suga/ai-agent-loop';
import { createSystemPrompt } from '@suga/ai-agent-loop';
import { buildMemoryPrompt, computeMemoryPaths } from '@suga/ai-memory';
import type { RuntimeConfig } from '../types/config';

/** 默认 system prompt（当未提供 customSystemPrompt 时使用） */
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';

/**
 * 组装完整 system prompt 段落
 *
 * 顺序: [customSystemPrompt | DEFAULT_SYSTEM_PROMPT, memoryPrompt, appendSystemPrompt]
 *
 * 简化版 — 不做缓存，每次 query 时重新计算。 后续迭代可加入 systemPromptSection 缓存机制。
 *
 * 如果 config.systemPrompt 已提供，直接返回（跳过组装）。
 */
export async function fetchSystemPrompt(config: RuntimeConfig): Promise<SystemPrompt> {
  // 如果已预计算 systemPrompt，直接使用
  if (config.systemPrompt) {
    return config.systemPrompt;
  }

  const sections: string[] = [];

  // 1. 主系统提示（自定义 or 默认）
  sections.push(config.customSystemPrompt ?? DEFAULT_SYSTEM_PROMPT);

  // 2. Memory 段落（需要三件套: memoryConfig + memoryProvider + memoryPathConfig）
  if (config.memoryConfig && config.memoryProvider && config.memoryPathConfig) {
    const paths = computeMemoryPaths(config.memoryPathConfig);
    const memoryResult = await buildMemoryPrompt(config.memoryProvider, paths, config.memoryConfig);
    if (memoryResult.fullPrompt) {
      sections.push(memoryResult.fullPrompt);
    }
  }

  // 3. 附加系统提示
  if (config.appendSystemPrompt) {
    sections.push(config.appendSystemPrompt);
  }

  return createSystemPrompt(sections);
}
