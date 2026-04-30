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

/** 所有 Hook 输入的判别联合 */
export type HookInput = PreToolUseInput | PostToolUseInput | PostToolUseFailureInput | StopInput;