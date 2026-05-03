/** @suga/ai-coordinator — 多Worker协调引擎 公共 API */

// 类型导出
export type { AgentDefinition, WorkerIsolation, WorkerStatus } from './types/agent';
export { AGENT_TYPE_PATTERN } from './types/agent';

export type { Worker, Team as TeamType, TeamStatus } from './types/team';

export type {
  MailboxMessageType,
  StructuredMessage,
  MailboxMessage,
  Mailbox
} from './types/mailbox';

export type { TaskDefinition, TaskStatus, TaskUpdateOp } from './types/task';

export type {
  OrchestrationPhase,
  OrchestrationStep,
  StepResult,
  OrchestrationContext,
  OrchestrationResult,
  OrchestrationEvent,
  PhaseStrategy
} from './types/orchestrator';

export type {
  SpawnProvider,
  SpawnCallOptions,
  AgentSessionHandle,
  AgentResult,
  TaskTypeIdentifier,
  TaskExecutionContext,
  TaskResult,
  TaskType,
  BatchExecutionMode
} from './types/task-executor';

export type {
  PermissionBubbleRequest,
  PermissionBubbleResponse,
  PermissionBubbleRule,
  PermissionBubbleSuggestion
} from './types/permission-bubble';

export type { PermissionUpdateMessage, SettingsUpdateMessage } from './types/permission-sync';

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
export { FileMailbox } from './mailbox/FileMailbox';
export type {
  FileMailboxOptions,
  FileMailboxReader,
  FileMailboxWriter,
  FileMailboxLocker
} from './mailbox/FileMailbox';

// Permission Bubble
export {
  sendPermissionBubble,
  receivePermissionBubbleRequests,
  sendPermissionBubbleResponse,
  pollPermissionBubbleResponse
} from './permission/PermissionBubbleHandler';
export { PermissionBubbleQueue } from './permission/PermissionBubbleQueue';
export type { PendingPermissionBubble } from './permission/PermissionBubbleQueue';

// Permission Sync
export {
  PermissionSyncBroadcaster,
  PermissionSyncReceiver
} from './permission/PermissionSyncBroadcaster';

// Task
export { TaskManager } from './task/TaskManager';
export { TaskExecutor } from './task/TaskExecutor';
export { TaskTypeRegistry } from './task/TaskTypeRegistry';
export { LocalAgentTask } from './task/LocalAgentTask';
export { LocalShellTask } from './task/LocalShellTask';
export { InProcessTeammate } from './task/InProcessTeammate';
export { LocalWorkflowTask } from './task/LocalWorkflowTask';
export { RemoteAgentTask } from './task/RemoteAgentTask';
export { DreamTask } from './task/DreamTask';

// Orchestrator
export { CoordinatorOrchestrator } from './orchestrator/CoordinatorOrchestrator';
export { DefaultPhaseStrategy } from './orchestrator/PhaseStrategy';

// Integration
export { CoordinatorDispatchPhase } from './integration/CoordinatorDispatchPhase';
