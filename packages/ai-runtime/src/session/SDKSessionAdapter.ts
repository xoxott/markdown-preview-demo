/**
 * SDKSessionAdapter — 包装 RuntimeSession 满足 SDKSession 接口
 *
 * 将 RuntimeSession.sendMessage(AgentEvent) 映射为 SDKSession.prompt(SDKMessage)。 通过
 * mapAgentEventToSDKMessages 管线完成一对一映射。
 */

import type { SDKMessage, SDKSession } from '@suga/ai-sdk';
import {
  createSDKMapContext,
  mapAgentEventToSDKMessages,
  updateSDKMapContext
} from '../sdk/mapAgentEventToSDKMessages';
import type { RuntimeSession } from './RuntimeSession';

/**
 * SDKSessionAdapter — 将 RuntimeSession 适配为 SDKSession 接口
 *
 * SDKSession 接口:
 *
 * - prompt(message) → AsyncIterable<SDKMessage>
 * - abort() → Promise<void>
 * - close() → Promise<void>
 * - sessionId → string
 *
 * RuntimeSession 对应:
 *
 * - sendMessage(message) → AsyncGenerator<AgentEvent>
 * - pause() → void
 * - destroy() → Promise<void>
 * - getSessionId() → string
 */
export class SDKSessionAdapter implements SDKSession {
  private readonly runtimeSession: RuntimeSession;

  constructor(runtimeSession: RuntimeSession) {
    this.runtimeSession = runtimeSession;
  }

  /** 会话ID — 映射 RuntimeSession.getSessionId() */
  get sessionId(): string {
    return this.runtimeSession.getSessionId();
  }

  /** 发送消息 — 映射 sendMessage(AgentEvent) → prompt(SDKMessage) */
  async *prompt(message: string): AsyncIterable<SDKMessage> {
    const mapCtx = createSDKMapContext();

    for await (const event of this.runtimeSession.sendMessage(message)) {
      updateSDKMapContext(mapCtx, event);

      const sdkMessages = mapAgentEventToSDKMessages(event, mapCtx);
      for (const msg of sdkMessages) {
        yield msg;
      }
    }
  }

  /** 中止当前轮次 — 映射 RuntimeSession.pause() */
  async abort(): Promise<void> {
    this.runtimeSession.pause();
  }

  /** 关闭会话 — 映射 RuntimeSession.destroy() */
  async close(): Promise<void> {
    await this.runtimeSession.destroy();
  }

  /** 获取底层 RuntimeSession（内部使用） */
  getRuntimeSession(): RuntimeSession {
    return this.runtimeSession;
  }
}
