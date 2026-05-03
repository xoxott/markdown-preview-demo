/**
 * permission-racing.ts — 5-path 原子竞争权限架构核心
 *
 * 参考 Claude Code 的 useCanUseTool + interactiveHandler:
 *
 * 当 hasPermissionsToUseTool 返回 behavior='ask' 时，不再顺序解析， 而是进入原子竞争层 — 5 个 racer 通过 claim() 争抢唯一
 * resolve 权。
 *
 * 完整决策路径（从高到低优先级）:
 *
 * 0. abort check → 立即 cancel (resolveIfAborted)
 * 1. forceDecision → 立即返回 (绕过所有)
 * 2. config allow → hasPermissionsToUseTool 返回 allow
 * 3. config deny → hasPermissionsToUseTool 返回 deny
 * 4. coordinator automated → hooks + classifier 顺序 (awaitAutomatedChecksBeforeDialog)
 * 5. swarm worker → classifier + mailbox转发
 * 6. speculative classifier → 2秒竞速窗口
 * 7. interactive 5-racer → local/bridge/channel/hooks/classifier 竞争
 */

import type { PermissionResult } from '../types/permission';
import type { PermissionPipelineInput } from '../types/permission-decision';
import type {
  BridgePermissionCallbacks,
  CanUseToolFnV3Options,
  CoordinatorPermissionParams,
  InteractivePermissionParams,
  PermissionContextMethods,
  PermissionQueueItem
} from '../types/permission-racing';
import type { AnyBuiltTool } from '../types/registry';
import type { PermissionUpdate, ToolPermissionContext } from '../types/permission-context';
import { hasPermissionsToUseTool } from '../permission-pipeline';
import { generatePromptRequestId } from '../types/permission-prompt';
import { createResolveOnce } from './createResolveOnce';
import { createPermissionContext } from './PermissionContextFactory';

/** canUseToolV3 入口参数 — 将6个独立参数合并为结构化对象，避免 max-params */
export interface CanUseToolV3Params {
  readonly tool: AnyBuiltTool;
  readonly input: Record<string, unknown>;
  readonly permCtx: ToolPermissionContext;
  readonly toolUseID: string;
  readonly opts?: CanUseToolFnV3Options;
}

/**
 * canUseToolV3 — 增强版用户确认函数（支持原子竞争）
 *
 * 参考 Claude Code 的 useCanUseTool:
 *
 * 组合 hasPermissionsToUseTool (配置级自动判定) + 原子竞争层 (5-path racing)。 返回 Promise<PermissionResult> — 决策只被
 * resolve 一次（claim() 保证）。
 */
export function canUseToolV3(params: CanUseToolV3Params): Promise<PermissionResult> {
  const { tool, input, permCtx, toolUseID, opts } = params;

  // 从 permCtx 中提取 ToolUseContext 的权限字段
  // （ToolUseContext 由宿主注入，这里只取权限相关字段）
  const toolUseContextFields = {
    promptHandler: opts?.queueOps ? undefined : undefined,
    canUseToolFn: opts?.queueOps ? undefined : undefined,
    requiresUserInteraction: opts?.queueOps ? undefined : undefined,
    isHeadlessAgent: opts?.queueOps ? undefined : undefined
  };

  const ctx = createPermissionContext({
    toolName: tool.name,
    input,
    permCtx,
    toolUseID,
    signal: opts?.signal,
    queueOps: opts?.queueOps,
    classifierFn: permCtx.classifierFn,
    denialTracking: opts?.denialTracking
  });

  return new Promise<PermissionResult>(resolve => {
    // === Path 0: abort check ===
    if (ctx.resolveIfAborted(resolve)) return;

    // === Path 1: forceDecision ===
    if (opts?.forceDecision !== undefined) {
      resolve(opts.forceDecision);
      return;
    }

    // === Path 2-3: config allow/deny ===
    // hasPermissionsToUseTool 是 async，作为第一个 racer
    // 如果返回 allow/deny → 立即 resolve；返回 ask → 进入竞争层
    const pipelineInput: PermissionPipelineInput = {
      tool,
      args: input,
      context: {
        ...toolUseContextFields,
        permCtx,
        denialTracking: opts?.denialTracking
      } as any,
      permCtx
    };

    // eslint-disable-next-line no-void
    void runPipelineAndEnterRacing({ pipelineInput, ctx, tool, opts, resolve });
  });
}

/** 内部: pipeline + racing 参数 */
interface PipelineRacingParams {
  readonly pipelineInput: PermissionPipelineInput;
  readonly ctx: PermissionContextMethods;
  readonly tool: AnyBuiltTool;
  readonly opts: CanUseToolFnV3Options | undefined;
  readonly resolve: (decision: PermissionResult) => void;
}

/** 内部: 运行 pipeline + 进入竞争层 */
async function runPipelineAndEnterRacing(params: PipelineRacingParams): Promise<void> {
  const { pipelineInput, ctx, tool, opts, resolve } = params;
  try {
    const pipelineResult = await hasPermissionsToUseTool(pipelineInput);

    // abort check (pipeline 可能耗时，再次检查)
    if (ctx.resolveIfAborted(resolve)) return;

    // config allow → 立即 resolve
    if (pipelineResult.behavior === 'allow') {
      resolve(pipelineResult);
      return;
    }

    // config deny → 立即 resolve
    if (pipelineResult.behavior === 'deny') {
      resolve(pipelineResult);
      return;
    }

    // behavior === 'ask' → 进入竞争层
    const askResult = pipelineResult as PermissionResult & { behavior: 'ask' };

    // === Path 4: coordinator automated ===
    if (opts?.awaitAutomatedChecksBeforeDialog) {
      // eslint-disable-next-line no-void
      void handleCoordinatorPermission({ ctx, result: askResult }).then(coordinatorDecision => {
        if (coordinatorDecision) {
          if (!ctx.resolveIfAborted(resolve)) {
            resolve(coordinatorDecision);
          }
        }
        // coordinator 无决策 → fall through to interactive
      });
    }

    // === Path 7: interactive 5-racer ===
    handleInteractivePermission(
      {
        ctx,
        description: askResult.message ?? `工具 "${tool.name}" 需要确认`,
        result: askResult,
        awaitAutomatedChecksBeforeDialog: opts?.awaitAutomatedChecksBeforeDialog,
        bridgeCallbacks: opts?.bridgeCallbacks,
        channelCallbacks: opts?.channelCallbacks
      },
      resolve
    );
  } catch (error) {
    // 任何错误 → cancel+abort（Promise 永不挂起）
    resolve(ctx.cancelAndAbort(error instanceof Error ? error.message : String(error), true));
  }
}

/**
 * handleInteractivePermission — 5-racer 并发竞争
 *
 * 参考 Claude Code 的 interactiveHandler.ts:
 *
 * 创建一个 ResolveOnce 守卫，5 个 racer 通过 claim() 争抢:
 *
 * - Racer 1: local dialog (用户本地交互 via PermissionQueueItem callbacks)
 * - Racer 2: bridge (CCR / claude.ai Web UI)
 * - Racer 3: channel (Telegram/iMessage 等外部渠道)
 * - Racer 4: hooks (PreToolUse 异步后台)
 * - Racer 5: classifier (AI 分类器异步后台)
 *
 * 此函数不返回值 — 它接受 resolve 函数并通过回调异步调用。 所有 racer 共享同一个 resolve 函数，通过 claim() 保证只有第一个 racer 能调用
 * resolveOnce。
 */
export function handleInteractivePermission(
  params: InteractivePermissionParams,
  resolve: (decision: PermissionResult) => void
): void {
  const { ctx, description, result, bridgeCallbacks, channelCallbacks } = params;

  // 创建原子竞争守卫
  const { resolve: resolveOnce, isResolved, claim } = createResolveOnce(resolve);

  // 用户交互标记 — classifier 在用户开始交互时应取消
  let userInteracted = false;

  // bridge/channel request IDs
  const bridgeRequestId = generatePromptRequestId();
  const channelRequestId = generatePromptRequestId();

  // channel unsubscribe 函数（延迟设置）
  let channelUnsubscribe: (() => void) | undefined;

  // === Racer 1: local dialog (PermissionQueueItem callbacks) ===

  const queueItem: PermissionQueueItem = {
    toolUseID: ctx.toolUseID,
    tool: { name: ctx.toolName } as AnyBuiltTool,
    input: ctx.input,
    permCtx: ctx.permCtx,
    message: description,
    reason: result.structuredReason ?? 'ask_rule_match',
    classifierSuggestion: undefined,

    onAllow(
      updatedInput?: Record<string, unknown>,
      permissionUpdates?: PermissionUpdate,
      feedback?: string
    ): void {
      if (!claim()) return;
      bridgeCallbacks?.cancelRequest(bridgeRequestId);
      channelUnsubscribe?.();
      ctx.removeFromQueue();
      resolveOnce(ctx.handleUserAllow(updatedInput, permissionUpdates, feedback));
    },

    onReject(feedback?: string): void {
      if (!claim()) return;
      bridgeCallbacks?.cancelRequest(bridgeRequestId);
      channelUnsubscribe?.();
      ctx.removeFromQueue();
      resolveOnce(ctx.cancelAndAbort(feedback));
    },

    onAbort(): void {
      if (!claim()) return;
      bridgeCallbacks?.cancelRequest(bridgeRequestId);
      channelUnsubscribe?.();
      ctx.removeFromQueue();
      ctx.logCancelled();
      resolveOnce(ctx.cancelAndAbort(undefined, true));
    },

    recheckPermission(): void {
      // 此方法需要重新检查权限（宿主可能已更新 permCtx）
      // 实际实现由宿主注入的 recheck 函数处理
    },

    onUserInteraction(): void {
      userInteracted = true;
      // classifier 在用户交互时应取消
    }
  };

  ctx.pushToQueue(queueItem);

  // === Racer 2: bridge (CCR / claude.ai Web UI) ===

  if (bridgeCallbacks) {
    bridgeCallbacks.sendRequest(bridgeRequestId, {
      requestId: bridgeRequestId,
      toolName: ctx.toolName,
      toolInput: ctx.input,
      reason: result.structuredReason ?? 'ask_rule_match',
      message: description,
      currentMode: ctx.permCtx.mode,
      classifierSuggestion:
        result.structuredReason === 'classifier_ask'
          ? { behavior: 'ask', reason: 'classifier suggested confirmation', confidence: 'low' }
          : undefined
    });

    const unsubscribe = bridgeCallbacks.onResponse(bridgeRequestId, response => {
      if (!claim()) return;
      ctx.removeFromQueue();
      channelUnsubscribe?.();

      if (response.behavior === 'approve') {
        resolveOnce(ctx.buildAllow(ctx.input));
      } else {
        resolveOnce(ctx.cancelAndAbort(response.feedback));
      }
    });

    // abort 时清理 bridge
    if (ctx.signal) {
      ctx.signal.addEventListener(
        'abort',
        () => {
          unsubscribe();
          bridgeCallbacks.cancelRequest(bridgeRequestId);
        },
        { once: true }
      );
    }
  }

  // === Racer 3: channel (Telegram/iMessage 等外部渠道) ===

  if (channelCallbacks) {
    // requiresUserInteraction 工具跳过 channel (channel 只支持 yes/no)
    channelCallbacks.sendNotification(channelRequestId, {
      requestId: channelRequestId,
      toolName: ctx.toolName,
      toolInput: ctx.input,
      reason: result.structuredReason ?? 'ask_rule_match',
      message: description,
      currentMode: ctx.permCtx.mode
    });

    const unsub = channelCallbacks.onResponse(channelRequestId, response => {
      if (!claim()) return;
      channelUnsubscribe?.(); // 自清理
      ctx.removeFromQueue();
      bridgeCallbacks?.cancelRequest(bridgeRequestId); // 也取消 bridge

      if (response.behavior === 'approve') {
        resolveOnce(ctx.buildAllow(ctx.input));
      } else {
        resolveOnce(
          ctx.cancelAndAbort(
            `通过 ${response.fromServer ?? 'channel'} 拒绝: ${response.feedback ?? ''}`
          )
        );
      }
    });

    channelUnsubscribe = unsub;

    // abort 时清理 channel
    if (ctx.signal) {
      ctx.signal.addEventListener(
        'abort',
        () => {
          channelUnsubscribe?.();
        },
        { once: true }
      );
    }
  }

  // === Racer 4: hooks (PreToolUse 异步后台) ===

  if (!params.awaitAutomatedChecksBeforeDialog) {
    // eslint-disable-next-line no-void
    void runHooksInBackground({
      ctx,
      bridgeCallbacks,
      channelUnsubscribe,
      isResolved,
      claim,
      resolveOnce,
      bridgeRequestId
    });
  }

  // === Racer 5: classifier (AI 分类器异步后台) ===

  if (ctx.permCtx.classifierFn && !params.awaitAutomatedChecksBeforeDialog) {
    // eslint-disable-next-line no-void
    void runClassifierInBackground({
      ctx,
      bridgeCallbacks,
      channelUnsubscribe,
      userInteracted,
      isResolved,
      claim,
      resolveOnce,
      bridgeRequestId
    });
  }
}

/** 内部: racer 异步运行参数 */
interface RacerBackgroundParams {
  readonly ctx: PermissionContextMethods;
  readonly bridgeCallbacks: BridgePermissionCallbacks | undefined;
  readonly channelUnsubscribe: (() => void) | undefined;
  readonly isResolved: () => boolean;
  readonly claim: () => boolean;
  readonly resolveOnce: (value: PermissionResult) => void;
  readonly bridgeRequestId: string;
}

/** 内部: hooks racer 异步后台运行 */
async function runHooksInBackground(params: RacerBackgroundParams): Promise<void> {
  const {
    ctx,
    bridgeCallbacks,
    channelUnsubscribe,
    isResolved,
    claim,
    resolveOnce,
    bridgeRequestId
  } = params;
  if (isResolved()) return;
  const hookDecision = await ctx.runHooks(ctx.permCtx.mode, undefined, ctx.input);
  if (!hookDecision || !claim()) return;
  bridgeCallbacks?.cancelRequest(bridgeRequestId);
  channelUnsubscribe?.();
  ctx.removeFromQueue();
  resolveOnce(hookDecision);
}

/** 内部: classifier racer 异步后台运行 */
async function runClassifierInBackground(
  params: RacerBackgroundParams & { readonly userInteracted: boolean }
): Promise<void> {
  const {
    ctx,
    bridgeCallbacks,
    channelUnsubscribe,
    userInteracted,
    isResolved,
    claim,
    resolveOnce,
    bridgeRequestId
  } = params;
  if (isResolved() || userInteracted) return;

  const classifierResult = await ctx.tryClassifier(undefined, ctx.input);
  if (!classifierResult || !claim()) return;

  bridgeCallbacks?.cancelRequest(bridgeRequestId);
  channelUnsubscribe?.();
  ctx.removeFromQueue();
  resolveOnce(classifierResult);
}

/**
 * handleCoordinatorPermission — coordinator worker 顺序自动检查
 *
 * 参考 Claude Code 的 coordinatorHandler.ts:
 *
 * coordinator worker 在显示对话框前先运行 hooks + classifier 顺序检查。 如果任一自动解决，不需要对话框。
 */
export async function handleCoordinatorPermission(
  params: CoordinatorPermissionParams
): Promise<PermissionResult | null> {
  const { ctx } = params;

  // 1. Try hooks first (fast, local)
  const hookDecision = await ctx.runHooks(ctx.permCtx.mode, undefined, ctx.input);
  if (hookDecision) {
    // hook deny → 绝对覆盖
    if (hookDecision.behavior === 'deny') return hookDecision;
    // hook allow → 不覆盖 deny/ask
    if (hookDecision.behavior === 'allow') return hookDecision;
    // hook ask → 强制用户确认（但 coordinator 已在 ask，所以返回 null）
  }

  // 2. Try classifier (slow, inference)
  const classifierDecision = await ctx.tryClassifier(undefined, ctx.input);
  if (classifierDecision) return classifierDecision;

  // 3. Both missed → return null (需要对话框)
  return null;
}
