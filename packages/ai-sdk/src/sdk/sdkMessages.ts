/**
 * sdkMessages.ts — SDK消息类型定义
 *
 * 定义SDK消费者视角的消息类型，对齐Claude Code的23种SDKMessage。 共享类型从sharedTypes.ts引用，避免与controlTypes.ts重复。
 */

import type { AssistantMessage, UserMessage } from '@suga/ai-agent-loop';
import type { TaskDefinition, TaskStatus } from '@suga/ai-coordinator';
import type { SDKAccountInfo, SDKMcpServerInfo, SDKSlashCommand } from './sharedTypes';

// === SDK消息信封 ===

/** SDK消息基础类型标记 */
export interface SDKMessageBase {
  readonly session_id?: string;
  readonly uuid?: string;
}

// === 用户消息 ===

/** SDK用户消息 — 用户发送给Agent的输入 */
export interface SDKUserMessage extends SDKMessageBase {
  readonly type: 'user';
  readonly message: UserMessage;
  readonly isSynthetic?: boolean;
  readonly priority?: 'normal' | 'high';
}

// === 助手消息 ===

/** SDK助手消息 — Agent的响应 */
export interface SDKAssistantMessage extends SDKMessageBase {
  readonly type: 'assistant';
  readonly message: AssistantMessage;
  readonly error?: string;
}

/** SDK部分助手消息 — 流式输出中间状态 */
export interface SDKPartialAssistantMessage extends SDKMessageBase {
  readonly type: 'partial_assistant';
  readonly message: Partial<AssistantMessage>;
}

// === 结果消息 ===

/** SDK成功结果 — Agent轮次完成 */
export interface SDKResultSuccess extends SDKMessageBase {
  readonly type: 'result';
  readonly subtype: 'success';
  readonly result: string;
  readonly duration_ms: number;
  readonly is_error: boolean;
  readonly num_turns: number;
  readonly usage?: SDKUsageInfo;
}

/** SDK错误结果 — Agent轮次出错 */
export interface SDKResultError extends SDKMessageBase {
  readonly type: 'result';
  readonly subtype: 'error' | 'error_tool' | 'error_api' | 'error_interrupt';
  readonly error: string;
  readonly duration_ms: number;
  readonly num_turns: number;
}

/** SDK结果消息联合 */
export type SDKResultMessage = SDKResultSuccess | SDKResultError;

// === 系统消息 ===

/** SDK系统初始化消息 */
export interface SDKSystemMessage extends SDKMessageBase {
  readonly type: 'system';
  readonly subtype: 'init';
  readonly cwd: string;
  readonly tools: readonly string[];
  readonly model: string;
  readonly permissionMode: string;
  readonly slash_commands: readonly SDKSlashCommand[];
  readonly mcp_servers: readonly SDKMcpServerInfo[];
}

// === 状态/进度消息 ===

/** SDK状态消息 */
export interface SDKStatusMessage extends SDKMessageBase {
  readonly type: 'status';
  readonly status: SDKStatus;
}

/** SDK状态枚举 */
export type SDKStatus = 'idle' | 'running' | 'waiting_for_permission' | 'compacting' | 'recovering';

/** SDK工具进度消息 */
export interface SDKToolProgressMessage extends SDKMessageBase {
  readonly type: 'tool_progress';
  readonly tool_use_id: string;
  readonly progress: number;
  readonly message?: string;
}

/** SDKHook启动消息 */
export interface SDKHookStartedMessage extends SDKMessageBase {
  readonly type: 'hook_started';
  readonly hook_event: string;
  readonly hook_name: string;
}

/** SDKHook进度消息 */
export interface SDKHookProgressMessage extends SDKMessageBase {
  readonly type: 'hook_progress';
  readonly hook_event: string;
  readonly progress: number;
}

/** SDKHook响应消息 */
export interface SDKHookResponseMessage extends SDKMessageBase {
  readonly type: 'hook_response';
  readonly hook_event: string;
  readonly result: unknown;
}

// === 上下文压缩 ===

/** SDK压缩边界消息 */
export interface SDKCompactBoundaryMessage extends SDKMessageBase {
  readonly type: 'compact_boundary';
  readonly message: string;
  readonly tokens_before: number;
  readonly tokens_after: number;
}

// === 权限 ===

/** SDK权限拒绝消息 */
export interface SDKPermissionDenialMessage extends SDKMessageBase {
  readonly type: 'permission_denial';
  readonly tool_name: string;
  readonly input: unknown;
  readonly decision: string;
}

// === 任务 ===

/** SDK任务启动消息 */
export interface SDKTaskStartedMessage extends SDKMessageBase {
  readonly type: 'task_started';
  readonly task: TaskDefinition;
}

/** SDK任务进度消息 */
export interface SDKTaskProgressMessage extends SDKMessageBase {
  readonly type: 'task_progress';
  readonly task_id: string;
  readonly progress: number;
  readonly message?: string;
}

/** SDK任务通知消息 */
export interface SDKTaskNotificationMessage extends SDKMessageBase {
  readonly type: 'task_notification';
  readonly task_id: string;
  readonly status: TaskStatus;
  readonly message?: string;
}

// === 其他 ===

/** SDK认证状态消息 */
export interface SDKAuthStatusMessage extends SDKMessageBase {
  readonly type: 'auth_status';
  readonly authenticated: boolean;
  readonly account?: SDKAccountInfo;
}

/** SDK会话状态变更消息 */
export interface SDKSessionStateChangedMessage extends SDKMessageBase {
  readonly type: 'session_state_changed';
  readonly session_id: string;
  readonly status: string;
}

/** SDK提示建议消息 */
export interface SDKPromptSuggestionMessage extends SDKMessageBase {
  readonly type: 'prompt_suggestion';
  readonly suggestions: readonly string[];
}

/** SDK速率限制事件 */
export interface SDKRateLimitEvent extends SDKMessageBase {
  readonly type: 'rate_limit';
  readonly retry_after_ms: number;
  readonly message: string;
}

/** SDK API重试消息 */
export interface SDKAPIRetryMessage extends SDKMessageBase {
  readonly type: 'api_retry';
  readonly attempt: number;
  readonly max_attempts: number;
  readonly error: string;
}

/** SDK轮次后摘要消息 */
export interface SDKPostTurnSummaryMessage extends SDKMessageBase {
  readonly type: 'post_turn_summary';
  readonly summary: string;
  readonly tokens_used: number;
}

/** SDK本地命令输出消息 */
export interface SDKLocalCommandOutputMessage extends SDKMessageBase {
  readonly type: 'local_command_output';
  readonly command: string;
  readonly output: string;
  readonly exit_code: number;
}

/** SDK用户输入完成消息 */
export interface SDKElicitationCompleteMessage extends SDKMessageBase {
  readonly type: 'elicitation_complete';
  readonly result: unknown;
}

/** SDK文件持久化事件 */
export interface SDKFilesPersistedEvent extends SDKMessageBase {
  readonly type: 'files_persisted';
  readonly files: readonly string[];
}

// === N7: 新增 system message 子类型 ===

/** SDK Microcompact 边界消息 — API端增量压缩 */
export interface SDKMicrocompactBoundaryMessage extends SDKMessageBase {
  readonly type: 'microcompact_boundary';
  readonly message: string;
  readonly tokens_before: number;
  readonly tokens_after: number;
}

/** SDK Stop Hook 消息 — hook停止命令执行后的摘要 */
export interface SDKStopHookSummaryMessage extends SDKMessageBase {
  readonly type: 'stop_hook_summary';
  readonly hook_command: string;
  readonly hook_prompt?: string;
  readonly duration_ms: number;
}

/** SDK Away Summary 消息 — 用户返回时的"while you were away"摘要 */
export interface SDKAwaySummaryMessage extends SDKMessageBase {
  readonly type: 'away_summary';
  readonly summary: string;
  readonly duration_absent_ms: number;
}

/** SDK Memory Saved 消息 — 自动记忆保存通知 */
export interface SDKMemorySavedMessage extends SDKMessageBase {
  readonly type: 'memory_saved';
  readonly memory_type: string;
  readonly file_path?: string;
  readonly reason?: string;
}

/** SDK Agents Killed 消息 — 子代理终止通知 */
export interface SDKAgentsKilledMessage extends SDKMessageBase {
  readonly type: 'agents_killed';
  readonly agent_types: readonly string[];
  readonly reason?: string;
}

/** SDK API Metrics 消息 — API调用统计 */
export interface SDKAPIMetricsMessage extends SDKMessageBase {
  readonly type: 'api_metrics';
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_tokens: number;
  readonly cache_read_tokens: number;
  readonly cost_usd?: number;
}

/** SDK Thinking 消息 — thinking/extended thinking 输出 */
export interface SDKThinkingMessage extends SDKMessageBase {
  readonly type: 'thinking';
  readonly thinking: string;
  readonly budget_tokens?: number;
}

/** SDK Connector Text 消息 — streaming connector 原始文本 */
export interface SDKConnectorTextMessage extends SDKMessageBase {
  readonly type: 'connector_text';
  readonly text: string;
  readonly is_delta?: boolean;
}

/** SDK Cost 消息 — 费用追踪更新 */
export interface SDKCostMessage extends SDKMessageBase {
  readonly type: 'cost';
  readonly total_cost_usd: number;
  readonly session_cost_usd?: number;
}

// === N8: MessageOrigin 消息来源标记 ===

/** 消息来源标记 — 区分消息的来源渠道 */
export type MessageOrigin =
  | 'human' // 人类用户直接输入
  | 'channel' // 通过频道(Telegram/iMessage等)
  | 'task_notification' // 任务完成通知
  | 'coordinator' // 协调器分配
  | 'synthetic' // 合成消息(系统注入)
  | 'skill' // Skill触发的输入
  | 'memory'; // 记忆系统注入的上下文

// === N16: CompactProgressEvent ===

/** Compact 进度事件 — 追踪压缩流程的进度 */
export type CompactProgressEventType =
  | 'hooks_start' // hooks 开始执行
  | 'compact_start' // 压缩开始
  | 'compact_end'; // 压缩完成

export interface CompactProgressEvent {
  readonly type: CompactProgressEventType;
  readonly tokensBefore?: number;
  readonly tokensAfter?: number;
  readonly durationMs?: number;
}

// === N36: CompactMetadata ===

/**
 * CompactMetadata — 压缩操作元数据
 *
 * N36: 追踪压缩操作的触发原因和保留信息
 */
export interface CompactMetadata {
  readonly trigger: 'auto' | 'manual' | 'micro' | 'api' | 'fork';
  readonly preTokens: number;
  readonly postTokens: number;
  readonly preservedSegment?: string;
  readonly strategy?: string;
  readonly durationMs?: number;
}

// === 辅助类型 ===

/** SDK使用量信息 */
export interface SDKUsageInfo {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
}

/** SDK会话信息 */
export interface SDKSessionInfo {
  readonly sessionId: string;
  readonly summary?: string;
  readonly lastModified: number;
  readonly fileSize: number;
  readonly customTitle?: string;
  readonly firstPrompt?: string;
  readonly gitBranch?: string;
  readonly cwd?: string;
  readonly tag?: string;
  readonly createdAt?: number;
}

/** SDK消息联合类型 */
export type SDKMessage =
  | SDKUserMessage
  | SDKAssistantMessage
  | SDKPartialAssistantMessage
  | SDKResultSuccess
  | SDKResultError
  | SDKSystemMessage
  | SDKStatusMessage
  | SDKToolProgressMessage
  | SDKHookStartedMessage
  | SDKHookProgressMessage
  | SDKHookResponseMessage
  | SDKCompactBoundaryMessage
  | SDKPermissionDenialMessage
  | SDKTaskStartedMessage
  | SDKTaskProgressMessage
  | SDKTaskNotificationMessage
  | SDKAuthStatusMessage
  | SDKSessionStateChangedMessage
  | SDKPromptSuggestionMessage
  | SDKRateLimitEvent
  | SDKAPIRetryMessage
  | SDKPostTurnSummaryMessage
  | SDKLocalCommandOutputMessage
  | SDKElicitationCompleteMessage
  | SDKFilesPersistedEvent
  | SDKMicrocompactBoundaryMessage
  | SDKStopHookSummaryMessage
  | SDKAwaySummaryMessage
  | SDKMemorySavedMessage
  | SDKAgentsKilledMessage
  | SDKAPIMetricsMessage
  | SDKThinkingMessage
  | SDKConnectorTextMessage
  | SDKCostMessage;
