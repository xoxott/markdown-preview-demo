/** Tips 系统 公共导出 */

export type { Tip, TipContext, TipsHistory } from './types';
export { InMemoryTipsHistoryStore, getSessionsSinceLastShown, recordTipShown } from './tipHistory';
export type { TipsHistoryStore } from './tipHistory';
export { TipRegistry, getRelevantTips } from './tipRegistry';
export {
  getTipToShowOnSpinner,
  recordShownTip,
  selectTipWithLongestTimeSinceShown
} from './tipScheduler';
export type { RecordShownTipDeps, TipSchedulerOptions } from './tipScheduler';
