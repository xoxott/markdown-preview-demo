/**
 * Tips 注册表 — 集中存放所有可被调度的 tip
 *
 * 对齐 CC services/tips/tipRegistry.ts。CC 的 tipRegistry 内置了几十条与产品强耦合 的
 * tip（/install-github-app、/permissions、Plan Mode 等），而 ai-runtime 需要把 tip
 * 提供权交给宿主，因此本模块只暴露注册器与过滤逻辑，具体 tip 由宿主在初始化 阶段注册。
 */

import { getSessionsSinceLastShown } from './tipHistory';
import type { TipsHistoryStore } from './tipHistory';
import type { Tip, TipContext } from './types';

// ============================================================
// Registry
// ============================================================

export class TipRegistry {
  private readonly tips = new Map<string, Tip>();

  register(tip: Tip): void {
    this.tips.set(tip.id, tip);
  }

  registerMany(tips: readonly Tip[]): void {
    for (const tip of tips) this.register(tip);
  }

  unregister(id: string): boolean {
    return this.tips.delete(id);
  }

  list(): readonly Tip[] {
    return Array.from(this.tips.values());
  }

  get size(): number {
    return this.tips.size;
  }

  clear(): void {
    this.tips.clear();
  }
}

// ============================================================
// 过滤
// ============================================================

/**
 * 获取相关且未在 cooldown 期的 tips
 *
 * 流程：
 *
 * 1. 全部 tip 并发执行 isRelevant
 * 2. 过滤掉不相关的
 * 3. 过滤掉仍在 cooldown 中的
 */
export async function getRelevantTips(
  registry: TipRegistry,
  store: TipsHistoryStore,
  context?: TipContext
): Promise<Tip[]> {
  const tips = registry.list();
  if (tips.length === 0) return [];
  const relevance = await Promise.all(
    tips.map(async tip => {
      try {
        return await tip.isRelevant(context);
      } catch {
        return false;
      }
    })
  );
  return tips.filter((tip, idx) => {
    if (!relevance[idx]) return false;
    return getSessionsSinceLastShown(store, tip.id) >= tip.cooldownSessions;
  });
}
