/** CacheBreakDetector — 检测子代理消息是否导致 prompt cache break */

import type { CacheBreakInfo, CacheSafeParams } from '../types/cache';

/**
 * detectBreak — 检测父子代理之间的 cache break
 *
 * 两阶段检测（对齐 Claude Code 的 Cache break 检测）：
 *
 * - Phase 1: 比较 hash(system/tools/model/betas)
 * - Phase 2: 检查 cache_read_input_tokens 下降（真实 API 响应）
 *
 * 当前实现为 Phase 1（静态参数比较）， Phase 2 需要真实 Anthropic API 响应数据（未来扩展）。
 */
export function detectBreak(
  parentParams: CacheSafeParams,
  childParams: CacheSafeParams
): CacheBreakInfo {
  // 系统提示不同 → break
  if (parentParams.systemPrompt !== childParams.systemPrompt) {
    return {
      broke: true,
      reason: 'system_prompt_changed',
      estimatedLostTokens: estimateLostTokens(parentParams.systemPrompt.length)
    };
  }

  // 工具数量不同 → break
  const parentToolNames = parentParams.toolDefinitions.map(t => t.name);
  const childToolNames = childParams.toolDefinitions.map(t => t.name);

  if (parentToolNames.length !== childToolNames.length) {
    return {
      broke: true,
      reason: 'tool_count_changed',
      estimatedLostTokens: estimateLostTokens(
        parentParams.toolDefinitions.reduce(
          (sum, t) => sum + JSON.stringify(t.inputSchema).length,
          0
        )
      )
    };
  }

  // 工具名称顺序不同 → break
  for (let i = 0; i < parentToolNames.length; i++) {
    if (parentToolNames[i] !== childToolNames[i]) {
      return {
        broke: true,
        reason: 'tool_order_changed',
        estimatedLostTokens: estimateLostTokens(
          JSON.stringify(parentParams.toolDefinitions[i].inputSchema).length
        )
      };
    }
  }

  // useExactTools 策略不同 → break
  if (parentParams.useExactTools !== childParams.useExactTools) {
    return {
      broke: true,
      reason: 'use_exact_tools_changed',
      estimatedLostTokens: 0 // 策略变化可能不直接影响 tokens
    };
  }

  // 无 break
  return { broke: false };
}

/** 估算丢失的 cache tokens（粗略：字符数 / 4） */
function estimateLostTokens(charCount: number): number {
  return Math.ceil(charCount / 4);
}
