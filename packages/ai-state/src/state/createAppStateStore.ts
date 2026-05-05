/** 创建 AppState Store — 基于已有 createStore + DeepImmutable */

import type { OnChange, Store } from '../store';
import type { DeepImmutable } from '../immutable';
import { createImmutableStore } from '../immutable';
import type { AppState } from './AppState';
import { getDefaultPermissionState } from './permissionState';
import { getDefaultSettingsState } from './settingsState';

/** 默认 AppState */
export function getDefaultAppState(): DeepImmutable<AppState> {
  return {
    permissions: getDefaultPermissionState(),
    settings: getDefaultSettingsState(),
    tasks: {
      tasks: new Map(),
      foregroundedTaskId: undefined
    },
    agents: {
      agentNameRegistry: new Map(),
      viewingAgentId: undefined,
      viewSelectionMode: 'none',
      agentDefinitions: []
    },
    team: {
      team: undefined,
      workers: new Map(),
      inbox: [],
      isLeader: false
    },
    ui: {
      expandedView: 'none',
      statusLineText: undefined,
      spinnerTip: undefined
    },
    // P89: 对话状态域
    conversation: {
      messages: [],
      currentPrompt: undefined,
      turnCount: 0,
      lastModelResponse: undefined,
      sessionCreatedAt: undefined,
      sessionLastActiveAt: undefined
    }
  } as DeepImmutable<AppState>;
}

/**
 * 创建 AppState Store
 *
 * 使用 createImmutableStore 确保 DeepImmutable<AppState>， onChange 集中式副作用拦截点。
 */
export function createAppStateStore(
  initial?: Partial<DeepImmutable<AppState>>,
  onChange?: OnChange<DeepImmutable<AppState>>
): Store<DeepImmutable<AppState>> {
  const defaultState = getDefaultAppState();
  const mergedState = initial
    ? ({ ...defaultState, ...initial } as DeepImmutable<AppState>)
    : defaultState;
  return createImmutableStore(mergedState, onChange);
}
