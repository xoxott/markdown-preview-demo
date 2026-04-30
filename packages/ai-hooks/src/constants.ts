/** P4 常量定义 */

/** Hook 执行默认超时（ms） */
export const DEFAULT_HOOK_TIMEOUT = 10_000;

/** Hook 名称合法正则 */
export const HOOK_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/** 所有 HookEvent 事件名数组 — 与 HookEvent 类型保持同步 */
export const HOOK_EVENTS: readonly string[] = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Stop',
  'StopFailure',
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'Notification',
  'PreCompact',
  'PostCompact'
];
