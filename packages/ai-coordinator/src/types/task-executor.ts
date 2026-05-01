/** Task执行系统类型定义 — SpawnProvider + TaskType + TaskResult */

import type { AgentDefinition } from './agent';
import type { Mailbox } from './mailbox';
import type { TaskDefinition } from './task';

// === SpawnProvider — 宿主注入的Agent执行能力 ===

/** Agent spawn 调用选项 */
export interface SpawnCallOptions {
  /** 模型名称（可选，覆盖AgentDefinition.model） */
  readonly model?: string;
  /** 最大token数 */
  readonly maxTokens?: number;
  /** 系统提示（可选） */
  readonly systemPrompt?: string;
  /** 工具白名单（可选） */
  readonly allowedTools?: readonly string[];
  /** 中断信号 */
  readonly abortSignal?: AbortSignal;
}

/** Agent会话句柄 — 用于追踪正在执行的Agent */
export interface AgentSessionHandle {
  readonly sessionId: string;
  readonly agentType: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
}

/** Agent执行结果 */
export interface AgentResult {
  readonly output: string;
  readonly toolCalls: number;
  readonly tokensUsed: { readonly input: number; readonly output: number };
  readonly error?: string;
  readonly success: boolean;
}

/**
 * SpawnProvider — 宿主注入的Agent执行能力
 *
 * 两个层次:
 *
 * 1. callModel — 单次LLM调用（用于Shell/Dream等简单任务）
 * 2. spawnAgent — 创建完整AgentLoop会话（用于LocalAgent/InProcess等复杂任务）
 *
 * 宿主可将 SubagentSpawner(LLMProvider注入) 适配为 SpawnProvider
 */
export interface SpawnProvider {
  /** 单次LLM调用 — 用于Shell/Dream等简单任务 */
  callModel(prompt: string, options?: SpawnCallOptions): Promise<string>;

  /** 创建Agent会话 — 用于LocalAgent/InProcess等复杂任务 */
  spawnAgent(def: AgentDefinition, task: string, options?: SpawnCallOptions): Promise<AgentResult>;

  /** 中止Agent会话（可选，用于长时间运行的Agent） */
  abortSession?(handle: AgentSessionHandle): Promise<void>;
}

// === TaskType — 任务类型策略 ===

/** Task类型标识 */
export type TaskTypeIdentifier =
  | 'local_agent'
  | 'local_shell'
  | 'in_process_teammate'
  | 'local_workflow'
  | 'remote_agent'
  | 'dream';

/** Task执行上下文 — 传递给每个TaskType */
export interface TaskExecutionContext {
  readonly spawnProvider: SpawnProvider;
  readonly mailbox?: Mailbox;
  readonly agentRegistry?: import('../registry/CoordinatorRegistry').CoordinatorRegistry;
  readonly abortSignal?: AbortSignal;
  readonly meta: Record<string, unknown>;
}

/** Task执行结果 */
export interface TaskResult {
  readonly taskId: string;
  readonly success: boolean;
  readonly output: string;
  readonly error?: string;
  readonly durationMs: number;
  readonly tokensUsed?: { readonly input: number; readonly output: number };
}

/** TaskType接口 — 每种任务类型的执行策略 */
export interface TaskType {
  readonly identifier: TaskTypeIdentifier;
  readonly description: string;

  /** 执行任务 */
  execute(task: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult>;
}

/** Task批量执行模式 */
export type BatchExecutionMode = 'parallel' | 'sequential';
