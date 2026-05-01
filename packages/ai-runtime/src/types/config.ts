/** RuntimeConfig — 聚合所有P0-P9子包配置 */

import type { AgentEvent, LLMProvider, ToolScheduler } from '@suga/ai-agent-loop';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { HookRegistry } from '@suga/ai-hooks';
import type { SkillRegistry } from '@suga/ai-skill';
import type { CompressConfig, CompressDependencies } from '@suga/ai-context';
import type {
  CoordinatorRegistry,
  Mailbox,
  PhaseStrategy,
  TaskManager
} from '@suga/ai-coordinator';

/**
 * 运行时配置 — 聚合所有子包的可选配置
 *
 * 每个子包配置都是可选的，不提供则该 Phase 不插入链中。 只有 `provider` 是必填项（P1 AgentLoop 的硬性依赖）。
 */
export interface RuntimeConfig {
  // === P1 核心 (必填) ===
  /** LLM Provider 实例 */
  readonly provider: LLMProvider;
  /** 最大循环轮次（默认 10） */
  readonly maxTurns?: number;
  /** 工具执行超时时间（ms，默认 30000） */
  readonly toolTimeout?: number;

  // === P0 工具层 (可选) ===
  /** 工具注册表（不提供则无工具执行阶段） */
  readonly toolRegistry?: ToolRegistry;
  /** 工具调度器（默认 ParallelScheduler，可替换为 StreamingToolScheduler） */
  readonly scheduler?: ToolScheduler;

  // === P4 Hooks层 (可选) ===
  /** Hook注册表（不提供则无 Hook 拦截阶段） */
  readonly hookRegistry?: HookRegistry;

  // === P5 Skill层 (可选) ===
  /** Skill注册表（提供时自动将 SkillTool 注册到 toolRegistry） */
  readonly skillRegistry?: SkillRegistry;

  // === P8 上下文压缩 (可选) ===
  /** 压缩配置（提供时 CompressPhase 替换 PreProcessPhase） */
  readonly compressConfig?: CompressConfig;
  /** 压缩依赖注入（callModelForSummary 等） */
  readonly compressDeps?: CompressDependencies;

  // === P9 Coordinator (可选) ===
  /** Coordinator注册表（提供时 CoordinatorDispatchPhase 插入 Phase 链） */
  readonly coordinatorRegistry?: CoordinatorRegistry;
  /** 邮箱实例（默认 InMemoryMailbox） */
  readonly coordinatorMailbox?: Mailbox;
  /** 任务管理器（默认 new TaskManager()） */
  readonly coordinatorTaskManager?: TaskManager;
  /** 编排策略（默认 DefaultPhaseStrategy） */
  readonly coordinatorStrategy?: PhaseStrategy;
}

/** RuntimeSession 状态 — P7 Store 管理 */
export interface RuntimeSessionState {
  readonly sessionId: string;
  readonly status: 'active' | 'paused' | 'completed' | 'destroyed';
  readonly turnCount: number;
  readonly lastEvent: AgentEvent | null;
}
