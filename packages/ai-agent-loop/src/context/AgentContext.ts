/** Agent 上下文（Agent Context） 单轮循环的唯一事实来源 */

import type { AgentState } from '../types/state';
import type { ToolReferenceBlock, ToolUseBlock } from '../types/messages';

/**
 * Agent 上下文（只读视图 — 对外暴露）
 *
 * 每轮循环创建一个新的 AgentContext，携带当前 State 和 LLM 产出的累积文本、toolUse 列表等信息。
 */
export interface AgentContext {
  /** 当前循环状态 */
  readonly state: AgentState;
  /** LLM 文本累积 */
  readonly accumulatedText: string;
  /** LLM 思考文本累积 */
  readonly accumulatedThinking: string;
  /** 当前轮检测到的 tool_use blocks */
  readonly toolUses: readonly ToolUseBlock[];
  /** 当前轮检测到的 tool_reference blocks (P12) */
  readonly toolReferences: readonly ToolReferenceBlock[];
  /** 是否需要工具执行 */
  readonly needsToolExecution: boolean;
  /** 错误 */
  readonly error?: unknown;
  /** 元数据（阶段间传递信息） */
  meta: Record<string, unknown>;
}

/**
 * 可变 Agent 上下文（Phase 内部使用）
 *
 * 各 Phase 通过 MutableAgentContext 累积 LLM 产出、 追加 toolUse blocks、设置执行标记等。
 */
export interface MutableAgentContext extends AgentContext {
  /** 追加文本增量 */
  appendText(delta: string): void;
  /** 追加思考增量 */
  appendThinking(delta: string): void;
  /** 追加 tool_use block */
  pushToolUse(toolUse: ToolUseBlock): void;
  /** 追加 tool_reference block (P12) */
  pushToolReference(toolReference: ToolReferenceBlock): void;
  /** 设置需要工具执行标记 */
  setNeedsToolExecution(value: boolean): void;
  /** 设置错误 */
  setError(error: unknown): void;
}

/**
 * 创建可变 Agent 上下文
 *
 * @param state 当前循环状态
 * @returns MutableAgentContext 实例
 */
export function createMutableAgentContext(state: AgentState): MutableAgentContext {
  let accumulatedText = '';
  let accumulatedThinking = '';
  const toolUses: ToolUseBlock[] = [];
  const toolReferences: ToolReferenceBlock[] = [];
  let needsToolExecution = false;
  let error: unknown | undefined;
  const meta: Record<string, unknown> = {};

  return {
    state,
    meta,

    get accumulatedText() {
      return accumulatedText;
    },
    get accumulatedThinking() {
      return accumulatedThinking;
    },
    get toolUses() {
      return toolUses;
    },
    get toolReferences() {
      return toolReferences;
    },
    get needsToolExecution() {
      return needsToolExecution;
    },
    get error() {
      return error;
    },

    appendText(delta: string) {
      accumulatedText += delta;
    },
    appendThinking(delta: string) {
      accumulatedThinking += delta;
    },
    pushToolUse(toolUse: ToolUseBlock) {
      toolUses.push(toolUse);
    },
    pushToolReference(toolReference: ToolReferenceBlock) {
      toolReferences.push(toolReference);
    },
    setNeedsToolExecution(value: boolean) {
      needsToolExecution = value;
    },
    setError(err: unknown) {
      error = err;
    }
  };
}
