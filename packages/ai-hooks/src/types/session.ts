/** SessionHooks — 会话级动态注册类型定义 */

import type { HookInput } from './input';
import type { HookEvent, HookDefinition } from './hooks';

/** FunctionHookCallback — 会话级函数钩子签名
 *
 * 与 HookHandler 不同，FunctionHookCallback 返回 boolean:
 * - true: 执行成功
 * - false: 阻止后续流程
 */
export type FunctionHookCallback = (
  input: HookInput,
  signal?: AbortSignal
) => boolean | Promise<boolean>;

/** FunctionHook — 会话级函数钩子定义
 *
 * 仅运行时存在，不可持久化。由 addFunctionHook() 注册，removeFunctionHook() 移除。
 */
export interface FunctionHook {
  readonly id: string;
  readonly event: HookEvent;
  readonly matcher?: string;
  readonly callback: FunctionHookCallback;
  readonly timeout?: number;
  readonly errorMessage?: string;
}

/** SessionHookStore — 会话级 Hook 存储
 *
 * 参考 Claude Code 源码 sessionHooks.ts 的 SessionHooksState:
 * - session hooks: 持久化类型的 HookDefinition（command/prompt/http/agent）
 * - function hooks: 运行时回调，通过 addFunctionHook/removeFunctionHook CRUD
 * - 使用 Map（而非 Record）避免 O(N^2) 并发问题
 */
export interface SessionHookStore {
  /** 添加持久化类型 session hook */
  addSessionHook(hook: HookDefinition): void;
  /** 添加 function hook，返回 hookId */
  addFunctionHook(hook: Omit<FunctionHook, 'id'>): string;
  /** 移除指定名称的 session hook */
  removeSessionHook(name: string): void;
  /** 移除指定 id 的 function hook */
  removeFunctionHook(id: string): void;
  /** 获取所有 session hooks（排除 function hooks） */
  getSessionHooks(): HookDefinition[];
  /** 获取所有 function hooks */
  getSessionFunctionHooks(): FunctionHook[];
  /** 清除所有 session hooks 和 function hooks */
  clearSessionHooks(): void;
}
