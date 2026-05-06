import { describe, expect, it } from 'vitest';
import { IDLE_SPECULATION_STATE } from '../types/speculation';
import type { CompletionBoundary, CompletionBoundaryType } from '../types/completion-boundary';
import type { SpeculationResult } from '../types/speculation';
import type { StateChangeEffect } from '../types/state-change-effect';
import { createStateChangeBridge } from '../types/state-change-effect';
import { getActiveAgentForInput, selectState } from '../core/selectors';
import type { AppState } from '../state/AppState';

describe('CompletionBoundary', () => {
  it('type values are correct', () => {
    const types: CompletionBoundaryType[] = [
      'complete',
      'bash_complete',
      'edit_complete',
      'tool_complete',
      'denied_tool'
    ];
    expect(types).toHaveLength(5);
  });

  it('interface is usable', () => {
    const boundary: CompletionBoundary = {
      type: 'bash_complete',
      toolName: 'bash',
      timestamp: Date.now(),
      turnIndex: 1
    };
    expect(boundary.type).toBe('bash_complete');
  });
});

describe('SpeculationState', () => {
  it('IDLE_SPECULATION_STATE is idle', () => {
    expect(IDLE_SPECULATION_STATE.phase).toBe('idle');
  });

  it('SpeculationResult interface is usable', () => {
    const result: SpeculationResult = {
      phase: 'completed',
      estimatedTokens: 5000,
      estimatedCostUsd: 0.01
    };
    expect(result.phase).toBe('completed');
  });
});

describe('StateChangeBridge', () => {
  it('creates bridge and notifies', () => {
    const effects: StateChangeEffect[] = [];
    const bridge = createStateChangeBridge(effect => effects.push(effect));
    bridge.notify('permission_mode', 'mode', 'ask', 'auto');
    expect(effects).toHaveLength(1);
    expect(effects[0].category).toBe('permission_mode');
    expect(effects[0].newValue).toBe('auto');
  });

  it('accumulates processed effects', () => {
    const bridge = createStateChangeBridge(() => {});
    bridge.notify('settings', 'theme', 'dark', 'light');
    bridge.notify('settings', 'lang', 'en', 'zh');
    expect(bridge.processedEffects).toHaveLength(2);
  });
});

describe('selectors', () => {
  it('getActiveAgentForInput returns undefined for empty state', () => {
    // Minimal AppState mock
    const state = { conversation: { messages: [], turnCount: 0 } } as unknown as AppState;
    expect(getActiveAgentForInput(state)).toBeUndefined();
  });

  it('selectState finds key across domains', () => {
    const state = { settings: { settingsCacheValid: true } } as unknown as AppState;
    expect(selectState<boolean>(state, 'settingsCacheValid')).toBe(true);
  });

  it('selectState returns undefined for unknown key', () => {
    const state = {} as unknown as AppState;
    expect(selectState(state, 'nonexistent')).toBeUndefined();
  });
});
