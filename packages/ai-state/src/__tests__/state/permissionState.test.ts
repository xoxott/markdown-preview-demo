/** 权限状态域操作测试 */

import { describe, expect, it } from 'vitest';
import {
  getDefaultPermissionState,
  updatePermissionContext,
  updatePermissionMode,
  updatePermissionSettings
} from '../../state/permissionState';
import { getDefaultAppState } from '../../state/createAppStateStore';

describe('getDefaultPermissionState', () => {
  it('默认值 — mode=default, 规则空, 无settings', () => {
    const state = getDefaultPermissionState();
    expect(state.currentMode).toBe('default');
    expect(state.toolPermissionContext.mode).toBe('default');
    expect(state.settings).toBeUndefined();
    expect(state.pendingPermissionBubbles).toHaveLength(0);
  });
});

describe('updatePermissionMode', () => {
  it('更新 mode → currentMode + toolPermissionContext.mode 同步变更', () => {
    const appState = getDefaultAppState();
    const updated = updatePermissionMode(appState, 'auto');
    expect(updated.permissions.currentMode).toBe('auto');
    expect(updated.permissions.toolPermissionContext.mode).toBe('auto');
  });

  it('不影响其他域', () => {
    const appState = getDefaultAppState();
    const updated = updatePermissionMode(appState, 'restricted');
    expect(updated.settings.settingsCacheValid).toBe(true);
    expect(updated.tasks.tasks.size).toBe(0);
  });
});

describe('updatePermissionContext', () => {
  it('替换 toolPermissionContext → currentMode 从 ctx.mode 推导', () => {
    const appState = getDefaultAppState();
    const newCtx = {
      mode: 'plan',
      allowRules: [],
      denyRules: [],
      askRules: [],
      workingDirectories: ['/tmp'],
      bypassPermissions: false
    };
    const updated = updatePermissionContext(appState, newCtx as any);
    expect(updated.permissions.currentMode).toBe('plan');
    expect(updated.permissions.toolPermissionContext.mode).toBe('plan');
    expect(updated.permissions.toolPermissionContext.workingDirectories).toEqual(['/tmp']);
  });
});

describe('updatePermissionSettings', () => {
  it('更新 settings → 权限域 settings 字段变更', () => {
    const appState = getDefaultAppState();
    const updated = updatePermissionSettings(appState, { permissions: { allow: ['Read'] } } as any);
    expect(updated.permissions.settings).toBeDefined();
  });

  it('不影响 settings 域（权限域只存引用）', () => {
    const appState = getDefaultAppState();
    const updated = updatePermissionSettings(appState, {} as any);
    expect(updated.settings.settingsCacheValid).toBe(true); // settings域不变
  });
});
