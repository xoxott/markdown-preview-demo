/**
 * Tips 调度器 — 选择并展示 tip
 *
 * 对齐 CC services/tips/tipScheduler.ts。每次需要展示一条 tip 时，从相关 tip 集合 中挑选"最久未展示过"的那条；展示完毕调用
 * recordShownTip 记录历史。
 */

import { type TipRegistry, getRelevantTips } from './tipRegistry';
import { getSessionsSinceLastShown, recordTipShown } from './tipHistory';
import type { TipsHistoryStore } from './tipHistory';
import type { Tip, TipContext } from './types';

/** 在多条候选 tip 中，挑选距离上次展示最久的那条 */
export function selectTipWithLongestTimeSinceShown(
  store: TipsHistoryStore,
  availableTips: readonly Tip[]
): Tip | undefined {
  if (availableTips.length === 0) return undefined;
  if (availableTips.length === 1) return availableTips[0];

  let best: Tip | undefined;
  let bestSessions = -Infinity;
  for (const tip of availableTips) {
    const sessions = getSessionsSinceLastShown(store, tip.id);
    if (sessions > bestSessions) {
      bestSessions = sessions;
      best = tip;
    }
  }
  return best;
}

/** Spinner Tips 全局开关（由宿主提供 — CLI 从 settings.json 读取） */
export interface TipSchedulerOptions {
  readonly enabled?: boolean;
}

/** 决定本次展示哪条 tip（可能为 undefined：被禁用 / 无候选） */
export async function getTipToShowOnSpinner(
  registry: TipRegistry,
  store: TipsHistoryStore,
  options: TipSchedulerOptions = {},
  context?: TipContext
): Promise<Tip | undefined> {
  if (options.enabled === false) return undefined;
  const tips = await getRelevantTips(registry, store, context);
  return selectTipWithLongestTimeSinceShown(store, tips);
}

/** Tip 展示后回调 — 写入历史 + 触发 onShown 事件 */
export interface RecordShownTipDeps {
  readonly onShown?: (tip: Tip) => void;
}

export function recordShownTip(
  store: TipsHistoryStore,
  tip: Tip,
  deps: RecordShownTipDeps = {}
): void {
  recordTipShown(store, tip.id);
  deps.onShown?.(tip);
}
