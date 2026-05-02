/** RuntimeConfig — 聚合所有P0-P10+P35+P36子包配置 */

import type { AgentEvent, LLMProvider, SystemPrompt, ToolScheduler } from '@suga/ai-agent-loop';
import type {
  CanUseToolFn,
  DenialTrackingState,
  PermissionPromptHandler,
  ToolRegistry
} from '@suga/ai-tool-core';
import type { HookRegistry } from '@suga/ai-hooks';
import type { SkillRegistry } from '@suga/ai-skill';
import type { CompressConfig, CompressDependencies } from '@suga/ai-context';
import type { RecoveryConfig } from '@suga/ai-recovery';
import type {
  CoordinatorRegistry,
  Mailbox,
  PhaseStrategy,
  SpawnProvider,
  TaskManager
} from '@suga/ai-coordinator';
import type { SubagentRegistry, SubagentSpawner } from '@suga/ai-subagent';
import type { MemoryPathConfig, MemoryPromptConfig, MemoryStorageProvider } from '@suga/ai-memory';
import type {
  ConfigProvider,
  FileSystemProvider,
  HttpProvider,
  LLMClassifierConfig,
  MailboxProvider,
  McpResourceProvider,
  PlanModeProvider,
  SearchProvider,
  SkillProvider,
  TaskStoreProvider,
  TeamProvider,
  UserInteractionProvider
} from '@suga/ai-tools';

export type { LLMClassifierConfig };

/**
 * 运行时配置 — 聚合所有子包的可选配置
 *
 * 每个子包配置都是可选的，不提供则该 Phase 不插入链中。 只有 `provider` 和 `fsProvider` 是必填项（P1 AgentLoop 和 bash/file
 * 工具的硬性依赖）。
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
  /** 工具调度器（默认 StreamingToolScheduler，可替换为自定义调度器） */
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

  // === P3 恢复系统 (可选, 需要 compressConfig) ===
  /** 恢复配置（提供时 RecoveryPhase 插入 Phase 链，需要 compressConfig 提供 CompressPipeline） */
  readonly recoveryConfig?: RecoveryConfig;

  // === P9 Coordinator (可选) ===
  /** Coordinator注册表（提供时 CoordinatorDispatchPhase 插入 Phase 链） */
  readonly coordinatorRegistry?: CoordinatorRegistry;
  /** 邮箱实例（默认 InMemoryMailbox） */
  readonly coordinatorMailbox?: Mailbox;
  /** 任务管理器（默认 new TaskManager()） */
  readonly coordinatorTaskManager?: TaskManager;
  /** 编排策略（默认 DefaultPhaseStrategy） */
  readonly coordinatorStrategy?: PhaseStrategy;
  /** SpawnProvider — 真实Agent执行能力（提供时CoordinatorDispatchPhase使用真实TaskExecutor） */
  readonly spawnProvider?: SpawnProvider;

  // === P10 Subagent (可选) ===
  /** Subagent注册表（提供时SubagentDispatchPhase插入Phase链） */
  readonly subagentRegistry?: SubagentRegistry;
  /** SubagentSpawner — 真实spawn能力 */
  readonly subagentSpawner?: SubagentSpawner;

  // === P35 Memory注入 (可选) ===
  /** Memory配置（提供时在 system prompt 中注入 memory 段落，支持 Partial） */
  readonly memoryConfig?: Partial<MemoryPromptConfig>;
  /** MemoryStorageProvider（读取 MEMORY.md 的文件系统抽象） */
  readonly memoryProvider?: MemoryStorageProvider;
  /** Memory路径配置（计算 MEMORY.md 路径） */
  readonly memoryPathConfig?: MemoryPathConfig;
  /** 预计算的 systemPrompt（提供时直接使用，跳过 fetchSystemPrompt） */
  readonly systemPrompt?: SystemPrompt;
  /** 自定义系统提示（替代默认 system prompt） */
  readonly customSystemPrompt?: string;
  /** 附加系统提示（追加到 system prompt 末尾） */
  readonly appendSystemPrompt?: string;

  // === P36 Tool Provider Wiring ===
  /** 文件系统提供者（必填 — bash/file工具的硬性依赖） */
  readonly fsProvider: FileSystemProvider;
  /** HTTP提供者（可选，默认 DefaultHttpProvider） */
  readonly httpProvider?: HttpProvider;
  /** 搜索提供者（可选，无默认） */
  readonly searchProvider?: SearchProvider;
  /** 任务存储提供者（可选，无默认） */
  readonly taskStoreProvider?: TaskStoreProvider;
  /** Team管理提供者（可选，无默认） */
  readonly teamProvider?: TeamProvider;
  /** 消息收发提供者（可选，无默认） */
  readonly mailboxProvider?: MailboxProvider;
  /** 用户交互提供者（可选，无默认） */
  readonly userInteractionProvider?: UserInteractionProvider;
  /** Skill提供者（可选，无默认） */
  readonly skillProvider?: SkillProvider;
  /** 配置管理提供者（可选，无默认） */
  readonly configProvider?: ConfigProvider;
  /** MCP资源提供者（可选，无默认） */
  readonly mcpResourceProvider?: McpResourceProvider;
  /** 计划模式提供者（可选，无默认） */
  readonly planModeProvider?: PlanModeProvider;

  // === P37 LLM Classifier (可选) ===
  /** LLM分类器配置（auto模式使用，无默认则使用YoloPermissionClassifier stub） */
  readonly classifierConfig?: LLMClassifierConfig;

  // === P39 用户交互注入 ===
  /** 权限确认交互接口（TerminalPermissionPromptHandler等） */
  readonly promptHandler?: PermissionPromptHandler;
  /** 用户确认函数（向后兼容boolean版） */
  readonly canUseToolFn?: CanUseToolFn;
  /** 拒绝追踪初始状态（默认DEFAULT_DENIAL_TRACKING） */
  readonly denialTracking?: DenialTrackingState;
}

/** Provider Map — 从 RuntimeConfig 提取的 provider 字段集合 */
export interface ProviderMap {
  readonly fsProvider: FileSystemProvider;
  readonly httpProvider?: HttpProvider;
  readonly searchProvider?: SearchProvider;
  readonly taskStoreProvider?: TaskStoreProvider;
  readonly teamProvider?: TeamProvider;
  readonly mailboxProvider?: MailboxProvider;
  readonly userInteractionProvider?: UserInteractionProvider;
  readonly skillProvider?: SkillProvider;
  readonly configProvider?: ConfigProvider;
  readonly mcpResourceProvider?: McpResourceProvider;
  readonly planModeProvider?: PlanModeProvider;
  readonly promptHandler?: PermissionPromptHandler;
  readonly canUseToolFn?: CanUseToolFn;
  readonly denialTracking?: DenialTrackingState;
}

/** RuntimeSession 状态 — P7 Store 管理 */
export interface RuntimeSessionState {
  readonly sessionId: string;
  readonly status: 'active' | 'paused' | 'completed' | 'destroyed';
  readonly turnCount: number;
  readonly lastEvent: AgentEvent | null;
  readonly messageCount: number;
}
