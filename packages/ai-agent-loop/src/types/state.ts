/** Agent 状态与配置类型定义（Agent State Types） 循环状态机和过渡类型 */

import type { ToolRegistry } from '@suga/ai-tool-core';
import type { HookRegistry } from '@suga/ai-hooks';
import type { AgentToolUseContext } from '../context/ToolUseContext';
import type { AgentMessage } from './messages';
import type { LLMProvider } from './provider';
import type { ToolScheduler } from './scheduler';
import type { LoopPhase } from '../phase/LoopPhase';

/** Agent 配置 */
export interface AgentConfig {
  /** 最大循环轮次（默认 10） */
  readonly maxTurns?: number;
  /** LLM Provider 实例 */
  readonly provider: LLMProvider;
  /** 工具注册表（可选，不提供则跳过工具执行阶段） */
  readonly toolRegistry?: ToolRegistry;
  /** 工具调度器（可选，默认 ParallelScheduler） */
  readonly scheduler?: ToolScheduler;
  /** 工具执行超时时间（ms，默认 30000） */
  readonly toolTimeout?: number;
  /** Hook 注册表（可选，提供则在 Phase 链中插入 HookPhase） */
  readonly hookRegistry?: HookRegistry;
  /** 自定义Phase链（提供则跳过默认buildPhases） */
  readonly phases?: readonly LoopPhase[];
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

/** 继续过渡类型（循环继续） */
export type ContinueTransition = { type: 'next_turn' };

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
  /** 状态过渡（由 PostProcessPhase 设置） */
  transition: LoopTransition;
}

/** 判断过渡是否为终止类型 */
export function isTerminal(transition: LoopTransition): transition is TerminalTransition {
  return transition.type !== 'next_turn';
}
