/** @suga/ai-coordinator — 多Worker协调引擎 公共 API */

// 类型导出
export type {
  AgentDefinition,
  WorkerIsolation,
  WorkerStatus
} from './types/agent';
export { AGENT_TYPE_PATTERN } from './types/agent';

export type {
  Worker,
  Team as TeamType,
  TeamStatus
} from './types/team';

export type {
  MailboxMessageType,
  StructuredMessage,
  MailboxMessage,
  Mailbox
} from './types/mailbox';

export type {
  TaskDefinition,
  TaskStatus,
  TaskUpdateOp
} from './types/task';

export type {
  OrchestrationPhase,
  OrchestrationStep,
  StepResult,
  OrchestrationContext,
  OrchestrationResult,
  OrchestrationEvent,
  PhaseStrategy
} from './types/orchestrator';

// 常量导出
export {
  DEFAULT_TEAM_NAME_PREFIX,
  DEFAULT_WORKER_ID_PREFIX,
  DEFAULT_TASK_ID_PREFIX,
  DEFAULT_MESSAGE_ID_PREFIX,
  ORCHESTRATION_PHASES
} from './constants';

// 注册表
export { CoordinatorRegistry } from './registry/CoordinatorRegistry';

// Team
export { Team } from './team/Team';
export { TeamManager } from './team/TeamManager';

// Mailbox
export { InMemoryMailbox } from './mailbox/InMemoryMailbox';

// Task
export { TaskManager } from './task/TaskManager';

// Orchestrator
export { CoordinatorOrchestrator } from './orchestrator/CoordinatorOrchestrator';
export { DefaultPhaseStrategy } from './orchestrator/PhaseStrategy';

// Integration
export { CoordinatorDispatchPhase } from './integration/CoordinatorDispatchPhase';