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
  | PostCompactInput
  // P69: 新增 15种 HookEvent Input
  | PermissionRequestInput
  | PermissionDeniedInput
  | ElicitationInput
  | ElicitationResultInput
  | SetupInput
  | ConfigChangeInput
  | TaskCreatedInput
  | TaskCompletedInput
  | TeammateIdleInput
  | InstructionsLoadedInput
  | CwdChangedInput
  | FileChangedInput
  | WorktreeCreateInput
  | WorktreeRemoveInput;

// ============================================================
// P69: 15种新增 HookEvent Input/Output 类型
// ============================================================

/** PermissionRequest 输入 — 权限请求 */
export interface PermissionRequestInput {
  readonly hookEventName: 'PermissionRequest';
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly decisionSource: 'rules' | 'classifier' | 'interactive';
  readonly suggestedBehavior: 'allow' | 'deny' | 'ask';
}

/** PermissionDenied 输入 — 权限被拒绝 */
export interface PermissionDeniedInput {
  readonly hookEventName: 'PermissionDenied';
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly reason: string;
  readonly denialCount: number;
}

/** Elicitation 输入 — 向用户提问 */
export interface ElicitationInput {
  readonly hookEventName: 'Elicitation';
  readonly questions: readonly { question: string; header?: string; options?: readonly { label: string; description?: string }[]; multiSelect?: boolean }[];
  readonly toolUseId: string;
}

/** ElicitationResult 输入 — 用户回答结果 */
export interface ElicitationResultInput {
  readonly hookEventName: 'ElicitationResult';
  readonly toolUseId: string;
  readonly answers: Record<string, string>;
  readonly annotations?: Record<string, { notes?: string; preview?: string }>;
}

/** Setup 输入 — 初始化设置 */
export interface SetupInput {
  readonly hookEventName: 'Setup';
  readonly sessionId: string;
  readonly projectPath?: string;
  readonly model?: string;
}

/** ConfigChange 输入 — 配置文件变更 */
export interface ConfigChangeInput {
  readonly hookEventName: 'ConfigChange';
  readonly changedFields: readonly string[];
  readonly sourceLayer?: string;
  readonly filePath?: string;
}

/** TaskCreated 输入 — 任务创建 */
export interface TaskCreatedInput {
  readonly hookEventName: 'TaskCreated';
  readonly taskId: string;
  readonly subject: string;
  readonly description?: string;
  readonly owner?: string;
}

/** TaskCompleted 输入 — 任务完成 */
export interface TaskCompletedInput {
  readonly hookEventName: 'TaskCompleted';
  readonly taskId: string;
  readonly subject: string;
  readonly owner?: string;
}

/** TeammateIdle 输入 — 子代理空闲通知 */
export interface TeammateIdleInput {
  readonly hookEventName: 'TeammateIdle';
  readonly teammateName: string;
  readonly teammateType?: string;
  readonly lastMessage?: string;
}

/** InstructionsLoaded 输入 — 系统指令加载完成 */
export interface InstructionsLoadedInput {
  readonly hookEventName: 'InstructionsLoaded';
  readonly sessionId: string;
  readonly systemPrompt?: string;
  readonly memoryContent?: string;
}

/** CwdChanged 输入 — 工作目录变更 */
export interface CwdChangedInput {
  readonly hookEventName: 'CwdChanged';
  readonly previousPath: string;
  readonly newPath: string;
}

/** FileChanged 输入 — 文件内容变更通知 */
export interface FileChangedInput {
  readonly hookEventName: 'FileChanged';
  readonly filePath: string;
  readonly changeType: 'created' | 'modified' | 'deleted';
  readonly mtimeMs?: number;
}

/** WorktreeCreate 输入 — 工作树创建 */
export interface WorktreeCreateInput {
  readonly hookEventName: 'WorktreeCreate';
  readonly worktreeName: string;
  readonly worktreePath: string;
  readonly branchName: string;
}

/** WorktreeRemove 输入 — 工作树移除 */
export interface WorktreeRemoveInput {
  readonly hookEventName: 'WorktreeRemove';
  readonly worktreeName: string;
  readonly worktreePath: string;
  readonly branchName?: string;
}
