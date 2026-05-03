/** 权限决策原因、拒绝追踪与用户确认接口（Permission Decision Types） */

import type { ToolPermissionContext } from './permission-context';
import type { HookPermissionDecision, PermissionResult } from './permission';
import type { ToolUseContext } from './context';
import type { AnyBuiltTool } from './registry';

/**
 * 结构化决策原因 — 20种权限决策的精确标记
 *
 * 参考 Claude Code 的 PermissionDecisionReason: 每种原因对应管线中的特定步骤，便于审计日志和调试。 P16B 新增 5 种 classifier
 * 相关原因。P41 新增 4 种安全检查原因。
 */
export type PermissionDecisionReason =
  | 'deny_rule_match' // 拒绝规则匹配
  | 'ask_rule_match' // 询问规则匹配
  | 'mode_restricted_non_readonly' // 受限模式拒绝非只读
  | 'mode_plan_disallowed' // 计划模式拒绝不允许的工具
  | 'mode_accept_edits_disallowed' // 接受编辑模式拒绝不允许的工具
  | 'mode_auto_approve_readonly' // 自动模式批准只读
  | 'mode_bypass' // 绕过模式
  | 'mode_dont_ask_converted_deny' // P41: dontAsk 模式将 ask 转为 deny
  | 'mode_dont_ask' // P41: dontAsk 模式标识
  | 'tool_check_permissions' // 工具自定义 checkPermissions
  | 'hook_deny' // PreToolUse hook deny
  | 'hook_allow' // PreToolUse hook allow
  | 'hook_ask' // PreToolUse hook ask
  | 'classifier_allow' // P16B: 分类器自动允许
  | 'classifier_deny' // P16B: 分类器拒绝
  | 'classifier_ask' // P16B: 分类器建议用户确认
  | 'classifier_unavailable_deny' // P16B: 分类器不可用 + Iron Gate fail-closed
  | 'classifier_unavailable_fallback' // P16B: 分类器不可用 + Iron Gate fail-open
  | 'safety_check_block' // P41: bypass-immune 安全检查阻止
  | 'requires_user_interaction_block' // P41: requiresUserInteraction bypass-immune
  | 'denial_limit_fallback' // P41: denial limits 强制回退到 prompting
  | 'headless_agent_deny' // P41: headless agent 自动 deny
  | 'swarm_worker_timeout_deny' // P48: swarm worker 权限超时 deny
  | 'swarm_worker_leader_approved' // P48: swarm worker Leader 批准
  | 'swarm_worker_leader_denied'; // P48: swarm worker Leader 拒绝

/**
 * 拒绝追踪状态 — 记录连续和总拒绝计数
 *
 * 参考 Claude Code 的 DenialTrackingState:
 *
 * - 连续拒绝达到 MAX_CONSECUTIVE_DENIALS → shouldFallbackToPrompting
 * - 总拒绝达到 MAX_TOTAL_DENIALS → shouldFallbackToPrompting
 *
 * 用于在用户反复拒绝时自动切换到更安全的交互模式。
 */
export interface DenialTrackingState {
  /** 连续拒绝计数（每次 allow 清零） */
  consecutiveDenials: number;
  /** 总拒绝计数（不清零） */
  totalDenials: number;
  /** 是否应该回退到提示模式 */
  shouldFallbackToPrompting: boolean;
}

/** 最大连续拒绝次数 — 达到此值触发回退 */
export const MAX_CONSECUTIVE_DENIALS = 3;

/** 最大总拒绝次数 — 达到此值触发回退 */
export const MAX_TOTAL_DENIALS = 20;

/** 默认拒绝追踪状态 */
export const DEFAULT_DENIAL_TRACKING: DenialTrackingState = {
  consecutiveDenials: 0,
  totalDenials: 0,
  shouldFallbackToPrompting: false
};

/**
 * 更新拒绝追踪状态 — 根据权限结果行为更新计数
 *
 * - deny → consecutive+1, total+1, 检查是否达到阈值
 * - allow → consecutive 清零
 * - ask/passthrough → 不改变计数
 *
 * @param state 当前追踪状态
 * @param behavior 权限结果的行为
 * @returns 新追踪状态
 */
export function updateDenialTracking(
  state: DenialTrackingState,
  behavior: PermissionResult['behavior']
): DenialTrackingState {
  if (behavior === 'deny') {
    const newConsecutive = state.consecutiveDenials + 1;
    const newTotal = state.totalDenials + 1;
    return {
      consecutiveDenials: newConsecutive,
      totalDenials: newTotal,
      shouldFallbackToPrompting:
        newConsecutive >= MAX_CONSECUTIVE_DENIALS || newTotal >= MAX_TOTAL_DENIALS
    };
  }

  if (behavior === 'allow') {
    return {
      ...state,
      consecutiveDenials: 0
    };
  }

  // ask / passthrough → 不改变计数
  return state;
}

/**
 * 用户确认函数 — 由宿主环境注入的交互式权限确认接口
 *
 * 当管线产生 behavior='ask' 时，调用此函数让用户决定是否允许执行。 宿主环境（如 CLI、IDE）实现此接口提供 UI 交互。
 *
 * @param toolName 工具名称
 * @param input 工具输入参数
 * @param reason 结构化决策原因
 * @param message 询问消息（可选）
 * @returns 用户是否允许执行
 */
export type CanUseToolFn = (
  toolName: string,
  input: unknown,
  reason: PermissionDecisionReason,
  message?: string
) => Promise<boolean>;

/**
 * 增强版用户确认函数 — 返回结构化 PermissionPromptResponse
 *
 * P16F: 扩展版 CanUseToolFn，返回完整的用户决策信息 （approve/deny + 持久化选项 + feedback），而非简单 boolean。
 *
 * 与 CanUseToolFn 向后兼容：宿主可逐步迁移。
 */
export type CanUseToolFnV2 = (
  toolName: string,
  input: unknown,
  reason: PermissionDecisionReason,
  message?: string
) => Promise<import('./permission-prompt').PermissionPromptResponse>;

/** 权限管线输入 — hasPermissionsToUseTool 的完整输入参数 */
export interface PermissionPipelineInput {
  /** 目标工具 */
  readonly tool: AnyBuiltTool;
  /** 工具输入参数 */
  readonly args: unknown;
  /** 工具使用上下文 */
  readonly context: ToolUseContext;
  /** 权限上下文容器 */
  readonly permCtx: ToolPermissionContext;
  /** PreToolUse Hook 决策（可选） */
  readonly hookDecision?: HookPermissionDecision;
  /** 用户确认函数（可选，宿主注入，向后兼容 boolean 版） */
  readonly canUseToolFn?: CanUseToolFn;
  /** P16F: 用户确认接口（可选，宿主注入，返回结构化响应） */
  readonly promptHandler?: import('./permission-prompt').PermissionPromptHandler;
  /** 拒绝追踪状态（可选） */
  readonly denialTracking?: DenialTrackingState;
  /** P41: 工具是否标记 requiresUserInteraction（bypass-immune） */
  readonly requiresUserInteraction?: boolean;
  /** P41: 是否为 headless agent（自动 deny ask） */
  readonly isHeadlessAgent?: boolean;
}
