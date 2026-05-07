/**
 * Coordinator 模式检测与恢复类型
 *
 * N9: 对齐 CC coordinator/coordinatorMode.ts 提供会话启动时的 coordinator 模式检测和恢复逻辑。
 */

/** 会话模式类型 */
export type SessionMode = 'single' | 'coordinator';

/** Worker 工具限制集 */
export const INTERNAL_WORKER_TOOLS: readonly string[] = [
  'bash',
  'file_read',
  'file_write',
  'file_edit',
  'glob',
  'grep',
  'notebook_edit',
  'web_fetch',
  'web_search',
  'task_create',
  'task_update',
  'task_list',
  'task_get',
  'task_output',
  'ask_user_question'
];

/** 允许异步 agent 的工具集 */
export const ASYNC_AGENT_ALLOWED_TOOLS: readonly string[] = [
  'bash',
  'file_read',
  'file_write',
  'file_edit',
  'glob',
  'grep',
  'notebook_edit',
  'web_fetch',
  'web_search'
];

/** Coordinator 模式配置 */
export interface CoordinatorModeConfig {
  /** 当前会话模式 */
  readonly mode: SessionMode;
  /** Worker 限制工具集 */
  readonly workerToolAllowlist?: readonly string[];
  /** Scratchpad 目录路径 */
  readonly scratchpadDir?: string;
}

/** isCoordinatorMode — 判断是否处于 coordinator 模式 */
export function isCoordinatorMode(config?: CoordinatorModeConfig): boolean {
  return config?.mode === 'coordinator';
}

/**
 * matchSessionMode — 从会话设置推断模式
 *
 * 优先级: explicit > team > default(single)
 */
export function matchSessionMode(explicitMode?: SessionMode, teamEnabled?: boolean): SessionMode {
  if (explicitMode) return explicitMode;
  if (teamEnabled) return 'coordinator';
  return 'single';
}

/** getCoordinatorUserContext — 构建 coordinator 用户上下文 */
export interface CoordinatorUserContext {
  readonly scratchpadDir: string;
  readonly mcpServerNames: readonly string[];
  readonly workerAllowlist: readonly string[];
}

export function getCoordinatorUserContext(
  config: CoordinatorModeConfig,
  mcpServerNames?: readonly string[]
): CoordinatorUserContext | undefined {
  if (!isCoordinatorMode(config)) return undefined;

  return {
    scratchpadDir: config.scratchpadDir ?? '/tmp/claude-coordinator-scratchpad',
    mcpServerNames: mcpServerNames ?? [],
    workerAllowlist: config.workerToolAllowlist ?? INTERNAL_WORKER_TOOLS
  };
}
