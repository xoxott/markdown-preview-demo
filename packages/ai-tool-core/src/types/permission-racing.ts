/**
 * 权限竞争架构类型定义（Permission Racing Types）
 *
 * 参考 Claude Code 的 useCanUseTool + interactiveHandler:
 *
 * 5-path 原子竞争架构 — 多个 racer 通过 claim() 争抢唯一 resolve 权:
 *
 * - local dialog (用户本地交互)
 * - bridge callback (CCR / claude.ai Web UI)
 * - channel callback (Telegram/iMessage 等外部渠道)
 * - hooks/classifier (异步后台自动检查)
 * - speculative classifier (2秒竞速窗口)
 *
 * 核心原语: createResolveOnce — claim()/isResolved()/resolve() 三方法， 两个布尔标志(claimed + delivered) 防止双重
 * resolve。
 */

import type { PermissionResult } from './permission';
import type { DenialTrackingState, PermissionDecisionReason } from './permission-decision';
import type { PermissionPromptRequest, PermissionPromptResponse } from './permission-prompt';
import type { PermissionUpdate, ToolPermissionContext } from './permission-context';
import type { PermissionMode } from './permission-mode';
import type { ClassifierResult } from './permission-classifier';
import type { AnyBuiltTool } from './registry';
import type { ToolUseContext } from './context';

// ============================================================
// 原子竞争原语 — createResolveOnce
// ============================================================

/**
 * ResolveOnce — 原子竞争守卫
 *
 * 参考 Claude Code 的 createResolveOnce:
 *
 * - resolve(value): 交付决策值（仅第一次生效，delivered 标志防止双重 resolve）
 * - isResolved(): 只读检查，用于 skip-early 快速跳过
 * - claim(): 原子 check-and-mark，用于异步回调在 await 前抢占
 *
 * 两个布尔标志的设计意图:
 *
 * - claim() 在 await 前调用，关闭 isResolved() 检查与 resolve() 之间的竞争窗口
 * - resolve() 检查 delivered 标志作为第二层防护
 * - 分离使得 claim() 赢的 racer 可以安全地延迟调用 resolve()
 *
 * 使用模式:
 *
 * ```ts
 * if (!claim()) return; // 原子抢占 — 其他 racer 已赢
 * resolveOnce(decision); // 安全交付 — guaranteed only-once
 * ```
 */
export interface ResolveOnce<T> {
  /** 交付决策值（仅第一次生效） */
  resolve(value: T): void;
  /** 只读检查: 是否已有 racer 赢得竞争 */
  isResolved(): boolean;
  /** 原子抢占: 如果尚未被其他 racer 抢占，标记为 claimed 并返回 true */
  claim(): boolean;
}

// ============================================================
// Bridge/Channel 权限回调接口
// ============================================================

/**
 * Bridge 权限回调 — CCR / claude.ai Web UI 权限交互接口
 *
 * 参考 Claude Code 的 replBridgePermissionCallbacks:
 *
 * Web Session Server 中的 PermissionBridge 提供此接口， 用于浏览器权限对话框与 agent 端竞争。
 *
 * bridge 模式下，权限请求通过 WebSocket 发送到浏览器， 浏览器渲染权限对话框，用户选择后返回响应。
 */
export interface BridgePermissionCallbacks {
  /** 发送权限请求到 bridge */
  sendRequest(requestId: string, request: PermissionPromptRequest): void;
  /** 取消已发送的权限请求 */
  cancelRequest(requestId: string): void;
  /** 注册响应回调 — 当 bridge 返回用户决策时调用 */
  onResponse(requestId: string, callback: (response: PermissionPromptResponse) => void): () => void; // 返回 unsubscribe 函数
}

/**
 * Channel 权限回调 — Telegram/iMessage 等外部渠道
 *
 * 参考 Claude Code 的 channelPermissionCallbacks:
 *
 * 外部通知渠道（如 Telegram bot、iMessage 等）可以接收权限请求通知， 用户在手机/其他设备上批准后，响应通过 channel 回调返回。
 *
 * guard: requiresUserInteraction — 标记 bypass-immune 的工具 （如 ExitPlanMode/AskUserQuestion）跳过
 * channel，因为 channel 只支持 yes/no 简单决策，不支持结构化用户输入。
 */
export interface ChannelPermissionCallbacks {
  /** 发送权限请求通知到所有 channel 客户端 */
  sendNotification(requestId: string, request: PermissionPromptRequest): void;
  /** 注册响应回调 — 当 channel 返回用户决策时调用 */
  onResponse(
    requestId: string,
    callback: (response: ChannelPermissionResponse) => void
  ): () => void; // 返回 unsubscribe 函数
}

/**
 * Channel 权限响应 — 来自外部渠道的用户决策
 *
 * 与 PermissionPromptResponse 不同，channel 响应更简单: 只有 approve/deny，不支持持久化选项和反馈文本。
 */
export interface ChannelPermissionResponse {
  /** 决策行为 */
  readonly behavior: 'approve' | 'deny';
  /** 来源服务器标识 */
  readonly fromServer?: string;
  /** 用户反馈（可选） */
  readonly feedback?: string;
}

// ============================================================
// PermissionQueueOps — UI 解耦的队列操作接口
// ============================================================

/**
 * 权限队列操作 — 与 UI 框架解耦的队列接口
 *
 * 参考 Claude Code 的 PermissionQueueOps:
 *
 * React 版: push/remove/update 通过 setState dispatch 实现 Web 版: push/remove/update 通过 PermissionBridge
 * WebSocket 实现 CLI 版: push/remove/update 通过 Ink 组件 state 实现
 *
 * 每个 racer 获胜后的清理协议:
 *
 * 1. claim() — 原子抢占
 * 2. cancelRequest(bridgeRequestId) — 取消 bridge 请求
 * 3. channelUnsubscribe() — 取消 channel 订阅
 * 4. removeFromQueue() — 从 UI 队列移除
 * 5. resolveOnce(decision) — 交付决策
 */
export interface PermissionQueueOps {
  /** 将权限确认条目推入 UI 队列 */
  push(item: PermissionQueueItem): void;
  /** 从 UI 队列移除条目 */
  remove(toolUseID: string): void;
  /** 更新队列中的条目（部分更新） */
  update(toolUseID: string, patch: Partial<PermissionQueueItem>): void;
}

/**
 * 权限队列条目 — UI 队列中等待用户确认的权限请求
 *
 * 参考 Claude Code 的 ToolUseConfirm:
 *
 * 每个条目携带 5 个 racer 的回调:
 *
 * - onAllow: 用户批准 → claim() + resolveOnce(allow)
 * - onReject: 用户拒绝 → claim() + resolveOnce(deny)
 * - onAbort: 用户中断 → claim() + resolveOnce(cancel)
 * - recheckPermission: 重新检查 → claim() + resolveOnce(result)
 * - onUserInteraction: 用户开始交互 → 标记 userInteracted = true
 */
export interface PermissionQueueItem {
  /** 工具使用唯一 ID */
  readonly toolUseID: string;
  /** 目标工具 */
  readonly tool: AnyBuiltTool;
  /** 工具输入参数 */
  readonly input: Record<string, unknown>;
  /** 权限上下文 */
  readonly permCtx: ToolPermissionContext;
  /** 用户批准回调 — claim() + resolveOnce */
  readonly onAllow: (
    updatedInput?: Record<string, unknown>,
    permissionUpdates?: PermissionUpdate,
    feedback?: string
  ) => void;
  /** 用户拒绝回调 — claim() + resolveOnce */
  readonly onReject: (feedback?: string) => void;
  /** 用户中断回调 — claim() + resolveOnce */
  readonly onAbort: () => void;
  /** 重新检查权限 — claim() + resolveOnce */
  readonly recheckPermission: () => void;
  /** 用户开始交互标记 → 设置 userInteracted = true */
  readonly onUserInteraction: () => void;
  /** 询问消息 */
  readonly message: string;
  /** 分类器建议（可选） */
  readonly classifierSuggestion?: ClassifierResult;
  /** 决策原因 */
  readonly reason: PermissionDecisionReason;
}

// ============================================================
// 竞争参数类型
// ============================================================

/**
 * 竞争解析参数 — interactive handler 的完整输入
 *
 * 参考 Claude Code 的 InteractivePermissionParams:
 *
 * 组合 PermissionContextFactory + bridge/channel callbacks + awaitAutomatedChecksBeforeDialog 标记。
 */
export interface InteractivePermissionParams {
  /** 权限上下文工厂 */
  readonly ctx: PermissionContextMethods;
  /** 询问描述消息 */
  readonly description: string;
  /** 管线返回的 ask 结果 */
  readonly result: PermissionResult & { behavior: 'ask' };
  /** 是否在显示对话框前先运行自动检查 */
  readonly awaitAutomatedChecksBeforeDialog?: boolean;
  /** Bridge 权限回调（可选，Web 模式注入） */
  readonly bridgeCallbacks?: BridgePermissionCallbacks;
  /** Channel 权限回调（可选，外部渠道注入） */
  readonly channelCallbacks?: ChannelPermissionCallbacks;
}

/**
 * Coordinator 权限参数 — 后台 worker 顺序自动检查
 *
 * 参考 Claude Code 的 handleCoordinatorPermission:
 *
 * coordinator worker 在显示对话框前先运行 hooks + classifier 顺序检查。 如果任一自动解决，不需要对话框。
 */
export interface CoordinatorPermissionParams {
  /** 权限上下文工厂 */
  readonly ctx: PermissionContextMethods;
  /** 管线返回的 ask 结果 */
  readonly result: PermissionResult & { behavior: 'ask' };
}

/**
 * Swarm worker 权限参数 — mailbox 转发到 leader
 *
 * 参考 Claude Code 的 handleSwarmWorkerPermission:
 *
 * swarm worker 尝试 classifier 自动批准， 失败后通过 mailbox 转发权限请求到 leader agent。
 */
export interface SwarmWorkerPermissionParams {
  /** 权限上下文工厂 */
  readonly ctx: PermissionContextMethods;
  /** 管线返回的 ask 结果 */
  readonly result: PermissionResult & { behavior: 'ask' };
  /** 工具使用唯一 ID */
  readonly toolUseID: string;
}

// ============================================================
// PermissionContextMethods — 冻结上下文的方法集合
// ============================================================

/**
 * 权限上下文方法 — createPermissionContext 返回的冻结上下文对象
 *
 * 参考 Claude Code 的 PermissionContext (Object.freeze):
 *
 * 包含所有权限决策辅助方法，由 createPermissionContext() 工厂创建， 返回 Object.freeze(ctx) — 不可变，所有 racer 共享同一上下文。
 *
 * 方法分类:
 *
 * - 快速路径: resolveIfAborted, cancelAndAbort, buildAllow, buildDeny
 * - 用户交互: handleUserAllow, handleHookAllow
 * - 自动检查: runHooks, tryClassifier
 * - 队列操作: pushToQueue, removeFromQueue, updateQueueItem
 * - 持久化: persistPermissions
 * - 日志: logDecision, logCancelled
 */
export interface PermissionContextMethods {
  /** 工具名称 */
  readonly toolName: string;
  /** 工具输入参数 */
  readonly input: Record<string, unknown>;
  /** 权限上下文容器 */
  readonly permCtx: ToolPermissionContext;
  /** 工具使用唯一 ID */
  readonly toolUseID: string;
  /** AbortController signal（可选） */
  readonly signal?: AbortSignal;

  // === 快速路径方法 ===

  /** 如果 abort 已触发，立即 resolve 并返回 true */
  resolveIfAborted(resolve: (value: PermissionResult) => void): boolean;

  /** 构建 cancel+abort 决策（deny + 中断标记） */
  cancelAndAbort(feedback?: string, isAbort?: boolean): PermissionResult;

  /** 构建 allow 决策 */
  buildAllow(
    updatedInput?: Record<string, unknown>,
    opts?: { decisionReason?: PermissionDecisionReason }
  ): PermissionResult;

  /** 构建 deny 决策 */
  buildDeny(message: string, decisionReason: PermissionDecisionReason): PermissionResult;

  // === 用户交互方法 ===

  /** 处理用户批准 → 持久化 + 日志 + 返回 allow */
  handleUserAllow(
    updatedInput?: Record<string, unknown>,
    permissionUpdates?: PermissionUpdate,
    feedback?: string
  ): PermissionResult;

  /** 处理 hook 允许 → 持久化 + 日志 + 返回 allow */
  handleHookAllow(
    updatedInput?: Record<string, unknown>,
    permissionUpdates?: PermissionUpdate,
    hookName?: string
  ): PermissionResult;

  // === 自动检查方法 ===

  /** 运行 PreToolUse hooks（异步后台） → 返回 hook 决策或 null */
  runHooks(
    permissionMode: PermissionMode,
    suggestions?: string[],
    updatedInput?: Record<string, unknown>,
    startTime?: number
  ): Promise<PermissionResult | null>;

  /** 尝试 classifier 自动批准（异步） → 返回 classifier 结果 */
  tryClassifier(
    pendingClassifierCheck?: ClassifierResult,
    updatedInput?: Record<string, unknown>
  ): Promise<PermissionResult | null>;

  // === 队列操作 ===

  /** 推入权限确认条目到 UI 队列 */
  pushToQueue(item: PermissionQueueItem): void;

  /** 从 UI 队列移除当前条目 */
  removeFromQueue(): void;

  /** 更新队列中的条目（部分更新） */
  updateQueueItem(patch: Partial<PermissionQueueItem>): void;

  // === 持久化 ===

  /** 持久化权限更新（应用到 ToolPermissionContext） */
  persistPermissions(updates: PermissionUpdate | undefined): void;

  // === 日志 ===

  /** 记录权限决策日志 */
  logDecision(args: {
    behavior: PermissionResult['behavior'];
    decisionSource?: string;
    decisionReason?: PermissionDecisionReason;
    message?: string;
  }): void;

  /** 记录取消日志 */
  logCancelled(): void;
}

// ============================================================
// CanUseToolFnV3 — 增强版支持原子竞争
// ============================================================

/**
 * CanUseToolFnV3 — 增强版用户确认函数（支持原子竞争 + bridge/channel）
 *
 * 参考 Claude Code 的 useCanUseTool:
 *
 * 返回完整 PermissionResult（而非 boolean），支持:
 *
 * - forceDecision: 立即绕过所有检查
 * - bridge/channel callbacks: Web/外部渠道竞争
 * - abort signal: 中断权限请求
 * - queue ops: UI 队列管理
 *
 * 完整决策路径（从高到低优先级）:
 *
 * 1. abort check → 立即 cancel
 * 2. forceDecision → 立即返回（绕过所有）
 * 3. config allow/deny → hasPermissionsToUseTool 快速路径
 * 4. coordinator automated → hooks + classifier 顺序
 * 5. swarm worker → classifier + mailbox转发
 * 6. speculative classifier → 2秒竞速窗口
 * 7. interactive 5-racer → local/bridge/channel/hooks/classifier 竞争
 */
export type CanUseToolFnV3<Input extends Record<string, unknown> = Record<string, unknown>> = (
  tool: AnyBuiltTool,
  input: Input,
  toolUseContext: ToolUseContext,
  permCtx: ToolPermissionContext,
  toolUseID: string,
  opts?: CanUseToolFnV3Options
) => Promise<PermissionResult>;

/** CanUseToolFnV3 选项 — 额外参数 */
export interface CanUseToolFnV3Options {
  /** 强制决策 — 立即返回，绕过所有检查 */
  forceDecision?: PermissionResult;
  /** Bridge 权限回调（Web 模式注入） */
  bridgeCallbacks?: BridgePermissionCallbacks;
  /** Channel 权限回调（外部渠道注入） */
  channelCallbacks?: ChannelPermissionCallbacks;
  /** UI 队列操作（React/Web/CLI 注入） */
  queueOps?: PermissionQueueOps;
  /** 中断信号 */
  signal?: AbortSignal;
  /** 拒绝追踪状态 */
  denialTracking?: DenialTrackingState;
  /** 是否在显示对话框前先运行自动检查 */
  awaitAutomatedChecksBeforeDialog?: boolean;
  /** Swarm Worker Mailbox 操作（可选，swarm 模式注入） */
  swarmWorkerMailbox?: import('./swarm-worker-mailbox').SwarmWorkerMailboxOps;
  /** Swarm Worker ID（可选，标识当前 worker） */
  swarmWorkerId?: string;
  /** Swarm Worker 名称（可选） */
  swarmWorkerName?: string;
  /** Swarm Leader 名称（可选，标识目标 leader） */
  swarmLeaderName?: string;
}
