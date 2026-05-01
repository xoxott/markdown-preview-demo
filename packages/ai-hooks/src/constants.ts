/** P4 常量定义 */

/** Hook 执行默认超时（ms） — handler 回调模式 */
export const DEFAULT_HOOK_TIMEOUT = 10_000;

/** CommandRunner 默认超时（ms） — 10分钟 */
export const DEFAULT_COMMAND_TIMEOUT = 600_000;

/** PromptRunner 默认超时（ms） — 30秒 */
export const DEFAULT_PROMPT_TIMEOUT = 30_000;

/** AgentRunner 默认超时（ms） — 60秒 */
export const DEFAULT_AGENT_TIMEOUT = 60_000;

/** HttpRunner 默认超时（ms） — 10分钟 */
export const DEFAULT_HTTP_TIMEOUT = 600_000;

/** AgentRunner 默认最大轮次 */
export const DEFAULT_AGENT_MAX_TURNS = 10;

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
