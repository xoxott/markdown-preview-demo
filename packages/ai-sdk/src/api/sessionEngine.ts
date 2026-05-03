/**
 * sessionEngine.ts — SDK Session引擎注入接口
 *
 * 对齐 query.ts 的 QueryEngineLike/setQueryEngine 模式。 ai-sdk 定义接口+注入，ai-runtime 实现桥接。 SDK消费者只需调用
 * setSessionEngine() 注入实现，然后使用8个session函数。
 */

import type { SDKMessage, SDKSessionInfo } from '../sdk/sdkMessages';
import type {
  ForkSessionOptions,
  ForkSessionResult,
  GetSessionMessagesOptions,
  ListSessionsOptions,
  SDKSession,
  SDKSessionOptions
} from '../sdk/runtimeTypes';

/**
 * SessionEngineLike — 宿主注入的session引擎接口
 *
 * ai-runtime 的 SessionEngineImpl 实现此接口。 ai-sdk 不依赖 ai-runtime（避免循环依赖），通过 setSessionEngine() 注入实例。
 */
export interface SessionEngineLike {
  /** 创建持久多轮会话 */
  createSession(options?: SDKSessionOptions): Promise<SDKSession>;
  /** 恢复已有会话 */
  resumeSession(sessionId: string): Promise<SDKSession>;
  /** 读取会话消息记录 */
  getSessionMessages(
    sessionId: string,
    options?: GetSessionMessagesOptions
  ): Promise<readonly SDKMessage[]>;
  /** 列出会话元数据 */
  listSessions(options?: ListSessionsOptions): Promise<readonly SDKSessionInfo[]>;
  /** 获取单个会话信息 */
  getSessionInfo(sessionId: string): Promise<SDKSessionInfo>;
  /** 重命名会话 */
  renameSession(sessionId: string, title: string): Promise<void>;
  /** 为会话打标签 */
  tagSession(sessionId: string, tag: string | null): Promise<void>;
  /** 从某消息点分叉会话 */
  forkSession(sessionId: string, options?: ForkSessionOptions): Promise<ForkSessionResult>;
}

/** 全局注入的 SessionEngine 实例 */
let sessionEngine: SessionEngineLike | null = null;

/**
 * setSessionEngine — 注入 SessionEngine 实例
 *
 * 在宿主（ai-runtime）初始化时调用：
 *
 * ```ts
 * import { createSessionEngine } from '@suga/ai-runtime';
 * import { setSessionEngine } from '@suga/ai-sdk';
 *
 * const engine = createSessionEngine(runtimeConfig);
 * setSessionEngine(engine);
 * ```
 *
 * @param e SessionEngine 实例（满足 SessionEngineLike 接口）
 */
export function setSessionEngine(e: SessionEngineLike): void {
  sessionEngine = e;
}

/**
 * 获取当前注入的 sessionEngine（内部使用）
 *
 * @returns SessionEngine 实例或 null
 */
export function getSessionEngine(): SessionEngineLike | null {
  return sessionEngine;
}
