/** 循环结果类型定义（Loop Result Types） Agent Loop 终止时产出的最终结果 */

import type { AgentMessage } from './messages';
import type { TerminalTransition } from './state';
import type { LLMStreamChunk } from './provider';

/** 循环最终结果 */
export interface LoopResult {
  /** 终止类型 */
  readonly type: TerminalTransition['type'];
  /** 终止原因描述 */
  readonly reason: string;
  /** 最终消息历史 */
  readonly messages: readonly AgentMessage[];
  /** 用量信息（从 ctx.meta.usage harvest） */
  readonly usage?: LLMStreamChunk['usage'];
}
