/** Agent 流式事件类型定义（Agent Event Types） AsyncGenerator 产出的每个 yield 单元 */

import type { ToolReferenceBlock, ToolResultMessage, ToolUseBlock } from './messages';
import type { LoopResult } from './result';

/** G12: 缓存断裂检测结果事件 */
export interface CacheBreakDetectedEvent {
  type: 'cache_break_detected';
  /** 断裂原因 */
  reason: string;
  /** 当前缓存命中率 */
  currentCacheHitRate?: number;
  /** 前一次缓存命中率 */
  previousCacheHitRate?: number;
  /** 建议动作 */
  recommendedAction?: 'retry_with_same_prefix' | 'accept_and_continue' | 'reduce_context';
}

/** G14: 预算超限终止（RuntimeSession / QueryEngine） */
export interface BudgetExceededEvent {
  type: 'budget_exceeded';
  /** 累计成本（USD） */
  totalCostUsd: number;
  /** 预算上限（USD） */
  maxBudgetUsd: number;
}

/** Agent 流式事件（AsyncGenerator yield 的每个单元） */
export type AgentEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_use_start'; toolUse: ToolUseBlock }
  | { type: 'tool_reference_start'; toolReference: ToolReferenceBlock }
  | { type: 'tool_result'; result: ToolResultMessage }
  | { type: 'turn_start'; turnCount: number }
  | { type: 'turn_end'; turnCount: number }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'loop_end'; result: LoopResult }
  | CacheBreakDetectedEvent
  | BudgetExceededEvent;
