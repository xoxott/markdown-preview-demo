/**
 * coreTypes.ts — 聚合核心TS类型导出
 *
 * 从17包re-export SDK消费者最常用的核心类型。 对于有命名冲突的项，使用显式导出消歧。 完整的包级类型体系由消费者直接import子包获取。
 */

// === 无冲突包 — 通配符导出 ===
export type * from '@suga/ai-tool-adapter';
export type * from '@suga/ai-hooks';
export type * from '@suga/ai-coordinator';
export type * from '@suga/ai-context';
export type * from '@suga/ai-recovery';
export type * from '@suga/ai-skill';
export type * from '@suga/ai-commands';
export type * from '@suga/ai-stream-executor';
export type * from '@suga/ai-subagent';
export type * from '@suga/ai-runtime';

// === ai-tool-core — 显式导出（避免DEFAULT_SESSION_ID与ai-agent-loop冲突） ===
export type {
  // 工具定义核心
  ToolResult,
  ToolDef,
  BuiltTool,
  AnyBuiltTool,
  ToolRegistryOptions,
  ToolDenyRule,
  ToolCallOptions,
  ToolUseContext,
  // 权限
  PermissionResult,
  PermissionMode,
  PermissionRuleValue,
  PermissionRule,
  PermissionUpdate,
  PermissionDecisionReason,
  PermissionPipelineInput,
  CanUseToolFn,
  // 分类器
  PermissionClassifier,
  ClassifierResult,
  IronGate,
  // Settings
  SettingLayer,
  SettingMergeStrategy,
  MergedSettings,
  SettingSource,
  // Context/Progress
  ProgressStart,
  ProgressUpdate,
  ProgressComplete,
  // Validation
  ValidationResult,
  // Executor
  ExecutorResult,
  // LazySchema
  LazySchema,
  LazySchemaFactory
} from '@suga/ai-tool-core';

// === ai-agent-loop — 显式导出（避免DEFAULT_SESSION_ID/DEFAULT_TOOL_TIMEOUT/HookBlockingError冲突） ===
export type {
  // 消息
  MessageRole,
  BaseMessage,
  UserMessage,
  AssistantMessage,
  ToolResultMessage,
  AgentMessage,
  ToolUseBlock,
  // 状态机
  AgentConfig,
  AgentState,
  TerminalTransition,
  ContinueTransition,
  LoopTransition,
  LoopResult,
  // 事件
  AgentEvent,
  LLMStreamChunk,
  // LLM
  LLMProvider,
  ToolDefinition,
  ToolScheduler,
  // Context
  AgentContext,
  MutableAgentContext,
  AgentToolUseContext,
  // Phase
  LoopPhase
} from '@suga/ai-agent-loop';

// === ai-agent-session — 显式导出（避免SessionStatus与ai-state冲突） ===
export type {
  ProviderConfig,
  ProviderFactory,
  RegistryFactory,
  SessionConfig,
  SerializedLoopTransition,
  SerializedAgentState,
  SerializedSession,
  StorageAdapter
} from '@suga/ai-agent-session';
// SessionStatus使用别名避免与ai-state冲突
export type { SessionStatus as SessionLifecycleStatus } from '@suga/ai-agent-session';

// === ai-state — 显式导出 ===
export type {
  Store,
  OnChange,
  Listener,
  DeepImmutable,
  AppState,
  PermissionStateDomain,
  SettingsStateDomain,
  TaskStateDomain,
  AgentStateDomain,
  WorkerState,
  InboxMessage,
  TeamStateDomain,
  UIStateDomain,
  TaskItem
} from '@suga/ai-state';

// === ai-mcp — 显式导出（避免McpServerConfig与ai-tools冲突） ===
export type {
  McpTransportType,
  McpOAuthConfig,
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpSSEIDEServerConfig,
  McpHTTPServerConfig,
  McpWebSocketServerConfig,
  McpWebSocketIDEServerConfig,
  McpSdkServerConfig,
  McpJsonConfig,
  McpConfigScope,
  ScopedMcpServerConfig,
  ConnectedMcpServer,
  FailedMcpServer,
  NeedsAuthMcpServer,
  PendingMcpServer,
  DisabledMcpServer,
  McpServerConnection,
  McpTransport,
  McpTransportFactory,
  McpElicitationMode,
  McpElicitRequestParams,
  McpElicitResult,
  McpElicitationHandler,
  McpToolDefinition,
  McpResource,
  McpServerResource,
  McpNormalizedNames,
  McpConnectionManager,
  McpConfigLoader
} from '@suga/ai-mcp';
// McpServerConfig使用别名（union类型，与ai-tools的McpServerConfig不同）
export type { McpServerConfig as McpServerConfigUnion } from '@suga/ai-mcp';

// === ai-memory — 显式导出（避免MemoryEntry与ai-agent-session冲突） ===
export type {
  MemoryType,
  MemoryTypeDef,
  MemoryHeader,
  FrontmatterParseResult,
  MemoryIndexEntry,
  MemoryPathConfig,
  MemoryPaths,
  MemoryAgeInfo,
  MemoryRelevanceConfig,
  ScoredEntry,
  RelevanceResult,
  MemoryPromptConfig,
  MemoryPromptResult,
  SaveDecision,
  SaveExclusion,
  SaveValidationResult,
  MemoryStorageProvider
} from '@suga/ai-memory';
export type { MemoryEntry as MemoryFileEntry } from '@suga/ai-memory';
export type { TruncateResult as MemoryTruncateResult } from '@suga/ai-memory';

// === ai-tools — 显式导出（避免TruncateResult与ai-memory冲突） ===
export type {
  FileSystemProvider,
  FileStat,
  FileContent,
  EditResult,
  GrepOutputMode,
  GrepOptions,
  GrepMatchLine,
  GrepFileCount,
  GrepResult,
  RunCommandOptions,
  CommandResult,
  GlobInput,
  GrepInput,
  FileReadInput,
  FileWriteInput,
  FileEditInput,
  BashInput,
  GlobOutput,
  GrepOutput,
  FileReadOutput,
  FileWriteOutput,
  FileEditOutput,
  BashOutput,
  ExtendedToolUseContext
} from '@suga/ai-tools';
export type { TruncateResult as ToolTruncateResult } from '@suga/ai-tools';
