/**
 * PermissionContextFactory — 权限竞争架构的冻结上下文工厂
 *
 * 参考 Claude Code 的 createPermissionContext (PermissionContext.ts):
 *
 * 工厂函数创建一个冻结的上下文对象(Object.freeze)，所有 racer 共享同一上下文。 上下文包含权限决策辅助方法，每个 racer 通过 claim() 原子抢占后
 * 使用这些方法构建和交付决策值。
 *
 * 工厂参数:
 *
 * - tool/input/permCtx/toolUseID: 基本权限请求信息
 * - signal: AbortController signal（中断检测）
 * - queueOps: UI 队列操作（与 React/Web/CLI 解耦）
 * - classifierFn: AI 分类器（可选）
 * - hookRunner: PreToolUse hook 运行器（可选）
 * - persistFn: 权限持久化回调（可选）
 * - logFn: 权限日志回调（可选）
 */

import type { PermissionResult } from '../types/permission';
import type { DenialTrackingState, PermissionDecisionReason } from '../types/permission-decision';
import type { PermissionUpdate, ToolPermissionContext } from '../types/permission-context';
import type { ClassifierResult, PermissionClassifier } from '../types/permission-classifier';
import type { PermissionMode } from '../types/permission-mode';
import type {
  PermissionContextMethods,
  PermissionQueueItem,
  PermissionQueueOps
} from '../types/permission-racing';
import { DEFAULT_DENIAL_TRACKING } from '../types/permission-decision';

/**
 * Hook 运行器接口 — PreToolUse hook 执行器
 *
 * 由宿主注入（ai-hooks 包的 HookRegistry）， createPermissionContext 不依赖具体 hook 实现。
 */
export interface HookRunner {
  /** 运行 PreToolUse hooks，返回 hook 决策 */
  runPermissionHooks(
    toolName: string,
    input: Record<string, unknown>,
    permissionMode: PermissionMode
  ): Promise<PermissionResult | null>;
}

/**
 * 权限持久化回调 — 将 PermissionUpdate 应用到 ToolPermissionContext
 *
 * 由宿主注入（React setState / Settings 6层合并 / Web PermissionBridge）， createPermissionContext 不依赖具体持久化实现。
 */
export type PersistPermissionFn = (update: PermissionUpdate | undefined) => void;

/**
 * 权限日志回调 — 记录权限决策日志
 *
 * 由宿主注入（ai-state / telemetry / analytics）， createPermissionContext 不依赖具体日志实现。
 */
export type LogPermissionFn = (args: {
  behavior: PermissionResult['behavior'];
  decisionSource?: string;
  decisionReason?: PermissionDecisionReason;
  message?: string;
}) => void;

/** createPermissionContext 工厂参数 */
export interface CreatePermissionContextParams {
  /** 目标工具名称 */
  readonly toolName: string;
  /** 工具输入参数 */
  readonly input: Record<string, unknown>;
  /** 权限上下文容器 */
  readonly permCtx: ToolPermissionContext;
  /** 工具使用唯一 ID */
  readonly toolUseID: string;
  /** AbortController signal（可选） */
  readonly signal?: AbortSignal;
  /** UI 队列操作（可选，与 React/Web/CLI 解耦） */
  readonly queueOps?: PermissionQueueOps;
  /** AI 分类器（可选） */
  readonly classifierFn?: PermissionClassifier;
  /** 拒绝追踪状态（可选） */
  readonly denialTracking?: DenialTrackingState;
  /** Hook 运行器（可选） */
  readonly hookRunner?: HookRunner;
  /** 权限持久化回调（可选） */
  readonly persistFn?: PersistPermissionFn;
  /** 权限日志回调（可选） */
  readonly logFn?: LogPermissionFn;
}

/**
 * createPermissionContext — 创建冻结的权限竞争上下文
 *
 * 返回 Object.freeze(ctx) — 所有 racer 共享同一不可变上下文对象。 方法通过闭包捕获工厂参数，保证 racer 间数据一致性。
 *
 * 使用示例:
 *
 * ```ts
 * const ctx = createPermissionContext({
 *   toolName: 'bash',
 *   input: { command: 'ls' },
 *   permCtx: toolPermCtx,
 *   toolUseID: 'tool_123',
 *   queueOps: createPermissionQueueOps(setQueue)
 * });
 *
 * // racer 使用 ctx 方法:
 * if (!claim()) return;
 * ctx.removeFromQueue();
 * resolveOnce(ctx.buildAllow(input));
 * ```
 */
export function createPermissionContext(
  params: CreatePermissionContextParams
): PermissionContextMethods {
  const {
    toolName,
    input,
    permCtx,
    toolUseID,
    signal,
    queueOps,
    classifierFn,
    denialTracking,
    hookRunner,
    persistFn,
    logFn
  } = params;

  const currentDenialTracking = denialTracking ?? DEFAULT_DENIAL_TRACKING;

  /** 辅助: 构建 cancel+abort 决策（独立函数，避免对象字面量内方法间引用问题） */
  function buildCancelAndAbort(feedback?: string, isAbort?: boolean): PermissionResult {
    const message = isAbort ? `用户中断了 "${toolName}" 的执行` : `用户拒绝了 "${toolName}" 的执行`;
    return {
      behavior: 'deny',
      message,
      reason: isAbort ? 'user_abort' : 'user_rejected',
      decisionSource: 'user',
      structuredReason: feedback ? 'requires_user_interaction_block' : 'mode_bypass',
      feedback
    };
  }

  const ctx: PermissionContextMethods = {
    // === 基本字段 ===
    toolName,
    input,
    permCtx,
    toolUseID,
    signal,

    // === 快速路径方法 ===

    /** 如果 abort 已触发，立即 resolve 并返回 true */
    resolveIfAborted(resolve: (value: PermissionResult) => void): boolean {
      if (signal?.aborted) {
        resolve(buildCancelAndAbort('Abort signal already fired', true));
        return true;
      }
      return false;
    },

    /** 构建 cancel+abort 决策（deny + 中断标记） */
    cancelAndAbort(feedback?: string, isAbort?: boolean): PermissionResult {
      return buildCancelAndAbort(feedback, isAbort);
    },

    /** 构建 allow 决策 */
    buildAllow(
      updatedInput?: Record<string, unknown>,
      opts?: { decisionReason?: PermissionDecisionReason }
    ): PermissionResult {
      return {
        behavior: 'allow',
        updatedInput: updatedInput ?? input,
        decisionSource: opts?.decisionReason ? 'classifier' : 'default',
        structuredReason: opts?.decisionReason ?? 'classifier_allow'
      };
    },

    /** 构建 deny 决策 */
    buildDeny(message: string, decisionReason: PermissionDecisionReason): PermissionResult {
      return {
        behavior: 'deny',
        message,
        decisionSource: 'classifier',
        structuredReason: decisionReason
      };
    },

    // === 用户交互方法 ===

    /** 处理用户批准 → 持久化 + 日志 + 返回 allow */
    handleUserAllow(
      updatedInput?: Record<string, unknown>,
      permissionUpdates?: PermissionUpdate,
      feedback?: string
    ): PermissionResult {
      persistFn?.(permissionUpdates);
      logFn?.({
        behavior: 'allow',
        decisionSource: 'user',
        decisionReason: 'ask_rule_match',
        message: `用户批准了 "${toolName}" 的执行`
      });

      return {
        behavior: 'allow',
        updatedInput: updatedInput ?? input,
        decisionSource: 'user',
        structuredReason: 'ask_rule_match',
        permissionUpdate: permissionUpdates,
        feedback
      };
    },

    /** 处理 hook 允许 → 持久化 + 日志 + 返回 allow */
    handleHookAllow(
      updatedInput?: Record<string, unknown>,
      permissionUpdates?: PermissionUpdate,
      hookName?: string
    ): PermissionResult {
      persistFn?.(permissionUpdates);
      logFn?.({
        behavior: 'allow',
        decisionSource: 'hook',
        decisionReason: 'hook_allow',
        message: `Hook "${hookName ?? 'unknown'}" 允许了 "${toolName}" 的执行`
      });

      return {
        behavior: 'allow',
        updatedInput: updatedInput ?? input,
        decisionSource: 'hook',
        structuredReason: 'hook_allow',
        permissionUpdate: permissionUpdates
      };
    },

    // === 自动检查方法 ===

    /** 运行 PreToolUse hooks → 返回 hook 决策或 null */
    async runHooks(
      permissionMode: PermissionMode,
      _suggestions?: string[],
      updatedInput?: Record<string, unknown>,
      _startTime?: number
    ): Promise<PermissionResult | null> {
      if (!hookRunner) return null;

      try {
        const hookResult = await hookRunner.runPermissionHooks(
          toolName,
          updatedInput ?? input,
          permissionMode
        );

        if (hookResult) {
          logFn?.({
            behavior: hookResult.behavior,
            decisionSource: 'hook',
            decisionReason: hookResult.structuredReason as PermissionDecisionReason,
            message: `Hook 对 "${toolName}" 的决策: ${hookResult.behavior}`
          });
        }

        return hookResult;
      } catch {
        // Hook 执行失败 → graceful degradation, 不阻断权限流程
        return null;
      }
    },

    /** 尝试 classifier 自动批准 → 返回 classifier 结果 */
    async tryClassifier(
      pendingClassifierCheck?: ClassifierResult,
      updatedInput?: Record<string, unknown>
    ): Promise<PermissionResult | null> {
      if (!classifierFn || !pendingClassifierCheck) return null;

      try {
        // 如果已有 pendingClassifierCheck（来自管线 Step 5），
        // 直接评估其结果
        const classifierResult = pendingClassifierCheck;

        if (classifierResult.unavailable) {
          // Iron Gate: 分类器不可用
          if (permCtx.ironGate?.failClosed) {
            return {
              behavior: 'deny',
              message: `分类器不可用，Iron Gate fail-closed 拒绝 "${toolName}"`,
              reason: classifierResult.reason,
              decisionSource: 'classifier',
              structuredReason: 'classifier_unavailable_deny'
            };
          }
          // fail-open: 继续到用户交互
          return null;
        }

        if (classifierResult.behavior === 'allow') {
          return {
            behavior: 'allow',
            updatedInput: updatedInput ?? input,
            decisionSource: 'classifier',
            structuredReason: 'classifier_allow'
          };
        }

        if (classifierResult.behavior === 'deny') {
          // denial limits 检查
          if (currentDenialTracking.shouldFallbackToPrompting) {
            // 强制回退到用户交互
            return null;
          }

          return {
            behavior: 'deny',
            message: `分类器拒绝了 "${toolName}": ${classifierResult.reason}`,
            reason: classifierResult.reason,
            decisionSource: 'classifier',
            structuredReason: 'classifier_deny'
          };
        }

        // classifier ask → 继续到用户交互
        return null;
      } catch {
        // Classifier 执行失败 → graceful degradation
        return null;
      }
    },

    // === 队列操作 ===

    /** 推入权限确认条目到 UI 队列 */
    pushToQueue(item: PermissionQueueItem): void {
      queueOps?.push(item);
    },

    /** 从 UI 队列移除当前条目 */
    removeFromQueue(): void {
      queueOps?.remove(toolUseID);
    },

    /** 更新队列中的条目（部分更新） */
    updateQueueItem(patch: Partial<PermissionQueueItem>): void {
      queueOps?.update(toolUseID, patch);
    },

    // === 持久化 ===

    /** 持久化权限更新 */
    persistPermissions(updates: PermissionUpdate | undefined): void {
      persistFn?.(updates);
    },

    // === 日志 ===

    /** 记录权限决策日志 */
    logDecision(args: {
      behavior: PermissionResult['behavior'];
      decisionSource?: string;
      decisionReason?: PermissionDecisionReason;
      message?: string;
    }): void {
      logFn?.(args);
    },

    /** 记录取消日志 */
    logCancelled(): void {
      logFn?.({
        behavior: 'deny',
        decisionSource: 'user',
        decisionReason: 'requires_user_interaction_block',
        message: `权限请求被取消 (toolUseID: ${toolUseID})`
      });
    }
  };

  return Object.freeze(ctx);
}
