/**
 * state.ts — 伴侣状态管理（Zustand store）
 *
 * 使用 Zustand 管理 Ink 组件共享的状态：
 *
 * - companion：当前伴侣数据
 * - companionReaction：反应气泡文本
 * - companionPetAt：爱心动画触发时间戳
 * - tick：动画帧计数器
 *
 * Zustand 在 React/Ink 组件中通过 useBuddyStore hook 使用， 辅助函数 setBuddyState/advanceTick 供组件外部调用。
 */
import { create } from 'zustand';
import type { Companion } from './types.js';

export type BuddyState = {
  companion: Companion | undefined;
  companionReaction: string | undefined;
  companionPetAt: number | undefined;
  tick: number;
};

export const useBuddyStore = create<BuddyState>(() => ({
  companion: undefined,
  companionReaction: undefined,
  companionPetAt: undefined,
  tick: 0
}));

/** 批量更新状态字段 */
export function setBuddyState(partial: Partial<BuddyState>) {
  useBuddyStore.setState(partial);
}

/** 推进动画帧计数器（由 setInterval 定时调用） */
export function advanceTick() {
  useBuddyStore.setState(s => ({ tick: s.tick + 1 }));
}
