/**
 * handleSwarmWorkerPermission — Path 5: Swarm Worker 权限转发
 *
 * 参考 Claude Code 的 handleSwarmWorkerPermission:
 *
 * swarm worker 尝试 classifier 自动批准，
 * 失败后通过 mailbox 转发权限请求到 leader agent。
 *
 * 流程:
 *
 * 1. Try classifier (fast, local) → allow/deny 直接返回
 * 2. Classifier ask → 构建 SwarmPermissionRequest → mailbox.sendRequest
 * 3. pollResponse(requestId, timeout) → 超时则 deny（不 fall through 到 interactive）
 * 4. Leader 批准 → allow + permissionUpdates
 * 5. Leader 拒绝 → deny + feedback
 *
 * **关键**: swarm worker path 不 fall through 到 interactive（worker 无 UI）
 */

import type { PermissionResult, PermissionDeny, PermissionAllow } from '../types/permission';
import type { PermissionContextMethods } from '../types/permission-racing';
import type {
  SwarmPermissionRequest,
  SwarmWorkerMailboxOps
} from '../types/swarm-worker-mailbox';

/** 默认 Leader 响应超时（30秒） */
const SWARM_WORKER_TIMEOUT_MS = 30000;

/**
 * handleSwarmWorkerPermission — Worker 端权限决策
 *
 * @param ctx 权限上下文方法
 * @param result pipeline 返回的 ask 结果
 * @param mailbox Worker Mailbox 操作
 * @param workerId Worker ID
 * @param workerName Worker 名称
 * @returns PermissionResult（allow/deny，不 fall through 到 interactive）
 */
export async function handleSwarmWorkerPermission(
  ctx: PermissionContextMethods,
  result: PermissionResult & { behavior: 'ask' },
  mailbox: SwarmWorkerMailboxOps,
  workerId: string,
  workerName: string
): Promise<PermissionResult> {
  // === Step 1: Try classifier (fast, local) ===
  const classifierDecision = await ctx.tryClassifier(undefined, ctx.input);
  if (classifierDecision && classifierDecision.behavior !== 'ask') {
    // classifier allow/deny → 直接返回
    return classifierDecision;
  }

  // === Step 2: Classifier ask or unavailable → 转发到 Leader ===
  const classifierConfidence =
    classifierDecision && classifierDecision.behavior === 'ask'
      ? (classifierDecision as PermissionResult & { confidence?: string }).confidence ?? 'medium'
      : undefined;

  const request: SwarmPermissionRequest = {
    toolName: ctx.toolName,
    toolInput: ctx.input,
    workerId,
    workerName,
    reason: result.message ?? `工具 "${ctx.toolName}" 需要权限确认`,
    classifierSuggestion: classifierDecision
      ? {
          decision: classifierDecision.behavior,
          reason: classifierDecision.structuredReason ?? '',
          confidence: classifierConfidence
        }
      : undefined
  };

  const requestId = await mailbox.sendRequest(request);

  // === Step 3: Poll Leader response (timeout 30s) ===
  const response = await mailbox.pollResponse(requestId, SWARM_WORKER_TIMEOUT_MS);

  if (!response) {
    // === 超时 → deny（worker 无 UI，不 fall through 到 interactive） ===
    const timeoutDeny: PermissionDeny = {
      behavior: 'deny',
      message: `权限请求超时（${SWARM_WORKER_TIMEOUT_MS / 1000}s），Leader 未响应`,
      decisionSource: 'flag',
      structuredReason: 'swarm_worker_timeout_deny'
    };
    return timeoutDeny;
  }

  // === Step 4: Leader 批准 → allow ===
  if (response.approved) {
    const leaderAllow: PermissionAllow = {
      behavior: 'allow',
      decisionSource: 'user',
      structuredReason: 'swarm_worker_leader_approved',
      feedback: response.feedback
    };
    return leaderAllow;
  }

  // === Step 5: Leader 拒绝 → deny ===
  const leaderDeny: PermissionDeny = {
    behavior: 'deny',
    message: response.reason ?? `Leader 拒绝了 "${ctx.toolName}" 的执行`,
    decisionSource: 'user',
    structuredReason: 'swarm_worker_leader_denied',
    feedback: response.feedback
  };
  return leaderDeny;
}