/** 权限类型定义（Permission Types） 工具执行权限相关类型 */

import type { PermissionDecisionReason } from './permission-decision';

/**
 * 权限决策来源 — 标记决策是从哪个系统产生的
 *
 * 参考 Claude Code 的 resolveHookPermissionDecision:
 *
 * - rule: 规则引擎（settings.json 中的权限规则）
 * - hook: PreToolUse hook 产生的决策
 * - mode: PermissionMode 产生的决策（auto/restricted/plan/acceptEdits）
 * - classifier: Bash Classifier 自动分类产生的决策
 * - user: 用户交互式审批产生的决策
 * - flag: CLI flag 产生的决策（--dangerously-skip-permissions 等）
 * - default: 工具默认权限检查产生的决策
 */
export type PermissionDecisionSource =
  | 'rule'
  | 'hook'
  | 'mode'
  | 'classifier'
  | 'user'
  | 'flag'
  | 'default';

/** 权限模式 — 从 permission-mode.ts re-export，6种模式 */
export type { PermissionMode } from './permission-mode';

/**
 * 安全标签（用于标记工具的安全级别）
 *
 * - readonly: 只读操作，无副作用
 * - destructive: 破坏性操作（删除、覆盖等）
 * - network: 网络请求操作
 * - database: 数据库操作
 * - system: 系统级操作（最保守默认值）
 */
export type SafetyLabel = 'readonly' | 'destructive' | 'network' | 'database' | 'system';

/** 权限允许 */
export interface PermissionAllow {
  behavior: 'allow';
  /** 允许执行后的修正输入（可选，权限检查可以修正参数） */
  updatedInput?: unknown;
  /** 决策来源 */
  decisionSource?: PermissionDecisionSource;
  /** 决策原因（自由文本，向后兼容） */
  decisionReason?: string;
  /** 结构化决策原因（精确标记，用于新管线） */
  structuredReason?: PermissionDecisionReason;
  /** P16F: 权限更新操作（用户选择"永久允许"时，宿主应应用此更新） */
  permissionUpdate?: import('./permission-context').PermissionUpdate;
  /** P16F: 用户反馈文本（可选） */
  feedback?: string;
}

/** 权限拒绝 */
export interface PermissionDeny {
  behavior: 'deny';
  /** 拒绝消息（面向用户） */
  message: string;
  /** 拒绝原因（面向开发者，用于调试和日志） */
  reason?: string;
  /** 决策来源 */
  decisionSource?: PermissionDecisionSource;
  /** 决策原因（自由文本，向后兼容） */
  decisionReason?: string;
  /** 结构化决策原因（精确标记，用于新管线） */
  structuredReason?: PermissionDecisionReason;
  /** P16F: 用户反馈文本（可选，用户拒绝时附加的原因说明） */
  feedback?: string;
}

/** 权限询问（需要用户确认，由调用方决策） */
export interface PermissionAsk {
  behavior: 'ask';
  /** 询问消息（面向用户） */
  message: string;
  /** 决策来源 */
  decisionSource?: PermissionDecisionSource;
  /** 决策原因（自由文本，向后兼容） */
  decisionReason?: string;
  /** 结构化决策原因（精确标记，用于新管线） */
  structuredReason?: PermissionDecisionReason;
  /** P41: bypass-immune 标记 — 即使在 bypass/auto 模式下也必须用户交互 */
  requiresUserInteraction?: boolean;
  /** 宿主自定义元数据（如 sed 拦截时的 sedEditInfo） */
  metadata?: Record<string, unknown>;
}

/**
 * 权限透传 — PreToolUse hook 不做权限决策，交由规则引擎
 *
 * 参考 Claude Code 的 passthrough 行为: hook 未指定 permissionBehavior 时，不干预权限流程， 正常走 checkPermissions
 * 规则引擎。
 */
export interface PermissionPassthrough {
  behavior: 'passthrough';
  /** 决策来源（通常是 'hook'） */
  decisionSource?: PermissionDecisionSource;
  /** 结构化决策原因（精确标记，用于新管线） */
  structuredReason?: PermissionDecisionReason;
}

/** 权限结果（判别联合类型，基于 behavior 字段判别） */
export type PermissionResult =
  | PermissionAllow
  | PermissionDeny
  | PermissionAsk
  | PermissionPassthrough;

/**
 * Hook 权限决策 — PreToolUse hook 产生的权限决策信息
 *
 * 从 ToolUseContext.meta 中读取（由 P4 HookBeforeToolPhase 写入）， ToolExecutor 在 permissionPhase
 * 中合并此决策与规则引擎决策。
 *
 * 优先级规则（与 Claude Code 一致）: hook deny > settings deny > settings ask > hook allow > settings allow
 */
export interface HookPermissionDecision {
  /** Hook 的权限行为（deny/allow/ask/passthrough） */
  readonly permissionBehavior?: 'allow' | 'deny' | 'ask' | 'passthrough';
  /** Hook 修改后的工具输入 */
  readonly updatedInput?: Record<string, unknown>;
  /** Hook 是否阻止继续 */
  readonly preventContinuation?: boolean;
  /** Hook 阻止原因 */
  readonly stopReason?: string;
}
