/** 默认配置常量 */

/** Team 名称默认前缀 */
export const DEFAULT_TEAM_NAME_PREFIX = 'team';

/** Worker ID 默认前缀 */
export const DEFAULT_WORKER_ID_PREFIX = 'worker';

/** Task ID 默认前缀 */
export const DEFAULT_TASK_ID_PREFIX = 'task';

/** Mailbox 消息 ID 默认前缀 */
export const DEFAULT_MESSAGE_ID_PREFIX = 'msg';

/** 4阶段编排顺序 */
export const ORCHESTRATION_PHASES: readonly OrchestrationPhase[] = [
  'research',
  'synthesis',
  'implementation',
  'verification'
];

// 需要导入类型以供 ORCHESTRATION_PHASES 使用
import type { OrchestrationPhase } from './types/orchestrator';
