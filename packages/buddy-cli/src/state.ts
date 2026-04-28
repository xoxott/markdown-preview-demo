import { create } from 'zustand';
import type { Companion } from './types.js';

// ---------------------------------------------------------------------------
// Buddy state — Zustand store replacing CC's AppStateStore
// ---------------------------------------------------------------------------

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

// Helper: set multiple fields at once
export function setBuddyState(partial: Partial<BuddyState>) {
  useBuddyStore.setState(partial);
}

// Helper: advance tick (called by animation timer)
export function advanceTick() {
  useBuddyStore.setState(s => ({ tick: s.tick + 1 }));
}
