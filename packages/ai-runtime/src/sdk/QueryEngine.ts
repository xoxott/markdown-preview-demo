/** QueryEngine — SDK query() 的底层编排实现 */

import type { AgentEvent, SDKMessage } from '@suga/ai-sdk';
import type { RuntimeConfig } from '../types/config';
import { RuntimeSession } from '../session/RuntimeSession';
import type { BudgetExceededEvent } from '../session/RuntimeSession';
import { createSDKSystemMessage } from './createSDKSystemMessage';
import { applyQueryOptions } from './applyQueryOptions';
import { fetchSystemPrompt } from './fetchSystemPrompt';
import {
  createSDKMapContext,
  mapAgentEventToSDKMessages,
  updateSDKMapContext
} from './mapAgentEventToSDKMessages';

/**
 * QueryEngine — SDK query() 的编排器
 *
 * 连接 RuntimeSession（AgentEvent流）和 SDK（SDKMessage流）：
 *
 * 1. 创建 RuntimeSession
 * 2. 产出 SDKSystemMessage(init)
 * 3. 调用 session.sendMessage()
 * 4. 迭代 AgentEvent → mapAgentEventToSDKMessages → yield SDKMessage
 *
 * query() 返回 AsyncIterable<SDKMessage>，满足 SDK 契约。
 */
export class QueryEngine {
  private readonly config: RuntimeConfig;

  constructor(config: RuntimeConfig) {
    this.config = config;
  }

  /**
   * 执行单次查询
   *
   * @param prompt 用户提示文本
   * @param options 查询选项（model/abort_signal等）
   * @returns AsyncIterable<SDKMessage> — SDK消费者迭代获取流式响应
   */
  async *query(
    prompt: string,
    options?: { abort_signal?: AbortSignal }
  ): AsyncIterable<SDKMessage> {
    const effectiveConfig = applyQueryOptions(this.config, options as any);

    // P35: 预计算 system prompt（含 memory 注入）
    const systemPrompt = await fetchSystemPrompt(effectiveConfig);

    // 1. 创建会话（传入 systemPrompt）
    const session = new RuntimeSession(effectiveConfig, systemPrompt);

    // 2. 产出系统初始化消息
    yield createSDKSystemMessage(effectiveConfig);

    // 3. 创建映射上下文
    const mapCtx = createSDKMapContext();

    // 4. 迭代 AgentEvent → 映射为 SDKMessage
    for await (const event of session.sendMessage(prompt, options?.abort_signal)) {
      // budget_exceeded 不是 AgentEvent，需要单独处理
      if (isBudgetExceededEvent(event)) {
        // 映射 BudgetExceededEvent 为 SDKCostMessage（待宿主实现）
        continue;
      }

      updateSDKMapContext(mapCtx, event);
      const sdkMessages = mapAgentEventToSDKMessages(event, mapCtx);
      for (const msg of sdkMessages) {
        yield msg;
      }
    }
  }

  /**
   * 多轮对话查询 — 携带历史消息继续对话
   *
   * @param session 已有会话（含历史消息）
   * @param prompt 新用户提示
   * @param options 查询选项
   * @returns AsyncIterable<SDKMessage>
   */
  async *continueQuery(
    session: RuntimeSession,
    prompt: string,
    options?: { abort_signal?: AbortSignal }
  ): AsyncIterable<SDKMessage> {
    const mapCtx = createSDKMapContext();

    for await (const event of session.sendMessage(prompt, options?.abort_signal)) {
      if (isBudgetExceededEvent(event)) {
        continue;
      }

      updateSDKMapContext(mapCtx, event);
      const sdkMessages = mapAgentEventToSDKMessages(event, mapCtx);
      for (const msg of sdkMessages) {
        yield msg;
      }
    }
  }
}

/** 类型窄化：区分 AgentEvent 和 BudgetExceededEvent */
function isBudgetExceededEvent(
  event: AgentEvent | BudgetExceededEvent
): event is BudgetExceededEvent {
  return event.type === 'budget_exceeded';
}
