/**
 * 权限 Handler 三模式 — interactive/coordinator/swarm
 *
 * N17: 对齐 CC hooks/toolPermission/handlers/ 三种权限处理模式：
 *
 * 1. InteractiveHandler — 终端UI交互（用户手动批准/拒绝）
 * 2. CoordinatorHandler — 协调器批量处理（team leader 决策）
 * 3. SwarmWorkerHandler — swarm worker（遵循leader决策）
 */

/** 权限行为类型 — 与 PermissionResult 的 behavior 字段一致 */
type PermissionBehavior = 'allow' | 'deny' | 'ask' | 'passthrough';

// ============================================================
// 类型定义
// ============================================================

/** 权限决策来源 */
export type PermissionDecisionSource = 'interactive' | 'coordinator' | 'swarm_worker';

/** 权限决策结果 */
export interface PermissionDecisionResult {
  readonly behavior: PermissionBehavior;
  readonly source: PermissionDecisionSource;
  readonly reason?: string;
  readonly persistent?: boolean;
  readonly toolName?: string;
}

/** Interactive Handler 配置 */
export interface InteractiveHandlerConfig {
  readonly promptTimeoutMs?: number;
  readonly allowPersistent?: boolean;
}

/** Coordinator Handler 配置 */
export interface CoordinatorHandlerConfig {
  readonly leaderAgentType?: string;
  readonly autoApproveReadOnly?: boolean;
}

/** Swarm Worker Handler 配置 */
export interface SwarmWorkerHandlerConfig {
  readonly followLeaderDecisions?: boolean;
  readonly defaultBehavior?: PermissionBehavior;
}

// ============================================================
// Handler 实现
// ============================================================

/** InteractiveHandler — 终端UI交互权限处理 */
export class InteractivePermissionHandler {
  async decide(
    toolName: string,
    _inputDescription: string,
    isReadOnly: boolean
  ): Promise<PermissionDecisionResult> {
    // 交互模式下，只读命令自动允许
    if (isReadOnly) {
      return {
        behavior: 'allow',
        source: 'interactive',
        reason: 'auto_approved_readonly',
        toolName
      };
    }

    // 非只读 → 需要 ask（实际 UI 交互由宿主实现）
    return {
      behavior: 'ask',
      source: 'interactive',
      reason: 'requires_user_approval',
      toolName
    };
  }
}

/** CoordinatorHandler — 协调器批量权限处理 */
export class CoordinatorPermissionHandler {
  constructor(private readonly config?: CoordinatorHandlerConfig) {}

  decide(toolName: string, isReadOnly: boolean): PermissionDecisionResult {
    // coordinator 模式下只读自动批准
    if (isReadOnly && this.config?.autoApproveReadOnly) {
      return {
        behavior: 'allow',
        source: 'coordinator',
        reason: 'coordinator_auto_readonly',
        toolName
      };
    }

    // coordinator leader 决策（实际逻辑由宿主注入）
    return {
      behavior: 'ask',
      source: 'coordinator',
      reason: 'coordinator_decision_required',
      toolName
    };
  }
}

/** SwarmWorkerHandler — swarm worker 权限处理 */
export class SwarmWorkerPermissionHandler {
  constructor(private readonly config?: SwarmWorkerHandlerConfig) {}

  decide(toolName: string): PermissionDecisionResult {
    // swarm worker 遵循 leader 决策或使用默认行为
    const behavior = this.config?.followLeaderDecisions
      ? 'ask'
      : (this.config?.defaultBehavior ?? 'ask');

    return {
      behavior,
      source: 'swarm_worker',
      reason: this.config?.followLeaderDecisions
        ? 'following_leader_decision'
        : 'swarm_worker_default',
      toolName
    };
  }
}
