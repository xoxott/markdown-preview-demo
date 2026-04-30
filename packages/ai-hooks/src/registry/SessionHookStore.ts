/** InMemorySessionHookStore — 会话级 Hook 内存存储 */

import type { HookDefinition, HookEvent } from '../types/hooks';
import type { FunctionHook, SessionHookStore } from '../types/session';

/** 自增 ID 生成器 */
let functionHookIdCounter = 0;

function nextFunctionHookId(): string {
  functionHookIdCounter++;
  return `fh_${functionHookIdCounter}`;
}

/**
 * InMemorySessionHookStore — 会话级 Hook 内存存储
 *
 * 参考 Claude Code 源码 sessionHooks.ts 的 SessionHooksState 设计:
 * - sessionHooks: Map<HookEvent, HookDefinition[]> — 按事件分组
 * - functionHooks: Map<string, FunctionHook> — 按 ID 索引
 * - 使用 Map 避免 O(N^2) 并发问题（.set/.delete 不触发 listener 通知）
 */
export class InMemorySessionHookStore implements SessionHookStore {
  private readonly sessionHooks = new Map<HookEvent, HookDefinition[]>();
  private readonly functionHooks = new Map<string, FunctionHook>();

  addSessionHook(hook: HookDefinition): void {
    const existing = this.sessionHooks.get(hook.event) ?? [];
    existing.push(hook);
    this.sessionHooks.set(hook.event, existing);
  }

  addFunctionHook(hook: Omit<FunctionHook, 'id'>): string {
    const id = nextFunctionHookId();
    const fullHook: FunctionHook = { ...hook, id };
    this.functionHooks.set(id, fullHook);
    return id;
  }

  removeSessionHook(name: string): void {
    for (const [event, hooks] of this.sessionHooks.entries()) {
      const filtered = hooks.filter(h => h.name !== name);
      if (filtered.length < hooks.length) {
        this.sessionHooks.set(event, filtered);
      }
    }
  }

  removeFunctionHook(id: string): void {
    this.functionHooks.delete(id);
  }

  getSessionHooks(): HookDefinition[] {
    const allHooks: HookDefinition[] = [];
    for (const hooks of this.sessionHooks.values()) {
      allHooks.push(...hooks);
    }
    return allHooks;
  }

  getSessionFunctionHooks(): FunctionHook[] {
    return [...this.functionHooks.values()];
  }

  clearSessionHooks(): void {
    this.sessionHooks.clear();
    this.functionHooks.clear();
  }
}
