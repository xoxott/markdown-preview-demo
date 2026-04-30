/** Hook 生命周期核心类型定义 */

/** Hook 事件类型 — 先实现 4 种核心事件，后续迭代增加 */
export type HookEvent =
  | 'PreToolUse'          // 工具执行前
  | 'PostToolUse'         // 工具执行后（成功）
  | 'PostToolUseFailure'  // 工具执行后（失败）
  | 'Stop';               // 对话循环结束

/** Hook 执行结果状态 */
export type HookOutcome = 'success' | 'blocking' | 'non_blocking_error' | 'cancelled';

/** 权限行为类型 — 聚合优先级: deny > ask > allow > passthrough */
export type PermissionBehavior = 'allow' | 'deny' | 'ask' | 'passthrough';

/** Hook 处理器函数签名 */
export type HookHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: HookExecutionContext
) => Promise<HookResult<TOutput>>;

/** Hook 注册定义 */
export interface HookDefinition<TInput = unknown, TOutput = unknown> {
  /** 唯一名称标识 */
  readonly name: string;
  /** 触发事件类型 */
  readonly event: HookEvent;
  /** 工具名称匹配模式（如 "Bash"、"Write"），不设则匹配所有 */
  readonly matcher?: string;
  /** 处理回调 */
  readonly handler: HookHandler<TInput, TOutput>;
  /** 执行超时（ms），默认 DEFAULT_HOOK_TIMEOUT */
  readonly timeout?: number;
  /** 执行一次后自动移除 */
  readonly once?: boolean;
}

/** Hook 单次执行结果 */
export interface HookResult<T = unknown> {
  /** 执行状态 */
  readonly outcome: HookOutcome;
  /** 成功时的数据 */
  readonly data?: T;
  /** 失败时的错误信息 */
  readonly error?: string;
  /** 是否阻止后续流程 */
  readonly preventContinuation?: boolean;
  /** 阻止原因 */
  readonly stopReason?: string;

  // ——— PreToolUse 专有字段 ———

  /** 权限决策行为 */
  readonly permissionBehavior?: PermissionBehavior;
  /** 权限决策原因 */
  readonly permissionDecisionReason?: string;
  /** 修改后的工具输入（PreToolUse 可修改输入） */
  readonly updatedInput?: Record<string, unknown>;
  /** 附加上下文信息 */
  readonly additionalContext?: string;

  // ——— PostToolUse 专有字段 ———

  /** 修改后的工具输出（PostToolUse 可修改输出） */
  readonly updatedOutput?: unknown;
}

/** 聚合结果状态 */
export type AggregatedOutcome = 'success' | 'blocking' | 'mixed';

/** 多 Hook 聚合结果 — deny > ask > allow > passthrough 优先级 */
export interface AggregatedHookResult {
  /** 聚合执行状态 */
  readonly outcome: AggregatedOutcome;
  /** 是否阻止后续流程 */
  readonly preventContinuation: boolean;
  /** 聚合权限行为 */
  readonly permissionBehavior?: PermissionBehavior;
  /** 修改后的工具输入（取最后一个 updatedInput） */
  readonly updatedInput?: Record<string, unknown>;
  /** 修改后的工具输出（取最后一个 updatedOutput） */
  readonly updatedOutput?: unknown;
  /** 所有 additionalContext 汇集 */
  readonly additionalContexts: string[];
  /** 阻止原因 */
  readonly stopReason?: string;
  /** 所有非阻断错误信息 */
  readonly errors: string[];
}

/** Hook 运行时上下文 — 传递给每个 HookHandler */
export interface HookExecutionContext {
  /** 当前会话 ID */
  readonly sessionId: string;
  /** 中断信号（级联 timeout + 外部 abort） */
  readonly abortSignal: AbortSignal;
  /** 工具注册表（hook 可查找/调用其他工具） */
  readonly toolRegistry: ToolRegistry;
  /** 阶段间共享数据通道 */
  readonly meta: Record<string, unknown>;
}

// 前置导入（运行时通过 @suga/ai-tool-core 获取）
import type { ToolRegistry } from '@suga/ai-tool-core';