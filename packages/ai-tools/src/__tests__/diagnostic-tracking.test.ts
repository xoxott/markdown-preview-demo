import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIAGNOSTIC_TRACKING_CONFIG,
  createInitialDiagnosticState,
  getNewErrors,
  getResolvedErrors,
  updateDiagnosticBaseline
} from '../tools/diagnostic-tracking';
import type { DiagnosticItem } from '../tools/diagnostic-tracking';

const makeDiag = (
  id: string,
  filePath: string,
  severity: 'error' | 'warning' | 'information' | 'hint',
  message: string
): DiagnosticItem => ({
  id,
  filePath,
  severity,
  message
});

describe('createInitialDiagnosticState', () => {
  it('creates empty state', () => {
    const state = createInitialDiagnosticState();
    expect(state.baseline).toHaveLength(0);
    expect(state.changes).toHaveLength(0);
  });
});

describe('updateDiagnosticBaseline', () => {
  it('updates baseline and detects changes', () => {
    const state = createInitialDiagnosticState();
    const diags = [makeDiag('d1', '/a.ts', 'error', 'Type error')];
    const updated = updateDiagnosticBaseline(state, diags);
    expect(updated.baseline).toHaveLength(1);
    expect(updated.changes.filter(c => c.type === 'added')).toHaveLength(1);
  });

  it('detects removals', () => {
    const state1 = createInitialDiagnosticState();
    const diags1 = [
      makeDiag('d1', '/a.ts', 'error', 'err'),
      makeDiag('d2', '/b.ts', 'warning', 'warn')
    ];
    const state2 = updateDiagnosticBaseline(state1, diags1);
    // Remove d1, keep d2
    const diags2 = [makeDiag('d2', '/b.ts', 'warning', 'warn')];
    const state3 = updateDiagnosticBaseline(state2, diags2);
    expect(state3.changes.filter(c => c.type === 'removed')).toHaveLength(1);
  });

  it('detects modifications', () => {
    const state1 = createInitialDiagnosticState();
    const diags1 = [makeDiag('d1', '/a.ts', 'warning', 'old msg')];
    const state2 = updateDiagnosticBaseline(state1, diags1);
    const diags2 = [makeDiag('d1', '/a.ts', 'error', 'new msg')];
    const state3 = updateDiagnosticBaseline(state2, diags2);
    expect(state3.changes.filter(c => c.type === 'modified')).toHaveLength(1);
  });

  it('disabled → no update', () => {
    const state = createInitialDiagnosticState();
    const updated = updateDiagnosticBaseline(state, [makeDiag('d1', '/a.ts', 'error', 'err')], {
      ...DEFAULT_DIAGNOSTIC_TRACKING_CONFIG,
      enabled: false
    });
    expect(updated.baseline).toHaveLength(0);
  });
});

describe('getNewErrors/getResolvedErrors', () => {
  it('filters new errors', () => {
    const state = createInitialDiagnosticState();
    const diags = [
      makeDiag('e1', '/a.ts', 'error', 'Type error'),
      makeDiag('w1', '/b.ts', 'warning', 'Warning')
    ];
    const updated = updateDiagnosticBaseline(state, diags);
    expect(getNewErrors(updated.changes)).toHaveLength(1);
  });

  it('filters resolved errors', () => {
    const state1 = createInitialDiagnosticState();
    const diags1 = [
      makeDiag('e1', '/a.ts', 'error', 'err'),
      makeDiag('w1', '/b.ts', 'warning', 'warn')
    ];
    const state2 = updateDiagnosticBaseline(state1, diags1);
    const diags2 = [makeDiag('w1', '/b.ts', 'warning', 'warn')]; // e1 resolved
    const state3 = updateDiagnosticBaseline(state2, diags2);
    expect(getResolvedErrors(state3.changes)).toHaveLength(1);
  });
});

describe('DEFAULT_DIAGNOSTIC_TRACKING_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_DIAGNOSTIC_TRACKING_CONFIG.enabled).toBe(true);
    expect(DEFAULT_DIAGNOSTIC_TRACKING_CONFIG.maxBaselineSize).toBe(500);
  });
});
