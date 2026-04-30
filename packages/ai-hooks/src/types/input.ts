/** Hook 输入类型 — 各事件的判别联合 */

/** PreToolUse 输入 — 工具执行前 */
export interface PreToolUseInput {
  readonly hookEventName: 'PreToolUse';
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly toolUseId: string;
}

/** PostToolUse 输入 — 工具执行成功后 */
export interface PostToolUseInput {
  readonly hookEventName: 'PostToolUse';
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly toolOutput: unknown;
  readonly toolUseId: string;
}

/** PostToolUseFailure 输入 — 工具执行失败后 */
export interface PostToolUseFailureInput {
  readonly hookEventName: 'PostToolUseFailure';
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly toolUseId: string;
  readonly error: string;
}

/** Stop 输入 — 对话循环结束 */
export interface StopInput {
  readonly hookEventName: 'Stop';
  readonly lastAssistantMessage?: string;
}

/** StopFailure 输入 — 循环异常终止 */
export interface StopFailureInput {
  readonly hookEventName: 'StopFailure';
  readonly error: string;
  readonly transitionType: 'model_error' | 'aborted' | 'max_turns';
}

/** SessionStart 输入 — 循环开始 */
export interface SessionStartInput {
  readonly hookEventName: 'SessionStart';
  readonly userMessage: string;
}

/** SessionEnd 输入 — 循环结束 */
export interface SessionEndInput {
  readonly hookEventName: 'SessionEnd';
  readonly lastAssistantMessage?: string;
  readonly transitionType: string;
  readonly turnCount: number;
}

/** UserPromptSubmit 输入 — 用户消息提交前 */
export interface UserPromptSubmitInput {
  readonly hookEventName: 'UserPromptSubmit';
  readonly userMessage: string;
  readonly sessionId: string;
}

/** Notification 输入 — 模型通知输出 */
export interface NotificationInput {
  readonly hookEventName: 'Notification';
  readonly message: string;
  readonly toolName?: string;
}

/** PreCompact 输入 — 压缩前拦截 */
export interface PreCompactInput {
  readonly hookEventName: 'PreCompact';
  readonly estimatedTokens: number;
  readonly contextWindow: number;
}

/** PostCompact 输入 — 压缩后通知 */
export interface PostCompactInput {
  readonly hookEventName: 'PostCompact';
  readonly originalTokenCount: number;
  readonly compressedTokenCount: number;
  readonly compressionMethod: string;
}

/** 所有 Hook 输入的判别联合 */
export type HookInput =
  | PreToolUseInput
  | PostToolUseInput
  | PostToolUseFailureInput
  | StopInput
  | StopFailureInput
  | SessionStartInput
  | SessionEndInput
  | UserPromptSubmitInput
  | NotificationInput
  | PreCompactInput
  | PostCompactInput;
