/** AgentDefinition — Worker 定义模板 */

import type { HooksSettings } from '@suga/ai-skill';

/** Worker 隔离模式 */
export type WorkerIsolation = 'worktree' | 'remote' | 'shared';

/** Worker 运行状态 */
export type WorkerStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed' | 'shutdown';

/** AgentDefinition 名称合法正则（对齐 P0 TOOL_NAME_PATTERN） */
export const AGENT_TYPE_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * AgentDefinition — Worker 定义模板
 *
 * 对齐 Claude Code 的 BaseAgentDefinition，描述一个 Worker 的能力边界。
 * Coordinator 根据 AgentDefinition 选择合适的 Worker 执行任务。
 */
export interface AgentDefinition {
  /** 唯一标识符 (如 "researcher", "coder", "tester") */
  readonly agentType: string;
  /** 何时使用此 agent — 给 Coordinator 的决策依据 */
  readonly whenToUse: string;
  /** 工具白名单 (可选，不设则全部允许) */
  readonly tools?: readonly string[];
  /** 工具黑名单 (可选，优先于白名单) */
  readonly disallowedTools?: readonly string[];
  /** 模型选择 (支持 'inherit' 使用父 agent 模型) */
  readonly model?: string;
  /** 最大轮次限制 */
  readonly maxTurns?: number;
  /** 权限模式 */
  readonly permissionMode?: string;
  /** 会话级 hooks 配置 */
  readonly hooks?: HooksSettings;
  /** 预加载 skill 列表 */
  readonly skills?: readonly string[];
  /** 隔离模式 */
  readonly isolation?: WorkerIsolation;
  /** 描述 (给 LLM 看) */
  readonly description?: string;
}
