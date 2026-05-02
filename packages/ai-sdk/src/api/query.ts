/**
 * query.ts — SDK核心查询API
 *
 * query()函数 — 通过宿主注入QueryEngine实现真实调用。 setQueryEngine()在ai-runtime初始化时调用，注入底层编排器。 对齐Claude Code
 * agentSdkTypes.ts的宿主注入模式。
 */

import type { Query, QueryOptions } from '../sdk/runtimeTypes';
import type { SDKMessage } from '../sdk/sdkMessages';

/**
 * QueryEngine 接口 — 宿主注入的真实实现必须满足此接口
 *
 * ai-runtime 的 QueryEngine 类实现此接口。 ai-sdk 不依赖 ai-runtime（避免循环依赖）， 通过 setQueryEngine() 注入实例。
 */
export interface QueryEngineLike {
  /** 执行单次查询，返回 AsyncIterable<SDKMessage> */
  query(prompt: string, options?: QueryOptions): AsyncIterable<SDKMessage>;
}

/** 全局注入的 QueryEngine 实例 */
let engine: QueryEngineLike | null = null;

/**
 * setQueryEngine — 注入 QueryEngine 实例
 *
 * 在宿主（ai-runtime）初始化时调用：
 *
 * ```ts
 * import { createQueryEngine } from '@suga/ai-runtime';
 * import { setQueryEngine } from '@suga/ai-sdk';
 *
 * const engine = createQueryEngine(runtimeConfig);
 * setQueryEngine(engine);
 * ```
 *
 * @param e QueryEngine 实例（满足 QueryEngineLike 接口）
 */
export function setQueryEngine(e: QueryEngineLike): void {
  engine = e;
}

/**
 * query() — 单次查询API
 *
 * 发送提示到Agent，返回 AsyncIterable<SDKMessage>。 必须先调用 setQueryEngine() 注入底层实现。
 *
 * @param prompt 用户提示文本
 * @param options 查询选项
 * @returns AsyncIterable<SDKMessage>
 * @throws Error — 如果未注入 QueryEngine
 */
export function query(prompt: string, options?: QueryOptions): Query {
  if (!engine) {
    throw new Error(
      'not implemented: call setQueryEngine() first to inject a QueryEngine instance'
    );
  }
  return engine.query(prompt, options);
}

/**
 * unstable_v2_prompt() — V2单次提问便捷方法（alpha）
 *
 * 与 query() 功能相同，使用独立的 V2 命名空间。 同样需要先调用 setQueryEngine()。
 *
 * @param prompt 用户提示文本
 * @param options 查询选项
 * @returns AsyncIterable<SDKMessage>
 * @throws Error — 如果未注入 QueryEngine
 */
export function unstable_v2_prompt(prompt: string, options?: QueryOptions): Query {
  if (!engine) {
    throw new Error(
      'not implemented: call setQueryEngine() first to inject a QueryEngine instance'
    );
  }
  return engine.query(prompt, options);
}
