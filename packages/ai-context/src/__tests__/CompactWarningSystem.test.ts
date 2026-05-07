import { describe, expect, it } from 'vitest';
import {
  recordCompactOccurred,
  shouldShowCompactWarning,
  suppressCompactWarning,
  unsuppressCompactWarning
} from '../core/CompactWarningSystem';
import type { CompactWarningState } from '../core/CompactWarningSystem';

const defaultState: CompactWarningState = {
  suppressed: false,
  lastWarningTime: 0,
  compactCount: 0
};

describe('shouldShowCompactWarning', () => {
  it('default state → shows warning', () => {
    expect(shouldShowCompactWarning(defaultState)).toBe(true);
  });

  it('suppressed → no warning', () => {
    const state = suppressCompactWarning(defaultState);
    expect(shouldShowCompactWarning(state)).toBe(false);
  });

  it('expired suppression → shows warning', () => {
    const state: CompactWarningState = {
      suppressed: true,
      suppressedUntil: Date.now() - 1,
      lastWarningTime: 0,
      compactCount: 0
    };
    expect(shouldShowCompactWarning(state)).toBe(true);
  });

  it('disabled config → no warning', () => {
    expect(
      shouldShowCompactWarning(defaultState, {
        enabled: false,
        suppressDurationMs: 300000,
        warnBeforeCompact: true
      })
    ).toBe(false);
  });

  it('warnBeforeCompact=false → no warning', () => {
    expect(
      shouldShowCompactWarning(defaultState, {
        enabled: true,
        suppressDurationMs: 300000,
        warnBeforeCompact: false
      })
    ).toBe(false);
  });
});

describe('suppressCompactWarning', () => {
  it('sets suppressed and suppressedUntil', () => {
    const state = suppressCompactWarning(defaultState);
    expect(state.suppressed).toBe(true);
    expect(state.suppressedUntil).toBeGreaterThan(Date.now());
  });
});

describe('unsuppressCompactWarning', () => {
  it('clears suppressed state', () => {
    const suppressed = suppressCompactWarning(defaultState);
    const unsuppressed = unsuppressCompactWarning(suppressed);
    expect(unsuppressed.suppressed).toBe(false);
    expect(unsuppressed.suppressedUntil).toBeUndefined();
  });
});

describe('recordCompactOccurred', () => {
  it('increments compactCount', () => {
    const state = recordCompactOccurred(defaultState);
    expect(state.compactCount).toBe(1);
    const state2 = recordCompactOccurred(state);
    expect(state2.compactCount).toBe(2);
  });
});
