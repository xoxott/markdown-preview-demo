/** Selectors — 派生状态计算函数 */

import type { AppState } from '../state/AppState';

/** 获取当前活动 agent 的输入模型 */
export function getActiveAgentForInput(state: AppState): string | undefined {
  return state.conversation?.lastModelResponse;
}

/** 获取指定 key 的状态值 — 跨域查找 */
export function selectState<T>(state: AppState, key: string): T | undefined {
  const domains: readonly Record<string, unknown>[] = [
    state.permissions as unknown as Record<string, unknown>,
    state.settings as unknown as Record<string, unknown>,
    state.conversation as unknown as Record<string, unknown>,
    state.agents as unknown as Record<string, unknown>,
    state.team as unknown as Record<string, unknown>,
    state.ui as unknown as Record<string, unknown>
  ];

  for (const domain of domains) {
    if (domain && key in domain) {
      return domain[key] as T;
    }
  }
  return undefined;
}
