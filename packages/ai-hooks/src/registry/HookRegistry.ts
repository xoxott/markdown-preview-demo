/** HookRegistry — Hook 注册和管理器 */

import type { HookDefinition, HookEvent } from '../types/hooks';
import { HOOK_NAME_PATTERN } from '../constants';
import { matchesPattern } from '../utils/match';

/**
 * Hook 注册和管理器
 *
 * 支持注册、移除、查询、匹配。once hooks 执行后自动移除。
 * 匹配逻辑: matcher 支持精确匹配和 glob 模式，不设 matcher 则匹配所有。
 */
export class HookRegistry {
  private readonly hooks = new Map<HookEvent, HookDefinition[]>();
  /** 记录已执行的 once hook 名称，下次 getMatchingHooks 时过滤 */
  private readonly executedOnceHooks = new Set<string>();

  /** 注册 Hook 定义 */
  register<TInput, TOutput>(definition: HookDefinition<TInput, TOutput>): void {
    if (!HOOK_NAME_PATTERN.test(definition.name)) {
      throw new Error(
        `HookRegistry: 名称 "${definition.name}" 不合法，需匹配 ${HOOK_NAME_PATTERN.source}`
      );
    }

    const existing = this.hooks.get(definition.event) ?? [];
    // 检查名称重复
    if (existing.some(h => h.name === definition.name)) {
      throw new Error(`HookRegistry: 名称 "${definition.name}" 已存在于事件 "${definition.event}"`);
    }

    existing.push(definition as HookDefinition);
    this.hooks.set(definition.event, existing);
  }

  /** 移除指定名称的 Hook */
  remove(name: string): void {
    for (const [event, definitions] of this.hooks.entries()) {
      const filtered = definitions.filter(h => h.name !== name);
      if (filtered.length < definitions.length) {
        this.hooks.set(event, filtered);
      }
    }
    this.executedOnceHooks.delete(name);
  }

  /** 获取匹配指定事件和查询条件的 Hook 列表 */
  getMatchingHooks(event: HookEvent, matchQuery?: string): HookDefinition[] {
    const definitions = this.hooks.get(event) ?? [];
    return definitions.filter(h => {
      // once hooks 已执行则跳过
      if (h.once === true && this.executedOnceHooks.has(h.name)) {
        return false;
      }
      // 匹配查询
      if (matchQuery !== undefined) {
        return matchesPattern(matchQuery, h.matcher);
      }
      return true;
    });
  }

  /** 获取指定事件的全部 Hook 列表（不匹配查询，不过滤 once） */
  getAllHooks(event: HookEvent): HookDefinition[] {
    return this.hooks.get(event) ?? [];
  }

  /** 标记 once hook 已执行（由 HookExecutor 调用） */
  markOnceHookExecuted(name: string): void {
    this.executedOnceHooks.add(name);
    // 同时从 hooks Map 中移除
    this.remove(name);
  }

  /** 清除所有 Hook */
  clear(): void {
    this.hooks.clear();
    this.executedOnceHooks.clear();
  }

  /** 清除已执行的 once Hook（仅在 markOnceHookExecuted 未自动移除时使用） */
  clearOnceHooks(): void {
    for (const name of this.executedOnceHooks) {
      this.remove(name);
    }
    this.executedOnceHooks.clear();
  }
}