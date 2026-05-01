/** Prompt Cache 脚手架类型 — 模拟 Claude Code 的 cache 共享机制 */

import type { ToolDefinition } from '@suga/ai-agent-loop';

/** Cache 安全参数 — 用于评估子代理消息是否与父共享 prompt cache */
export interface CacheSafeParams {
  /** 系统提示文本 */
  readonly systemPrompt: string;
  /** 工具定义列表 */
  readonly toolDefinitions: readonly ToolDefinition[];
  /** 是否使用完整工具池（不做筛选，保证 cache 不 break） */
  readonly useExactTools: boolean;
}

/** Placeholder 工具结果 — 所有 fork 子代理用同一占位文本保证消息前缀一致 */
export interface PlaceholderResult {
  /** 工具调用 ID */
  readonly toolUseId: string;
  /** 占位文本 */
  readonly placeholderText: string;
  /** 标记为占位结果 */
  readonly isPlaceholder: true;
}

/** Cache break 检测信息 */
export interface CacheBreakInfo {
  /** 是否发生 cache break */
  readonly broke: boolean;
  /** break 原因描述 */
  readonly reason?: string;
  /** 预估丢失的 cache tokens */
  readonly estimatedLostTokens?: number;
}
