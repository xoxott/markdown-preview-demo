/** StreamingToolScheduler 核心类型定义 */

import type { ToolResultMessage, ToolUseBlock } from '@suga/ai-agent-loop';

/** 工具执行状态追踪 */
export type ToolStatus = 'queued' | 'executing' | 'completed' | 'yielded';

/** 单工具追踪记录 */
export interface TrackedTool {
  /** 工具调用 ID */
  readonly id: string;
  /** 对应的 ToolUseBlock */
  readonly toolUse: ToolUseBlock;
  /** 该工具是否并发安全 */
  readonly isConcurrencySafe: boolean;
  /** 当前执行状态 */
  status: ToolStatus;
  /** 执行完成后的结果 */
  result?: ToolResultMessage;
}

/** 并发安全分区批次 */
export interface Batch {
  /** 该批次是否并发安全 */
  readonly isConcurrencySafe: boolean;
  /** 该批次的工具调用列表 */
  readonly blocks: ToolUseBlock[];
}

/** StreamingToolScheduler 配置 */
export interface StreamingSchedulerConfig {
  /** 最大并发数（默认 DEFAULT_MAX_CONCURRENCY） */
  readonly maxConcurrency?: number;
}
