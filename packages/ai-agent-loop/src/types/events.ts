/** Agent 流式事件类型定义（Agent Event Types） AsyncGenerator 产出的每个 yield 单元 */

import type { ToolReferenceBlock, ToolResultMessage, ToolUseBlock } from './messages';
import type { LoopResult } from './result';

/** Agent 流式事件（AsyncGenerator yield 的每个单元） */
export type AgentEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_use_start'; toolUse: ToolUseBlock }
  | { type: 'tool_reference_start'; toolReference: ToolReferenceBlock }
  | { type: 'tool_result'; result: ToolResultMessage }
  | { type: 'turn_start'; turnCount: number }
  | { type: 'turn_end'; turnCount: number }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'loop_end'; result: LoopResult };
