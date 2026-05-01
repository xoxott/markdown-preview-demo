/** Settings 状态域操作测试 */

import { describe, expect, it } from 'vitest';
import {
  getDefaultSettingsState,
  invalidateSettingsCache,
  updateSettings
} from '../../state/settingsState';
import { getDefaultAppState } from '../../state/createAppStateStore';

describe('getDefaultSettingsState', () => {
  it('默认值 — 空配置 + 缓存有效', () => {
    const state = getDefaultSettingsState();
    expect(state.settings).toEqual({});
    expect(state.activeSourceLayers).toHaveLength(0);
    expect(state.settingsCacheValid).toBe(true);
  });
});

describe('updateSettings', () => {
  it('更新 settings → settings域 + permissions域同步', () => {
    const appState = getDefaultAppState();
    const updated = updateSettings(appState, { permissions: { allow: ['Read'] } } as any, [
      'project'
    ]);
    expect(updated.settings.settings).toBeDefined();
    expect(updated.settings.activeSourceLayers).toEqual(['project']);
    expect(updated.settings.settingsCacheValid).toBe(true);
    // 权限域也引用了 settings
    expect(updated.permissions.settings).toBeDefined();
  });
});

describe('invalidateSettingsCache', () => {
  it('缓存失效 → settingsCacheValid=false', () => {
    const appState = getDefaultAppState();
    const updated = updateSettings(appState, { permissions: {} } as any, ['project']);
    expect(updated.settings.settingsCacheValid).toBe(true);
    const invalidated = invalidateSettingsCache(updated);
    expect(invalidated.settings.settingsCacheValid).toBe(false);
  });

  it('失效不影响 settings 内容', () => {
    const appState = getDefaultAppState();
    const updated = updateSettings(appState, { permissions: { allow: ['Read'] } } as any, [
      'project'
    ]);
    const invalidated = invalidateSettingsCache(updated);
    expect(invalidated.settings.activeSourceLayers).toEqual(['project']);
  });
});
