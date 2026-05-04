/** Plan批准流程（Plan Approve Flow） plan→submit→approve→acceptEdits→execute→complete 状态机 */

import type { PermissionMode } from './types/permission-mode';
import type { ToolPermissionContext } from './types/permission-context';
import type { PermissionEvent } from './types/permission-events';

// ============================================================
// 类型定义
// ============================================================

/**
 * Plan批准流程状态
 *
 * - idle: 未开始规划
 * - planning: 正在规划（permCtx.mode = 'plan'）
 * - awaiting_approval: 已提交计划，等待批准
 * - executing: 已批准，正在执行（permCtx.mode = 'acceptEdits'）
 * - completed: 执行完成
 */
export type PlanApproveState =
  | 'idle'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'completed';

/** 计划步骤 — 描述一个待执行的操作 */
export interface PlanStep {
  /** 工具名称 */
  readonly toolName: string;
  /** 工具输入参数 */
  readonly args: unknown;
  /** 步骤描述 */
  readonly description: string;
  /** 风险等级 */
  readonly riskLevel: 'low' | 'medium' | 'high';
}

/** 计划内容 — 描述完整计划 */
export interface PlanContent {
  /** 计划描述 */
  readonly description: string;
  /** 计划步骤列表 */
  readonly steps: readonly PlanStep[];
  /** 预估影响 */
  readonly estimatedImpact: string;
}

/** 计划提交结果 */
export interface PlanSubmitResult {
  /** 是否成功提交 */
  readonly submitted: boolean;
  /** 计划唯一 ID */
  readonly planId: string;
  /** 拒绝原因（submitted=false 时） */
  readonly reason?: string;
}

/** 计划批准结果 */
export interface PlanApproveResult {
  /** 是否成功批准 */
  readonly approved: boolean;
  /** 批准后的权限模式 */
  readonly mode: PermissionMode;
  /** 批准原因 */
  readonly reason?: string;
}

/** PlanApproveFlow 构造选项 */
export interface PlanApproveFlowOptions {
  /** 状态变更回调（可选，用于 UI 更新） */
  readonly onStateChange?: (state: PlanApproveState, prevState: PlanApproveState) => void;
}

// ============================================================
// PlanApproveFlow 状态机
// ============================================================

/**
 * Plan批准流程 — 5状态FSM
 *
 * 参考 Claude Code 的 plan mode 流程:
 *
 * 1. startPlanning → permCtx.mode = 'plan', 状态→planning
 * 2. submitPlan → 状态→awaiting_approval（等待用户批准）
 * 3. approvePlan → permCtx.mode = 'acceptEdits', 状态→executing
 * 4. rejectPlan → 保持 plan 模式, 状态→planning（允许重新规划）
 * 5. completeExecution → permCtx.mode = 'default', 状态→completed
 * 6. abort → permCtx.mode = 'default', 状态→idle
 *
 * 状态转换图:
 *
 * idle → planning (startPlanning) planning → awaiting_approval (submitPlan) awaiting_approval →
 * executing (approvePlan) awaiting_approval → planning (rejectPlan) executing → completed
 * (completeExecution) planning/awaiting_approval/executing → idle (abort) completed → idle (reset)
 *
 * 使用示例:
 *
 * ```ts
 * const flow = new PlanApproveFlow(permCtx, { eventEmitter: emitter });
 * flow.startPlanning(); // → planning (permCtx.mode = plan)
 * flow.submitPlan(planContent); // → awaiting_approval
 * const result = flow.approvePlan(); // → executing (permCtx.mode = acceptEdits)
 * flow.completeExecution(); // → completed (permCtx.mode = default)
 * ```
 */
export class PlanApproveFlow {
  private state: PlanApproveState = 'idle';
  private permCtx: ToolPermissionContext;
  private currentPlan: PlanContent | undefined;
  private planId: string | undefined;
  private readonly options: PlanApproveFlowOptions;
  private readonly eventHandlers: ((event: PermissionEvent) => void)[] = [];

  constructor(initialPermCtx: ToolPermissionContext, options: PlanApproveFlowOptions = {}) {
    this.permCtx = initialPermCtx;
    this.options = options;
  }

  // === 状态查询 ===

  /** 获取当前状态 */
  getState(): PlanApproveState {
    return this.state;
  }

  /** 获取当前计划内容 */
  getCurrentPlan(): PlanContent | undefined {
    return this.currentPlan;
  }

  /** 获取当前权限上下文 */
  getPermissionContext(): ToolPermissionContext {
    return this.permCtx;
  }

  // === 状态转换 ===

  /**
   * 开始规划 — 切换 permCtx.mode = 'plan', 状态→planning
   *
   * 仅在 idle 或 completed 状态下可调用。
   */
  startPlanning(): void {
    this.validateStateTransition('startPlanning', ['idle', 'completed']);

    const prevState = this.state;
    this.permCtx = { ...this.permCtx, mode: 'plan' };
    this.state = 'planning';

    this.notifyStateChange(prevState);
  }

  /**
   * 提交计划 — 状态→awaiting_approval
   *
   * 仅在 planning 状态下可调用。
   *
   * @param plan 计划内容
   * @returns 提交结果
   */
  submitPlan(plan: PlanContent): PlanSubmitResult {
    this.validateStateTransition('submitPlan', ['planning']);

    const prevState = this.state;
    this.planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.currentPlan = plan;
    this.state = 'awaiting_approval';

    this.notifyStateChange(prevState);

    return { submitted: true, planId: this.planId };
  }

  /**
   * 批准计划 — permCtx.mode = 'acceptEdits', 状态→executing
   *
   * 仅在 awaiting_approval 状态下可调用。
   */
  approvePlan(): PlanApproveResult {
    this.validateStateTransition('approvePlan', ['awaiting_approval']);

    const prevState = this.state;
    const oldMode = this.permCtx.mode;
    this.permCtx = { ...this.permCtx, mode: 'acceptEdits' };
    this.state = 'executing';

    this.emitEvent({
      type: 'permission_mode_changed',
      from: oldMode,
      to: 'acceptEdits',
      timestamp: Date.now()
    });

    this.notifyStateChange(prevState);

    return { approved: true, mode: 'acceptEdits' };
  }

  /**
   * 拒绝计划 — 保持 plan 模式, 状态→planning（允许重新规划）
   *
   * 仅在 awaiting_approval 状态下可调用。
   *
   * @param reason 拒绝原因（可选）
   */
  rejectPlan(_reason?: string): void {
    this.validateStateTransition('rejectPlan', ['awaiting_approval']);

    const prevState = this.state;
    // 保持 plan 模式，回到 planning 状态允许重新规划
    this.currentPlan = undefined;
    this.planId = undefined;
    this.state = 'planning';

    this.notifyStateChange(prevState);
  }

  /**
   * 完成执行 — permCtx.mode = 'default', 状态→completed
   *
   * 仅在 executing 状态下可调用。
   */
  completeExecution(): void {
    this.validateStateTransition('completeExecution', ['executing']);

    const prevState = this.state;
    const oldMode = this.permCtx.mode;
    this.permCtx = { ...this.permCtx, mode: 'default' };
    this.state = 'completed';

    this.emitEvent({
      type: 'permission_mode_changed',
      from: oldMode,
      to: 'default',
      timestamp: Date.now()
    });

    this.notifyStateChange(prevState);
  }

  /**
   * 中止 — permCtx.mode = 'default', 状态→idle
   *
   * 在 planning/awaiting_approval/executing 状态下可调用。
   */
  abort(): void {
    this.validateStateTransition('abort', ['planning', 'awaiting_approval', 'executing']);

    const prevState = this.state;
    const oldMode = this.permCtx.mode;
    this.permCtx = { ...this.permCtx, mode: 'default' };
    this.state = 'idle';
    this.currentPlan = undefined;
    this.planId = undefined;

    this.emitEvent({
      type: 'permission_mode_changed',
      from: oldMode,
      to: 'default',
      timestamp: Date.now()
    });

    this.notifyStateChange(prevState);
  }

  /** 重置 — 从 completed 回到 idle（开始新一轮规划） */
  reset(): void {
    this.validateStateTransition('reset', ['completed']);

    const prevState = this.state;
    this.state = 'idle';
    this.currentPlan = undefined;
    this.planId = undefined;

    this.notifyStateChange(prevState);
  }

  // === 内部方法 ===

  /** 验证状态转换合法性 */
  private validateStateTransition(action: string, allowedStates: PlanApproveState[]): void {
    if (!allowedStates.includes(this.state)) {
      throw new Error(
        `无法在 "${this.state}" 状态下执行 "${action}"，允许的状态: ${allowedStates.join(', ')}`
      );
    }
  }

  /** 通知状态变更回调 */
  private notifyStateChange(prevState: PlanApproveState): void {
    this.options.onStateChange?.(this.state, prevState);
  }

  /** 发射权限事件 */
  private emitEvent(event: PermissionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // 事件处理器异常不影响流程
      }
    }
  }
}
