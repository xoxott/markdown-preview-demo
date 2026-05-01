/** Settings 状态域操作 */

import type { DeepImmutable } from '../immutable';
import type { AppState, SettingsStateDomain } from './AppState';

/** settings 域默认值 */
export function getDefaultSettingsState(): SettingsStateDomain {
  return {
    settings: {} as DeepImmutable<import('@suga/ai-tool-core').MergedSettings>,
    activeSourceLayers: [],
    settingsCacheValid: true
  };
}

/** 更新 settings */
export function updateSettings(
  state: DeepImmutable<AppState>,
  settings: DeepImmutable<import('@suga/ai-tool-core').MergedSettings>,
  layers: readonly string[]
): DeepImmutable<AppState> {
  return {
    ...state,
    settings: {
      settings,
      activeSourceLayers: layers,
      settingsCacheValid: true
    },
    permissions: {
      ...state.permissions,
      settings
    }
  };
}

/** 缓存失效 */
export function invalidateSettingsCache(state: DeepImmutable<AppState>): DeepImmutable<AppState> {
  return {
    ...state,
    settings: {
      ...state.settings,
      settingsCacheValid: false
    }
  };
}
