/** 编排策略类型 */

import type { AgentDefinition } from './agent';
import type { TaskDefinition } from './task';

/** 编排阶段枚举 — 对齐 Claude Code 的 4 阶段工作流 */
export type OrchestrationPhase = 'research' | 'synthesis' | 'implementation' | 'verification';

/** 编排步骤 */
export interface OrchestrationStep {
  /** 步骤所属阶段 */
  readonly phase: OrchestrationPhase;
  /** 分配的 Worker agentType */
  readonly agentType: string;
  /** 任务描述 (发给 Worker 的 prompt) */
  readonly prompt: string;
  /** 关联的 Task ID */
  readonly taskId?: string;
}

/** 步骤执行结果 */
export interface StepResult {
  readonly step: OrchestrationStep;
  readonly workerName: string;
  readonly output: string;
  readonly success: boolean;
}

/** 编排上下文 — 传递给策略的运行时信息 */
export interface OrchestrationContext {
  /** 用户原始请求 */
  readonly userRequest: string;
  /** 已完成的步骤结果 */
  readonly completedSteps: readonly StepResult[];
  /** 当前阶段 */
  readonly currentPhase: OrchestrationPhase;
  /** 可用的 AgentDefinition 列表 */
  readonly availableAgents: readonly AgentDefinition[];
  /** 额外元数据 */
  readonly meta: Record<string, unknown>;
}

/** 编排最终结果 */
export interface OrchestrationResult {
  /** 最终阶段 */
  readonly finalPhase: OrchestrationPhase;
  /** 所有步骤结果 */
  readonly stepResults: readonly StepResult[];
  /** Coordinator 综合总结 */
  readonly summary?: string;
}

/** 编排事件 — AsyncGenerator 产出的流式事件 */
export type OrchestrationEvent =
  | { readonly type: 'phase_start'; readonly phase: OrchestrationPhase }
  | { readonly type: 'task_created'; readonly task: TaskDefinition }
  | {
      readonly type: 'task_completed';
      readonly task: TaskDefinition;
      readonly result: import('./task-executor').TaskResult;
    }
  | { readonly type: 'message_sent'; readonly to: string; readonly content: string }
  | { readonly type: 'phase_end'; readonly phase: OrchestrationPhase; readonly summary: string }
  | {
      readonly type: 'permission_bubble';
      readonly workerId: string;
      readonly toolName: string;
      readonly reason: string;
    }
  | { readonly type: 'permission_resolved'; readonly workerId: string; readonly approved: boolean }
  | { readonly type: 'orchestration_end'; readonly result: OrchestrationResult };

/** 编排策略接口 — 可插拔策略 */
export interface PhaseStrategy {
  /** 决定此阶段应创建哪些步骤 */
  plan(phase: OrchestrationPhase, context: OrchestrationContext): OrchestrationStep[];
}
