/** 权限状态域操作 — 从 ai-tool-core 类型构建/更新权限域 */

import type { DeepImmutable } from '../immutable';
import type { AppState, PermissionStateDomain } from './AppState';

/** 权限域默认值（ai-tool-core 不安装时仍可用） */
export function getDefaultPermissionState(): PermissionStateDomain {
  return {
    toolPermissionContext: {
      mode: 'default',
      allowRules: [],
      denyRules: [],
      askRules: [],
      workingDirectories: [],
      bypassPermissions: false
    } as DeepImmutable<import('@suga/ai-tool-core').ToolPermissionContext>,
    settings: undefined,
    pendingPermissionBubbles: [],
    currentMode: 'default'
  };
}

/** 更新权限模式 */
export function updatePermissionMode(
  state: DeepImmutable<AppState>,
  mode: import('@suga/ai-tool-core').PermissionMode
): DeepImmutable<AppState> {
  return {
    ...state,
    permissions: {
      ...state.permissions,
      currentMode: mode,
      toolPermissionContext: {
        ...state.permissions.toolPermissionContext,
        mode
      } as DeepImmutable<import('@suga/ai-tool-core').ToolPermissionContext>
    }
  };
}

/** 更新权限上下文 */
export function updatePermissionContext(
  state: DeepImmutable<AppState>,
  ctx: DeepImmutable<import('@suga/ai-tool-core').ToolPermissionContext>
): DeepImmutable<AppState> {
  return {
    ...state,
    permissions: {
      ...state.permissions,
      toolPermissionContext: ctx,
      currentMode: ctx.mode
    }
  };
}

/** 更新 settings（权限域引用） */
export function updatePermissionSettings(
  state: DeepImmutable<AppState>,
  settings: DeepImmutable<import('@suga/ai-tool-core').MergedSettings>
): DeepImmutable<AppState> {
  return {
    ...state,
    permissions: {
      ...state.permissions,
      settings
    }
  };
}
