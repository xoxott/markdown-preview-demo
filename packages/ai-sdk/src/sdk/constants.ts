/**
 * constants.ts — SDK常量定义
 *
 * 对齐Claude Code SDK的HOOK_EVENTS + EXIT_REASONS常量数组。 与各子包已有的常量保持一致值。
 */

/** Hook事件名称列表 — 26种Hook事件（对齐Claude Code） */
export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Notification',
  'UserPromptSubmit',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'StopFailure',
  'SubagentStart',
  'SubagentStop',
  'PreCompact',
  'PostCompact',
  'PermissionRequest',
  'PermissionDenied',
  'Setup',
  'TeammateIdle',
  'TaskCreated',
  'TaskCompleted',
  'Elicitation',
  'ElicitationResult',
  'ConfigChange',
  'WorktreeCreate',
  'WorktreeRemove',
  'InstructionsLoaded',
  'CwdChanged',
  'FileChanged'
] as const;

/** Hook事件类型 */
export type HookEventName = (typeof HOOK_EVENTS)[number];

/** 退出原因列表 */
export const EXIT_REASONS = [
  'clear',
  'resume',
  'logout',
  'interrupt',
  'error',
  'complete'
] as const;

/** 退出原因类型 */
export type ExitReason = (typeof EXIT_REASONS)[number];

/** 努力级别 — LLM调用质量控制 */
export type EffortLevel = 'low' | 'medium' | 'high' | 'max';

/** 权限模式 — 对齐ai-tool-core的PermissionMode */
export const PERMISSION_MODES = [
  'default',
  'acceptEdits',
  'bypassPermissions',
  'plan',
  'dontAsk',
  'auto'
] as const;

/** 权限模式类型 */
export type PermissionModeValue = (typeof PERMISSION_MODES)[number];

/** 输出格式 */
export type OutputFormatType = 'text' | 'json' | 'json_schema' | 'streaming_json';

/** 会话状态 */
export type SessionStatusValue =
  | 'initializing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'aborted';
