/** mapAgentEventToSDKMessages — AgentEvent → SDKMessage 映射纯函数 */

import type { AgentEvent, LoopResult } from '@suga/ai-agent-loop';
import type {
  SDKMessage,
  SDKPartialAssistantMessage,
  SDKResultError,
  SDKResultSuccess,
  SDKUsageInfo
} from '@suga/ai-sdk';

/** 映射上下文 — 携带会话级信息（usage/时间等）供 loop_end 映射使用 */
export interface SDKMapContext {
  /** 会话开始时间（ms） */
  startTime: number;
  /** 累积轮次计数 */
  turnCount: number;
  /** 累积 usage（从 ctx.meta.usage 或 loop_end meta 收集） */
  usage: SDKUsageInfo | undefined;
}

/** 创建空映射上下文 */
export function createSDKMapContext(): SDKMapContext {
  return {
    startTime: Date.now(),
    turnCount: 0,
    usage: undefined
  };
}

/** 从 AgentEvent 更新映射上下文 */
export function updateSDKMapContext(ctx: SDKMapContext, event: AgentEvent): SDKMapContext {
  if (event.type === 'turn_start') {
    ctx.turnCount = event.turnCount;
  }

  if (event.type === 'turn_end') {
    ctx.turnCount = event.turnCount;
  }

  // loop_end → 从 result.usage harvest 累积 usage
  if (event.type === 'loop_end' && event.result.usage) {
    const u = event.result.usage;
    ctx.usage = {
      input_tokens: ctx.usage ? ctx.usage.input_tokens + u.inputTokens : u.inputTokens,
      output_tokens: ctx.usage ? ctx.usage.output_tokens + u.outputTokens : u.outputTokens,
      cache_creation_input_tokens: u.cacheCreationInputTokens,
      cache_read_input_tokens: u.cacheReadInputTokens
    };
  }

  return ctx;
}

/** 设置 usage（外部从 ctx.meta.usage 注入） */
export function setSDKMapContextUsage(ctx: SDKMapContext, usage: SDKUsageInfo): SDKMapContext {
  ctx.usage = usage;
  return ctx;
}

/**
 * 将 AgentEvent 映射为 SDKMessage 数组
 *
 * 7种AgentEvent → 24种SDKMessage 的核心映射：
 *
 * - text_delta → SDKPartialAssistantMessage (content)
 * - thinking_delta → SDKPartialAssistantMessage (thinking)
 * - tool_use_start → SDKPartialAssistantMessage (toolUses)
 * - tool_result → SDKToolProgressMessage
 * - turn_start → SDKStatusMessage (running)
 * - turn_end → 无SDKMessage（内部聚合点）
 * - loop_end → SDKResultSuccess 或 SDKResultError
 *
 * @param event AgentEvent
 * @param ctx 映射上下文（携带会话级信息）
 * @returns SDKMessage[] （一个AgentEvent可映射为0-2个SDKMessage）
 */
export function mapAgentEventToSDKMessages(event: AgentEvent, ctx: SDKMapContext): SDKMessage[] {
  switch (event.type) {
    case 'text_delta':
      return [createPartialAssistant({ content: event.delta })];

    case 'thinking_delta':
      return [createPartialAssistant({ thinking: event.delta })];

    case 'tool_use_start':
      return [createPartialAssistant({ toolUses: [event.toolUse] })];

    case 'tool_result':
      return [
        {
          type: 'tool_progress',
          tool_use_id: event.result.toolUseId,
          progress: 100,
          message: event.result.error ?? `Tool ${event.result.toolName} completed`
        }
      ];

    case 'turn_start':
      return [{ type: 'status', status: 'running' }];

    case 'turn_end':
      // 无直接映射 — turn_end是内部聚合点
      return [];

    case 'loop_end':
      return mapLoopEnd(event.result, ctx);

    default:
      return [];
  }
}

/** 映射 loop_end → SDKResultSuccess/SDKResultError */
function mapLoopEnd(result: LoopResult, ctx: SDKMapContext): SDKMessage[] {
  const durationMs = Date.now() - ctx.startTime;

  if (result.type === 'completed') {
    const successMsg: SDKResultSuccess = {
      type: 'result',
      subtype: 'success',
      result: result.reason,
      duration_ms: durationMs,
      is_error: false,
      num_turns: ctx.turnCount + 1,
      usage: ctx.usage
    };
    return [successMsg];
  }

  if (result.type === 'aborted') {
    const errorMsg: SDKResultError = {
      type: 'result',
      subtype: 'error_interrupt',
      error: result.reason,
      duration_ms: durationMs,
      num_turns: ctx.turnCount + 1
    };
    return [errorMsg];
  }

  if (result.type === 'model_error') {
    // result.reason 包含 error 信息（TerminalTransition { type, reason, error } 但 LoopResult.reason 是 string）
    const errorMsg: SDKResultError = {
      type: 'result',
      subtype: 'error_api',
      error: result.reason,
      duration_ms: durationMs,
      num_turns: ctx.turnCount + 1
    };
    return [errorMsg];
  }

  // max_turns 或其他终止类型
  const errorMsg: SDKResultError = {
    type: 'result',
    subtype: 'error',
    error: result.reason,
    duration_ms: durationMs,
    num_turns: ctx.turnCount + 1
  };
  return [errorMsg];
}

/** 创建 SDKPartialAssistantMessage 的辅助函数 */
function createPartialAssistant(fields: {
  content?: string;
  thinking?: string;
  toolUses?: readonly import('@suga/ai-agent-loop').ToolUseBlock[];
}): SDKPartialAssistantMessage {
  return {
    type: 'partial_assistant',
    message: {
      id: undefined,
      role: 'assistant',
      timestamp: undefined,
      ...fields
    }
  };
}
