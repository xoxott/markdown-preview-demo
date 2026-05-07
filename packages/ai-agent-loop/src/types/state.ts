/** Agent 状态与配置类型定义（Agent State Types） 循环状态机和过渡类型 */

import type { ToolRegistry } from '@suga/ai-tool-core';
import type { HookRegistry } from '@suga/ai-hooks';
import type { AgentToolUseContext } from '../context/ToolUseContext';
import type { LoopPhase } from '../phase/LoopPhase';
import type { AgentMessage } from './messages';
import type { LLMProvider } from './provider';
import type { ToolScheduler } from './scheduler';

/** Agent 配置 */
export interface AgentConfig {
  /** 最大循环轮次（默认 10） */
  readonly maxTurns?: number;
  /** LLM Provider 实例 */
  readonly provider: LLMProvider;
  /** 工具注册表（可选，不提供则跳过工具执行阶段） */
  readonly toolRegistry?: ToolRegistry;
  /** 工具调度器（可选，默认 StreamingToolScheduler） */
  readonly scheduler?: ToolScheduler;
  /** 工具执行超时时间（ms，默认 30000） */
  readonly toolTimeout?: number;
  /** Hook 注册表（可选，提供则在 Phase 链中插入 HookPhase） */
  readonly hookRegistry?: HookRegistry;
  /** 自定义Phase链（提供则跳过默认buildPhases） */
  readonly phases?: readonly LoopPhase[];
  /** 系统提示段落（可选，不传则使用 Provider 的默认 system） */
  readonly systemPrompt?: import('./provider').SystemPrompt;
  /** Provider Map（P36 — 工具执行所需宿主环境注入，spread 到 ToolUseContext） */
  readonly providers?: Record<string, unknown>;
  /** G13: 结构化输出强制配置（可选） */
  readonly structuredOutputEnforcement?: StructuredOutputEnforcementConfig;
}

/** G13: 结构化输出强制配置 */
export interface StructuredOutputEnforcementConfig {
  /** 是否启用结构化输出强制（默认 false） */
  readonly enabled: boolean;
  /** 最大重试次数（默认 3） */
  readonly maxRetries?: number;
  /** 期望的工具名称列表（LLM 应调用这些工具而非返回纯文本） */
  readonly expectedTools?: readonly string[];
}

/**
 * 终止过渡类型（循环不再继续）
 *
 * 每种终止原因对应不同的退出条件：
 *
 * - completed: LLM 无工具调用，对话自然结束
 * - aborted: 用户中断或外部 signal 触发
 * - model_error: LLM API 调用出错
 * - max_turns: 达到最大轮次限制
 */
export type TerminalTransition =
  | { type: 'completed'; reason: string }
  | { type: 'aborted'; reason: string }
  | { type: 'model_error'; error: Error }
  | { type: 'max_turns'; maxTurns: number };

/** Hook 阻止错误（Stop Hook 返回但允许继续） */
export interface HookBlockingError {
  readonly hookName: string;
  readonly message: string;
  readonly exitCode?: number;
}

/**
 * 继续过渡类型 — 扩展为多种溢出恢复路径
 *
 * 参考 Claude Code query.ts 的 7 种 Continue reason:
 *
 * - next_turn: 正常下一轮
 * - reactive_compact_retry: API 413 → 紧急压缩 → 重试
 * - max_output_tokens_escalate: 输出 token 耗尽 → 提升上限 → 重试
 * - max_output_tokens_recovery: 输出 token 耗尽 → 注入 recovery message → 继续
 * - collapse_drain_retry: 增量折叠后排空溢出消息重试
 * - stop_hook_blocking: Stop Hook 返回 blockingErrors 但不阻止继续
 * - token_budget_continuation: Token 预算未耗尽，注入 nudge 续写
 */
export type ContinueTransition =
  | { type: 'next_turn' }
  | { type: 'reactive_compact_retry'; compressedMessages: readonly AgentMessage[] }
  | { type: 'max_output_tokens_escalate'; escalatedLimit: number }
  | { type: 'max_output_tokens_recovery'; recoveryMessage: AgentMessage }
  | { type: 'collapse_drain_retry'; foldedMessages: readonly AgentMessage[]; boundaryUuid: string }
  | { type: 'stop_hook_blocking'; blockingErrors: readonly HookBlockingError[] }
  | { type: 'token_budget_continuation'; nudgeMessage: AgentMessage; budgetUsage: number }
  | { type: 'structured_output_retry'; retryCount: number; nudgeMessage: AgentMessage };

/** 循环过渡类型（由 PostProcessPhase 设置，决定循环行为） */
export type LoopTransition = TerminalTransition | ContinueTransition;

/** Agent 循环状态（每轮循环的事实来源） */
export interface AgentState {
  /** 会话 ID */
  readonly sessionId: string;
  /** 当前轮次计数 */
  readonly turnCount: number;
  /** 消息历史 */
  readonly messages: readonly AgentMessage[];
  /** 工具使用上下文 */
  readonly toolUseContext: AgentToolUseContext;
  /** 状态过渡（由 PostProcessPhase/RecoveryPhase 设置） */
  transition: LoopTransition;
}

/** 判断过渡是否为终止类型 */
export function isTerminal(transition: LoopTransition): transition is TerminalTransition {
  return (
    transition.type !== 'next_turn' &&
    transition.type !== 'reactive_compact_retry' &&
    transition.type !== 'max_output_tokens_escalate' &&
    transition.type !== 'max_output_tokens_recovery' &&
    transition.type !== 'collapse_drain_retry' &&
    transition.type !== 'stop_hook_blocking' &&
    transition.type !== 'token_budget_continuation' &&
    transition.type !== 'structured_output_retry'
  );
}
