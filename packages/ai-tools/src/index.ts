/** @suga/ai-tools — 工具实现包 barrel 导出 */

// ToolUseContext 扩展类型
export type { ExtendedToolUseContext } from './context-merge';

// 类型导出
export type * from './types/fs-provider';
export type * from './types/http-provider';
export type * from './types/tool-inputs';
export type * from './types/team-provider';
export type * from './types/task-provider';
export type * from './types/tool-outputs';
export type * from './types/search-provider';
export type * from './types/user-interaction-provider';
export type * from './types/skill-provider';
export type * from './types/config-provider';
export type * from './types/mcp-resource-provider';
export type * from './types/plan-mode-provider';
export type * from './types/cron-provider';
export type * from './types/remote-trigger-provider';

// 工具输入 Schema 导出（供宿主构建工具时使用）
export {
  GlobInputSchema,
  GrepInputSchema,
  FileReadInputSchema,
  FileWriteInputSchema,
  FileEditInputSchema,
  BashInputSchema,
  WebFetchInputSchema,
  FileLsInputSchema,
  NotebookEditInputSchema,
  TaskCreateInputSchema,
  TaskGetInputSchema,
  TaskListInputSchema,
  TaskUpdateInputSchema,
  TeamCreateInputSchema,
  TeamDeleteInputSchema,
  SendMessageInputSchema,
  WebSearchInputSchema,
  AskUserQuestionInputSchema,
  SkillInputSchema,
  ConfigInputSchema,
  TaskOutputInputSchema,
  TaskStopInputSchema,
  ListMcpResourcesInputSchema,
  ReadMcpResourceInputSchema,
  EnterPlanModeInputSchema,
  ExitPlanModeInputSchema,
  SleepInputSchema,
  StructuredOutputInputSchema,
  ToolSearchInputSchema,
  EnterWorktreeInputSchema,
  ExitWorktreeInputSchema,
  CronCreateInputSchema,
  CronDeleteInputSchema,
  CronListInputSchema,
  RemoteTriggerInputSchema
} from './types/tool-inputs';

// 纯函数工具导出
export {
  normalizeCurlyQuotes,
  enforceLfLineEndings,
  normalizeContent
} from './utils/path-normalize';
export { truncateOutput } from './utils/output-truncate';
export type { TruncateResult } from './utils/output-truncate';
// P73: Bash输出截断升级导出
export {
  truncateOutputWithTail,
  persistLargeOutput,
  foldSearchOutput
} from './utils/output-truncate-end';
export type {
  EndTruncateResult,
  PersistResult,
  PersistentRef,
  SearchFoldResult
} from './utils/output-truncate-end';
export { isStale } from './utils/staleness-check';
// P14: FileRead去重优化导出
export { FileReadStateCache, FILE_UNCHANGED_STUB } from './utils/file-read-state-cache';
export type { FileReadCacheEntry, DedupCheckResult } from './utils/file-read-state-cache';

// 工具实现导出
export { globTool } from './tools/glob';
export { grepTool } from './tools/grep';
export { fileReadTool } from './tools/file-read';
export { fileWriteTool } from './tools/file-write';
export { fileEditTool } from './tools/file-edit';
export { bashTool } from './tools/bash';
export { webFetchTool } from './tools/web-fetch';
export { fileLsTool } from './tools/file-ls';
export { notebookEditTool } from './tools/notebook-edit';

// Task工具导出
export { taskCreateTool } from './tools/task-create';
export { taskGetTool } from './tools/task-get';
export { taskListTool } from './tools/task-list';
export { taskUpdateTool } from './tools/task-update';

// Team/SendMessage工具导出
export { teamCreateTool } from './tools/team-create';
export { teamDeleteTool } from './tools/team-delete';
export { sendMessageTool } from './tools/send-message';

// P29工具导出
export { webSearchTool } from './tools/web-search';
export { askUserQuestionTool } from './tools/ask-user-question';
export { skillTool } from './tools/skill';
export { configTool } from './tools/config';
export { taskOutputTool } from './tools/task-output';
export { taskStopTool } from './tools/task-stop';

// P30工具导出
export { listMcpResourcesTool } from './tools/list-mcp-resources';
export { readMcpResourceTool } from './tools/read-mcp-resource';
export { enterPlanModeTool } from './tools/enter-plan-mode';
export { exitPlanModeTool } from './tools/exit-plan-mode';
export { sleepTool } from './tools/sleep';
export { structuredOutputTool } from './tools/structured-output';
export { toolSearchTool } from './tools/tool-search';
// P54: ToolSearch 搜索算法导出
export {
  parseToolName,
  parseQuery,
  scoreTool,
  isDeferredTool,
  searchToolsWithKeywords
} from './tools/tool-search';
export type { ParsedQuery } from './tools/tool-search';
export {
  getToolSearchMode,
  isToolSearchEnabled,
  isToolSearchEnabledOptimistic,
  isModelSupportToolReference,
  checkAutoThreshold,
  extractDiscoveredToolNames,
  getDeferredToolsDelta,
  buildDeferredToolsSystemReminder
} from './tools/tool-search-delta';
export type {
  ToolSearchMode,
  DeferredToolsDelta,
  DeferredToolsDeltaScanContext,
  DeferredToolsDeltaAttachment
} from './tools/tool-search-delta';
export { enterWorktreeTool } from './tools/enter-worktree';
export type { WorktreeSession } from './tools/enter-worktree';
export { exitWorktreeTool } from './tools/exit-worktree';

// P94: Cron工具导出
export { cronCreateTool } from './tools/cron-create';
export { cronDeleteTool } from './tools/cron-delete';
export { cronListTool } from './tools/cron-list';

// P95: RemoteTrigger工具导出
export { remoteTriggerTool } from './tools/remote-trigger';
export {
  shouldUseSandbox,
  containsExcludedCommand,
  splitSubcommands,
  stripEnvVars,
  stripSafeWrappers,
  parseExcludedRule,
  matchExcludedRule,
  matchWildcardPattern
} from './tools/should-use-sandbox';
export type { ShouldUseSandboxInput } from './tools/should-use-sandbox';

// P63: Bash命令安全验证导出
export {
  isReadOnlyCommand,
  detectDestructiveCommand,
  detectCommandInjection,
  validateCommandPaths,
  assessBashCommandSecurity,
  BLOCKED_DEVICE_PATHS
} from './tools/bash-security';
export type { BashSecurityAssessment } from './tools/bash-security';

// P64: FileEdit 核心查找逻辑导出
export { findActualString } from './tools/find-actual-string';
export type { FindActualStringResult } from './tools/find-actual-string';

// P65: WebFetch 安全验证导出
export { validateWebFetchUrl, isPermittedRedirect } from './tools/web-fetch-security';
export type { WebFetchSecurityResult } from './tools/web-fetch-security';

// P66: Bash权限规则引擎导出
export {
  SAFE_ENV_VARS,
  isSafeEnvVar,
  hasUnsafeEnvVars,
  containsUnquotedExpansion,
  matchBashPermissionRule,
  DEFAULT_BASH_PERMISSION_RULES
} from './tools/bash-permission-rules';
export type {
  BashPermissionRule,
  BashPermissionMatchResult,
  ExpansionCheckResult
} from './tools/bash-permission-rules';

// P67: FileWriteState 文件读写状态+编码检测导出
export {
  detectFileEncoding,
  detectLineEnding,
  preserveLineEnding,
  encodeContentForWrite,
  checkMtimeConsistency,
  FileWriteStateTracker
} from './tools/file-write-state';
export type { FileEncodingInfo, FileReadState, MtimeCheckResult } from './tools/file-write-state';

// P68: FileRead安全验证导出
export {
  hasBinaryExtension,
  isBlockedDevicePath,
  isUncPath,
  checkFileSize,
  validateFileReadSecurity
} from './tools/file-read-security';
export type { FileSizeCheckResult, FileReadSecurityResult } from './tools/file-read-security';

// P72: FileRead多模态导出
export {
  readImageFile,
  parsePdfPageRange,
  readPdfFile,
  parseNotebook
} from './tools/file-read-multimodal';
export type {
  ImageReadResult,
  ImageResizeOptions,
  ImageResizeProvider,
  PdfReadResult,
  PdfPage,
  PdfTextProvider,
  NotebookReadResult,
  NotebookCell,
  NotebookCellOutput
} from './tools/file-read-multimodal';

// Provider 实现
export { NodeFileSystemProvider } from './provider/NodeFileSystemProvider';
export { YoloPermissionClassifier } from './provider/YoloPermissionClassifier';
export { LLMPermissionClassifier } from './provider/LLMPermissionClassifier';
export type {
  CallModelFn,
  ClassifierModelRequest,
  ClassifierModelResponse,
  LLMClassifierConfig
} from './provider/LLMPermissionClassifier';
export { classifyBashCommand } from './provider/BashCommandClassifier';
export type { BashClassifyResult, BashCommandDecision } from './provider/BashCommandClassifier';
export { DefaultHttpProvider } from './types/http-provider';
export { InMemoryTaskStoreProvider } from './provider/InMemoryTaskStoreProvider';
export { InMemoryTeamProvider } from './provider/InMemoryTeamProvider';
export { InMemoryMailboxProvider } from './provider/InMemoryMailboxProvider';
export { InMemorySearchProvider } from './provider/InMemorySearchProvider';
export { InMemoryUserInteractionProvider } from './provider/InMemoryUserInteractionProvider';
export { InMemorySkillProvider } from './provider/InMemorySkillProvider';
export { InMemoryConfigProvider } from './provider/InMemoryConfigProvider';
export { InMemoryMcpResourceProvider } from './provider/InMemoryMcpResourceProvider';
export { InMemoryPlanModeProvider } from './provider/InMemoryPlanModeProvider';
export { InMemoryCronProvider } from './provider/InMemoryCronProvider';
export { InMemoryRemoteTriggerProvider } from './provider/InMemoryRemoteTriggerProvider';
export { TerminalPermissionPromptHandler } from './provider/TerminalPermissionPromptHandler';
export type { TerminalPermissionPromptConfig } from './provider/TerminalPermissionPromptHandler';
export { NodeSettingsLayerReader } from './provider/NodeSettingsLayerReader';
export type { NodeSettingsLayerReaderConfig } from './provider/NodeSettingsLayerReader';
export { NodeSettingsChangeListener } from './provider/NodeSettingsChangeListener';
export type { NodeSettingsChangeListenerConfig } from './provider/NodeSettingsChangeListener';
export { SandboxFileSystemProvider, SandboxDenyError } from './provider/SandboxFileSystemProvider';
export type { SandboxFileSystemProviderConfig } from './provider/SandboxFileSystemProvider';
export {
  SandboxHttpProvider,
  SandboxSearchProvider,
  SandboxNetworkDenyError
} from './provider/SandboxHttpProvider';
export type {
  SandboxHttpProviderConfig,
  SandboxSearchProviderConfig
} from './provider/SandboxHttpProvider';
