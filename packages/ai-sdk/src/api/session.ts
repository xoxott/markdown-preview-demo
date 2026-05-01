/**
 * session.ts — SDK会话管理API
 *
 * createSession/resumeSession/listSessions等 — stub模式。 对齐Claude Code agentSdkTypes.ts的throw模式。
 */

import type { SDKSessionInfo } from '../sdk/sdkMessages';
import type {
  ForkSessionOptions,
  ForkSessionResult,
  GetSessionMessagesOptions,
  ListSessionsOptions,
  SDKSession,
  SDKSessionOptions
} from '../sdk/runtimeTypes';

/**
 * unstable_v2_createSession() — 创建持久多轮会话（alpha, stub）
 *
 * @param options 会话配置
 * @returns SDKSession对象
 * @throws Error — 'not implemented' stub
 */
export function unstable_v2_createSession(_options?: SDKSessionOptions): Promise<SDKSession> {
  throw new Error('not implemented: unstable_v2_createSession() must be injected by host runtime');
}

/**
 * unstable_v2_resumeSession() — 恢复已有会话（alpha, stub）
 *
 * @param sessionId 会话ID
 * @returns SDKSession对象
 * @throws Error — 'not implemented' stub
 */
export function unstable_v2_resumeSession(_sessionId: string): Promise<SDKSession> {
  throw new Error('not implemented: unstable_v2_resumeSession() must be injected by host runtime');
}

/**
 * getSessionMessages() — 读取会话消息记录（stub）
 *
 * @param sessionId 会话ID
 * @param options 读取选项
 * @returns 消息列表
 * @throws Error — 'not implemented' stub
 */
export function getSessionMessages(
  _sessionId: string,
  _options?: GetSessionMessagesOptions
): Promise<never> {
  throw new Error('not implemented: getSessionMessages() must be injected by host runtime');
}

/**
 * listSessions() — 列出会话元数据（stub）
 *
 * @param options 过滤/分页选项
 * @returns 会话信息列表
 * @throws Error — 'not implemented' stub
 */
export function listSessions(_options?: ListSessionsOptions): Promise<SDKSessionInfo[]> {
  throw new Error('not implemented: listSessions() must be injected by host runtime');
}

/**
 * getSessionInfo() — 获取单个会话信息（stub）
 *
 * @param sessionId 会话ID
 * @returns 会话信息
 * @throws Error — 'not implemented' stub
 */
export function getSessionInfo(_sessionId: string): Promise<SDKSessionInfo> {
  throw new Error('not implemented: getSessionInfo() must be injected by host runtime');
}

/**
 * renameSession() — 重命名会话（stub）
 *
 * @param sessionId 会话ID
 * @param title 新标题
 * @throws Error — 'not implemented' stub
 */
export function renameSession(_sessionId: string, _title: string): Promise<void> {
  throw new Error('not implemented: renameSession() must be injected by host runtime');
}

/**
 * tagSession() — 为会话打标签（stub）
 *
 * @param sessionId 会话ID
 * @param tag 标签（null清除标签）
 * @throws Error — 'not implemented' stub
 */
export function tagSession(_sessionId: string, _tag: string | null): Promise<void> {
  throw new Error('not implemented: tagSession() must be injected by host runtime');
}

/**
 * forkSession() — 从某消息点分叉会话（stub）
 *
 * @param sessionId 原始会话ID
 * @param options 分叉选项
 * @returns 分叉结果
 * @throws Error — 'not implemented' stub
 */
export function forkSession(
  _sessionId: string,
  _options?: ForkSessionOptions
): Promise<ForkSessionResult> {
  throw new Error('not implemented: forkSession() must be injected by host runtime');
}
