/** Hook 生命周期核心类型定义 */

/** Hook 事件类型 — 工具执行 + 生命周期 + 用户交互 + 通知 + 对话压缩 */
export type HookEvent =
  // 工具执行
  | 'PreToolUse' // 工具执行前
  | 'PostToolUse' // 工具执行后（成功）
  | 'PostToolUseFailure' // 工具执行后（失败）
  // 生命周期
  | 'Stop' // 对话循环正常结束
  | 'StopFailure' // 对话循环异常终止
  | 'SessionStart' // 循环开始
  | 'SessionEnd' // 循环结束（正常+异常）
  // 用户交互
  | 'UserPromptSubmit' // 用户消息提交前
  // 通知
  | 'Notification' // 模型通知输出
  // 对话压缩
  | 'PreCompact' // 压缩前拦截
  | 'PostCompact'; // 压缩后通知

/** Hook 执行方式类型 */
export type HookType = 'command' | 'prompt' | 'http' | 'agent';

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
  /** 执行方式（默认回调=handler） */
  readonly type?: HookType;
  /** 处理回调 */
  readonly handler: HookHandler<TInput, TOutput>;
  /** 执行超时（ms），默认 DEFAULT_HOOK_TIMEOUT */
  readonly timeout?: number;
  /** 执行一次后自动移除 */
  readonly once?: boolean;
  /** 后台执行模式（不阻塞循环） */
  readonly async?: boolean;
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

  // ——— 生命周期事件专有字段 ———

  /** 修改后的用户消息（UserPromptSubmit 可修改消息） */
  readonly updatedUserMessage?: string;
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
  /** 修改后的用户消息（取最后一个 updatedUserMessage） */
  readonly updatedUserMessage?: string;
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
  readonly toolRegistry: import('@suga/ai-tool-core').ToolRegistry;
  /** 阶段间共享数据通道 */
  readonly meta: Record<string, unknown>;
}

/** Stop Hook 阻止错误（返回 blocking 但不阻止继续循环） */
export interface HookBlockingError {
  readonly hookName: string;
  readonly message: string;
  readonly exitCode?: number;
}
