/**
 * Tips 历史记录 — 跟踪每个 tip 上次展示时的"启动次数"
 *
 * 对齐 CC services/tips/tipHistory.ts。运行时把 tipsHistory 持久化在 globalConfig 中，但 ai-runtime 包不应直接依赖
 * globalConfig，本模块通过 storage adapter 抽象出来。
 */

import type { TipsHistory } from './types';

// ============================================================
// Storage 抽象
// ============================================================

/** Tips 历史存储适配器 — 由宿主环境实现（CLI 写入 globalConfig，SDK 写内存） */
export interface TipsHistoryStore {
  /** 当前已启动的次数（用于 cooldown 计算） */
  getNumStartups(): number;
  /** 当前持久化的 tips 历史 */
  getHistory(): TipsHistory;
  /** 替换性写入 */
  setHistory(history: TipsHistory): void;
}

/** 内存 store（用于测试/SDK） — 不持久化 */
export class InMemoryTipsHistoryStore implements TipsHistoryStore {
  private numStartups = 0;
  private history: TipsHistory = {};

  bumpStartup(): void {
    this.numStartups += 1;
  }

  getNumStartups(): number {
    return this.numStartups;
  }

  getHistory(): TipsHistory {
    return this.history;
  }

  setHistory(history: TipsHistory): void {
    this.history = history;
  }
}

// ============================================================
// API
// ============================================================

/** 记录某个 tip 已展示 */
export function recordTipShown(store: TipsHistoryStore, tipId: string): void {
  const numStartups = store.getNumStartups();
  const history = store.getHistory();
  if (history[tipId] === numStartups) return;
  store.setHistory({ ...history, [tipId]: numStartups });
}

/**
 * 距离上次展示已过去多少 session（启动次数差）
 *
 * 从未展示返回 Infinity（保证立即可见）
 */
export function getSessionsSinceLastShown(store: TipsHistoryStore, tipId: string): number {
  const numStartups = store.getNumStartups();
  const history = store.getHistory();
  const lastShown = history[tipId];
  if (lastShown === undefined) return Infinity;
  return numStartups - lastShown;
}
