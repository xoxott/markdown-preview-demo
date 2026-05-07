/** 依赖注入接口 — 保持框架无关性的核心 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { SummarySections } from './messages';

/** 持久化函数 — 将大型 tool_result 存储到磁盘/远程 */
export type PersistToolResult = (toolUseId: string, content: unknown) => Promise<string>;

/** LLM 摘要调用函数 — AutoCompact 层需要调用 LLM 生成摘要 */
export type CallModelForSummary = (
  messages: readonly AgentMessage[],
  sections?: SummarySections
) => Promise<string>;

/** Token 估算函数 — 可注入自定义 token 计算逻辑 */
export type TokenEstimator = (messages: readonly AgentMessage[]) => number;

/** PTL 错误检测函数 — 判断摘要请求是否自身也 PTL */
export type IsPTLError = (error: unknown) => boolean;

/** G19: Fork 子代理摘要函数 — ForkCompact 层需要 fork 子代理生成摘要 */
export type ForkSpawnerFn = (
  messages: readonly AgentMessage[],
  maxForkDepth?: number,
  summarySections?: import('./messages').SummarySections
) => Promise<string>;

/** 压缩依赖注入集合 */
export interface CompressDependencies {
  /** 持久化函数（ToolResultBudget 层需要） */
  readonly persistToolResult?: PersistToolResult;
  /** LLM 摘要调用函数（AutoCompact 层需要） */
  readonly callModelForSummary?: CallModelForSummary;
  /** 自定义 token 估算函数（默认使用 estimateTokensPrecise） */
  readonly tokenEstimator?: TokenEstimator;
  /** PTL 错误检测函数（AutoCompact PTL Retry 需要） */
  readonly isPTLError?: IsPTLError;
  /** G19: Fork 子代理摘要函数（ForkCompact 层需要） */
  readonly forkSpawner?: ForkSpawnerFn;
}
