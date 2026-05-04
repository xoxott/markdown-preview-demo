/**
 * @suga/ai-tool-core
 * AI 工具抽象层核心包 — 基于失败封闭默认值的工具定义、注册和执行管线
 */

// 类型导出
export type * from './types';

// 核心实现
export { buildTool, TOOL_DEFAULTS } from './tool';
export { ToolRegistry } from './registry';
export { ToolExecutor } from './executor';
export type { ExecutorResult } from './executor';
export { lazySchema } from './lazy-schema';
export type { LazySchema, LazySchemaFactory } from './lazy-schema';

// 权限管线
export { hasPermissionsToUseTool, resolveHookPermissionWithPipeline } from './permission-pipeline';

// 权限模式函数
export {
  classifyPermissionMode,
  isInteractiveMode,
  isAutoApproveReadonlyMode,
  isRestrictedMode,
  isBypassMode,
  isSilentDenyMode,
  shouldAvoidPermissionPrompts,
  isPlanModeAllowedTool,
  isAcceptEditsDeniedTool,
  isAcceptEditsFastPathTool,
  isClassifierSafeTool,
  PERMISSION_MODES,
  PLAN_MODE_ALLOWED_TOOLS,
  ACCEPT_EDITS_DENIED_TOOLS,
  ACCEPT_EDITS_FAST_PATH_TOOLS,
  CLASSIFIER_SAFE_ALLOWLIST,
  MODE_TRANSITION_MATRIX,
  validateModeTransition
} from './types/permission-mode';

// 权限规则函数
export {
  parsePermissionRuleValue,
  matchPermissionRuleValue,
  matchWildcard
} from './types/permission-rule';

// 权限上下文
export { DEFAULT_TOOL_PERMISSION_CONTEXT, applyPermissionUpdate } from './types/permission-context';

// 权限决策
export {
  MAX_CONSECUTIVE_DENIALS,
  MAX_TOTAL_DENIALS,
  DEFAULT_DENIAL_TRACKING,
  updateDenialTracking
} from './types/permission-decision';

// 权限剥离与恢复
export {
  DANGEROUS_BASH_PATTERNS,
  isDangerousBashPermission,
  stripDangerousPermissionsForAutoMode,
  restoreDangerousPermissions,
  transitionPermissionMode,
  shouldStripOnTransition,
  shouldRestoreOnTransition
} from './types/permission-strip';

// 常量
export {
  DEFAULT_MAX_RESULT_SIZE,
  DEFAULT_SESSION_ID,
  TOOL_NAME_PATTERN,
  TOOL_ALIAS_PATTERN
} from './constants';

// Settings 合并层
export {
  SETTING_LAYERS,
  SETTING_LAYER_PRIORITY,
  getMergeStrategy,
  settingLayerToRuleSource
} from './types/settings-layer';

// Settings Zod Schema
export {
  PermissionRuleStringSchema,
  SettingsPermissionsSectionSchema,
  SettingsSchema
} from './types/settings-schema';

// Settings 合并引擎
export {
  mergeSettingsLayers,
  deepMergeSettings,
  applyPolicyFirstSourceWins,
  settingsMergeCustomizer
} from './types/settings-merge';

// Settings 规则提取与校验
export {
  extractPermissionRulesFromMergedSettings,
  filterInvalidPermissionRules,
  formatSettingsZodError
} from './types/settings-extract';

// Settings → ToolPermissionContext 桥接
export { buildPermissionContextFromSettings } from './types/settings-bridge';

// Settings 缓存
export {
  createEmptySettingsCache,
  invalidateSettingsCache,
  invalidateSettingsSourceCache,
  invalidateSettingsParseCache,
  isInternalWriteProtection
} from './types/settings-cache';

// Settings 加载编排
export { loadSettingsFromDisk } from './settings/SettingsLoader';
export type {
  LoadSettingsFromDiskOptions,
  LoadSettingsFromDiskResult
} from './settings/SettingsLoader';
export { SettingsCacheManager } from './settings/SettingsCacheManager';

// Permission Prompt 用户确认循环
export {
  resolvePermissionPrompt,
  bridgeCanUseToolFnResponse,
  generatePromptRequestId
} from './types/permission-prompt';

// P41: bypass-immune 安全检查
export {
  DANGEROUS_FILES,
  DANGEROUS_DIRECTORIES,
  isDangerousFilePath,
  isDangerousDirectoryPath,
  isDangerousToolInput
} from './types/safety-check';

// 权限决策引擎
export { PermissionDecisionEngine } from './permission-engine';
export type {
  PermissionDecisionLogEntry,
  PermissionDecisionEngineOptions
} from './permission-engine';

// Plan批准流程
export { PlanApproveFlow } from './plan-approve';
export type {
  PlanApproveState,
  PlanStep,
  PlanContent,
  PlanSubmitResult,
  PlanApproveResult,
  PlanApproveFlowOptions
} from './plan-approve';

// 权限事件
export type { PermissionEvent, PermissionEventEmitter } from './types/permission-events';

// 模式切换结果
export type { ModeTransitionResult } from './types/permission-mode';

// P44: 原子竞争权限架构
export { createResolveOnce } from './permission/createResolveOnce';
export { createPermissionContext } from './permission/PermissionContextFactory';
export type {
  HookRunner,
  PersistPermissionFn,
  LogPermissionFn,
  CreatePermissionContextParams
} from './permission/PermissionContextFactory';
export {
  createPermissionQueueOps,
  InMemoryPermissionQueueOps
} from './permission/PermissionQueueOpsFactory';
export {
  canUseToolV3,
  handleInteractivePermission,
  handleCoordinatorPermission
} from './permission/permission-racing';
export type { CanUseToolV3Params } from './permission/permission-racing';
export { handleSwarmWorkerPermission } from './permission/handleSwarmWorkerPermission';
export {
  startSpeculativeClassifierCheck,
  peekSpeculativeClassifierCheck,
  consumeSpeculativeClassifierCheck,
  clearSpeculativeChecks,
  ClassifierResultCache,
  getClassifierCache
} from './permission/SpeculativeClassifierCheck';
