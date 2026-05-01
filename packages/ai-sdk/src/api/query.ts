/**
 * query.ts — SDK核心查询API
 *
 * query()函数签名 — stub模式，宿主注入真实实现。 对齐Claude Code agentSdkTypes.ts的throw模式。
 */

import type { Query, QueryOptions } from '../sdk/runtimeTypes';

/**
 * query() — 单次查询API（stub）
 *
 * 发送提示到Agent，返回AsyncIterable<SDKMessage>。 此函数为stub — 宿主必须注入真实实现。
 *
 * @param prompt 用户提示文本
 * @param options 查询选项
 * @returns AsyncIterable<SDKMessage>
 * @throws Error — 'not implemented' stub
 */
export function query(_prompt: string, _options?: QueryOptions): Query {
  throw new Error('not implemented: query() must be injected by host runtime');
}

/**
 * unstable_v2_prompt() — V2单次提问便捷方法（alpha, stub）
 *
 * @param prompt 用户提示文本
 * @param options 查询选项
 * @returns AsyncIterable<SDKMessage>
 * @throws Error — 'not implemented' stub
 */
export function unstable_v2_prompt(_prompt: string, _options?: QueryOptions): Query {
  throw new Error('not implemented: unstable_v2_prompt() must be injected by host runtime');
}
