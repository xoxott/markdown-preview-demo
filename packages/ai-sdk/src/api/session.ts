/**
 * session.ts — SDK会话管理API
 *
 * 从 stub 模式升级为管线模式（与 query.ts 对齐）。 每个函数检查 sessionEngine 是否注入：
 *
 * - 已注入 → 委托调用 sessionEngine 对应方法
 * - 未注入 → throw 描述性错误
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
import { getSessionEngine } from './sessionEngine';

/**
 * unstable_v2_createSession() — 创建持久多轮会话
 *
 * @param options 会话配置
 * @returns SDKSession对象
 * @throws Error — 如果未注入 SessionEngine
 */
export function unstable_v2_createSession(options?: SDKSessionOptions): Promise<SDKSession> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.createSession(options);
}

/**
 * unstable_v2_resumeSession() — 恢复已有会话
 *
 * @param sessionId 会话ID
 * @returns SDKSession对象
 * @throws Error — 如果未注入 SessionEngine
 */
export function unstable_v2_resumeSession(sessionId: string): Promise<SDKSession> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.resumeSession(sessionId);
}

/**
 * getSessionMessages() — 读取会话消息记录
 *
 * @param sessionId 会话ID
 * @param options 读取选项
 * @returns 消息列表
 * @throws Error — 如果未注入 SessionEngine
 */
export function getSessionMessages(
  sessionId: string,
  options?: GetSessionMessagesOptions
): Promise<readonly SDKMessage[]> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.getSessionMessages(sessionId, options);
}

/**
 * listSessions() — 列出会话元数据
 *
 * @param options 过滤/分页选项
 * @returns 会话信息列表
 * @throws Error — 如果未注入 SessionEngine
 */
export function listSessions(options?: ListSessionsOptions): Promise<readonly SDKSessionInfo[]> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.listSessions(options);
}

/**
 * getSessionInfo() — 获取单个会话信息
 *
 * @param sessionId 会话ID
 * @returns 会话信息
 * @throws Error — 如果未注入 SessionEngine
 */
export function getSessionInfo(sessionId: string): Promise<SDKSessionInfo> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.getSessionInfo(sessionId);
}

/**
 * renameSession() — 重命名会话
 *
 * @param sessionId 会话ID
 * @param title 新标题
 * @throws Error — 如果未注入 SessionEngine
 */
export function renameSession(sessionId: string, title: string): Promise<void> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.renameSession(sessionId, title);
}

/**
 * tagSession() — 为会话打标签
 *
 * @param sessionId 会话ID
 * @param tag 标签（null清除标签）
 * @throws Error — 如果未注入 SessionEngine
 */
export function tagSession(sessionId: string, tag: string | null): Promise<void> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.tagSession(sessionId, tag);
}

/**
 * forkSession() — 从某消息点分叉会话
 *
 * @param sessionId 原始会话ID
 * @param options 分叉选项
 * @returns 分叉结果
 * @throws Error — 如果未注入 SessionEngine
 */
export function forkSession(
  sessionId: string,
  options?: ForkSessionOptions
): Promise<ForkSessionResult> {
  const engine = getSessionEngine();
  if (!engine) {
    throw new Error(
      'not implemented: call setSessionEngine() first to inject a SessionEngine instance'
    );
  }
  return engine.forkSession(sessionId, options);
}
