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
export type * from './types/subagent-provider';
export type * from './types/file-edit-log';
export type * from './types/todo-provider';
export type * from './types/lsp-provider';
export type * from './types/powershell-types';

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
  RemoteTriggerInputSchema,
  AgentInputSchema,
  UndoInputSchema,
  TodoWriteInputSchema,
  LspGoToDefinitionInputSchema,
  LspFindReferencesInputSchema,
  LspHoverInputSchema,
  LspDocumentSymbolInputSchema,
  LspDiagnosticsInputSchema,
  LspCompletionInputSchema
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

// P96: Agent工具导出
export { agentTool } from './tools/agent';

// P100: Undo工具导出
export { undoTool } from './tools/undo';

// N5: DiscoverSkills工具导出
export { discoverSkillsTool } from './tools/discover-skills';
export type { DiscoverSkillsOutput, DiscoverSkillsInput } from './tools/discover-skills';
export { DiscoverSkillsInputSchema } from './tools/discover-skills';

// N6: VerifyPlanExecution工具导出
export { verifyPlanTool } from './tools/verify-plan';
export type { VerifyPlanOutput, VerifyPlanInput, PlanStepVerification } from './tools/verify-plan';
export { VerifyPlanInputSchema } from './tools/verify-plan';

// N32: ToolUseSummary 导出
export {
  generateToolUseSummary,
  formatToolCallsForSummary,
  ToolUseSummaryInputSchema
} from './tools/tool-use-summary';
export type {
  ToolUseSummaryInput,
  ToolUseSummaryOutput,
  ToolUseSummaryFn
} from './tools/tool-use-summary';

// N31: DiagnosticTracking 导出
export {
  createInitialDiagnosticState,
  updateDiagnosticBaseline,
  detectDiagnosticChanges,
  getNewErrors,
  getResolvedErrors,
  DEFAULT_DIAGNOSTIC_TRACKING_CONFIG
} from './tools/diagnostic-tracking';
export type {
  DiagnosticSeverity,
  DiagnosticItem,
  DiagnosticChangeType,
  DiagnosticChange,
  DiagnosticTrackingConfig,
  DiagnosticTrackingState
} from './tools/diagnostic-tracking';

// G1: TodoWrite工具导出
export { todoWriteTool } from './tools/todo-write';

// G2: LSP工具导出
export { lspGoToDefinitionTool } from './tools/lsp-go-to-definition';
export { lspFindReferencesTool } from './tools/lsp-find-references';
export { lspHoverTool } from './tools/lsp-hover';
export { lspDocumentSymbolTool } from './tools/lsp-document-symbol';
export { lspDiagnosticsTool } from './tools/lsp-diagnostics';
export { lspCompletionTool } from './tools/lsp-completion';

// G2: LSP Provider导出
export { InMemoryLspProvider } from './provider/InMemoryLspProvider';

// G6: Git操作跟踪导出
export {
  detectGitOperation,
  parseCommitSha,
  parsePRInfo,
  GitOperationTracker
} from './tools/git-tracking';
export type {
  GitOperationType,
  GitOperationDetection,
  CommitShaParseResult,
  PRParseResult,
  GitOperationRecord
} from './tools/git-tracking';

// G5: Diff/Patch工具导出
export {
  structuredPatch,
  getPatchForEdit,
  getSnippet,
  formatPatch,
  applyPatch,
  reversePatch
} from './tools/diff-utils';
export type {
  DiffLineType,
  DiffLine,
  DiffHunk,
  StructuredPatch,
  DiffSnippet
} from './tools/diff-utils';
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
  assessCompoundCommandSecurity,
  splitCommandIntoSegments,
  BLOCKED_DEVICE_PATHS
} from './tools/bash-security';
export type {
  BashSecurityAssessment,
  CompoundSegmentAssessment,
  CompoundCommandAssessment
} from './tools/bash-security';

// G24: Bash图像输出检测导出
export {
  detectSixelImages,
  detectIterm2Images,
  detectImageOutput,
  cleanImageSequences,
  hasImageProtocolSupport
} from './tools/bash-image-output';
export type {
  TerminalImageProtocol,
  DetectedImageOutput,
  ImageDetectionResult
} from './tools/bash-image-output';

// N33: SendUserFile工具导出
export { sendUserFileTool } from './tools/send-user-file';
export { SendUserFileInputSchema } from './tools/send-user-file';
export type { SendUserFileInput, SendUserFileOutput } from './tools/send-user-file';

// G25: Bash命令语义解释导出
export { interpretCommandResult } from './tools/bash-interpret';
export type { CommandResultInterpretation } from './tools/bash-interpret';

// G42: Bash 注释标签提取
export { extractBashCommentLabel } from './tools/bash-comment-label';

// G43: Bash 危险命令警告检测
export {
  getDestructiveCommandWarning,
  getAllDestructiveWarnings
} from './tools/bash-destructive-warning';

// G44: Bash 权限模式验证
export {
  ACCEPT_EDITS_ALLOWED_COMMANDS,
  isFilesystemCommand,
  validateCommandForMode,
  validateCompoundCommandForMode
} from './tools/bash-mode-validation';
export type {
  PermissionMode,
  FilesystemCommand,
  BashModeValidationResult
} from './tools/bash-mode-validation';

// G45: REPL Tool 分类与过滤
export {
  REPL_TOOL_NAME,
  REPL_ONLY_TOOLS,
  isReplModeEnabled,
  isReplOnlyTool,
  filterReplOnlyTools
} from './tools/repl-classification';

// G46: BriefTool (SendUserMessage) 用户友好消息工具
export {
  briefTool,
  BRIEF_TOOL_NAME,
  LEGACY_BRIEF_TOOL_NAME,
  BRIEF_TOOL_DESCRIPTION,
  BRIEF_TOOL_PROMPT,
  BriefInputSchema,
  BriefAttachmentSchema
} from './tools/brief-tool';
export type {
  BriefInput,
  BriefAttachment,
  BriefOutput,
  BriefAttachmentResolver
} from './tools/brief-tool';

// G47: MultiAgent Spawner 多代理启动抽象
export {
  MultiAgentSpawner,
  MultiAgentSpawnError,
  resolveAgentModel,
  sanitizeAgentName
} from './tools/multi-agent-spawner';
export type {
  MultiAgentBackendType,
  MultiAgentSpawnConfig,
  MultiAgentSpawnResult,
  MultiAgentBackend,
  MultiAgentSpawnerOptions
} from './tools/multi-agent-spawner';

// G22: Bash sleep检测重定向导出
export { detectSleepCommand } from './tools/bash-sleep-detect';
export type { SleepDetectResult } from './tools/bash-sleep-detect';

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

// G7: sed -i 拦截导出
export { isSedInPlaceEdit, parseSedEditCommand, applySedSubstitution } from './tools/sedEditParser';
export type { SedEditInfo } from './tools/sedEditParser';
export {
  checkSedConstraints,
  sedCommandIsAllowedByAllowlist,
  containsDangerousOperations
} from './tools/sedValidation';
export type { SedConstraintResult, DangerousOperationsResult } from './tools/sedValidation';

// G30+G31: FileEdit引号风格保留+desanitize导出
export { preserveQuoteStyle } from './tools/file-edit';
export { desanitizeContent, containsSanitizedMarkers } from './tools/file-desanitize';

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
export { InMemorySubagentProvider } from './provider/InMemorySubagentProvider';
export { InMemoryFileEditLog, generateEditId } from './provider/InMemoryFileEditLog';
export { InMemoryTodoWriteProvider } from './provider/InMemoryTodoWriteProvider';

// N15+N31: LSP后端+诊断跟踪
export { InMemoryDiagnosticRegistry } from './provider/InMemoryDiagnosticRegistry';
export type { DiagnosticEntry } from './provider/InMemoryDiagnosticRegistry';
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
