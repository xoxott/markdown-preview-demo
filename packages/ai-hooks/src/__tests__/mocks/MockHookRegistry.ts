/** MockHookRegistry — 测试用可控 Hook 注册表 */

import type { HookDefinition, HookEvent } from '../../types/hooks';

/**
 * Mock HookRegistry
 *
 * 内部使用数组，提供 register/getMatchingHooks/getAllHooks 的可控实现。 支持设置指定事件的 Hook 列表。
 */
export class MockHookRegistry {
  private hooks = new Map<HookEvent, HookDefinition[]>();
  private callCounts = new Map<string, number>();

  /** 设置指定事件的 Hook 列表 */
  setHooks(event: HookEvent, definitions: HookDefinition[]): void {
    this.hooks.set(event, definitions);
  }

  /** 注册 Hook */
  register(definition: HookDefinition): void {
    const existing = this.hooks.get(definition.event) ?? [];
    existing.push(definition);
    this.hooks.set(definition.event, existing);
  }

  /** 获取匹配的 Hook 列表 */
  getMatchingHooks(event: HookEvent, matchQuery?: string): HookDefinition[] {
    const definitions = this.hooks.get(event) ?? [];
    return definitions.filter(h => {
      if (matchQuery !== undefined) {
        if (h.matcher === undefined) return true;
        return (
          h.matcher === matchQuery ||
          (h.matcher.includes('*') && matchQuery.startsWith(h.matcher.replace('*', '')))
        );
      }
      return true;
    });
  }

  /** 获取全部 Hook */
  getAllHooks(event: HookEvent): HookDefinition[] {
    return this.hooks.get(event) ?? [];
  }

  /** 移除 Hook */
  remove(_name: string): void {}

  /** 标记 once Hook 已执行 */
  markOnceHookExecuted(_name: string): void {}

  /** 清除所有 */
  clear(): void {
    this.hooks.clear();
    this.callCounts.clear();
  }

  /** 清除 once Hooks */
  clearOnceHooks(): void {}

  /** 获取指定 Hook 的调用次数 */
  getCallCount(name: string): number {
    return this.callCounts.get(name) ?? 0;
  }

  /** 增加调用计数 */
  incrementCallCount(name: string): void {
    this.callCounts.set(name, (this.callCounts.get(name) ?? 0) + 1);
  }
}
