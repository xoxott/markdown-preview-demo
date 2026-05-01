/** SubagentResult + SubagentToolResult — 子代理执行结果类型 */

import type { LoopResult } from '@suga/ai-agent-loop';

/** 子代理完整执行结果 */
export interface SubagentResult {
  /** 子代理类型标识 */
  readonly agentType: string;
  /** AgentLoop 执行结果 */
  readonly loopResult: LoopResult;
  /** 结果摘要（大输出持久化时为磁盘路径引用） */
  readonly summary: string;
  /** 是否成功 */
  readonly success: boolean;
  /** 大输出持久化路径（可选） */
  readonly outputPath?: string;
  /** 执行耗时（ms） */
  readonly durationMs: number;
}

/** AgentTool 返回给父 AgentLoop 的工具结果 */
export interface SubagentToolResult {
  /** 子代理类型 */
  readonly subagentType: string;
  /** 任务描述 */
  readonly task: string;
  /** 结果摘要 */
  readonly summary: string;
  /** 大输出持久化路径（可选） */
  readonly outputPath?: string;
  /** 错误信息 */
  readonly error?: string;
  /** 是否成功 */
  readonly success: boolean;
}
