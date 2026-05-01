/** @suga/ai-state — 响应式状态管理 公共 API */

export { createStore, type Store, type OnChange, type Listener } from './store';
export { createImmutableStore, type DeepImmutable } from './immutable';

export type {
  AppState,
  PermissionStateDomain,
  SettingsStateDomain,
  TaskStateDomain,
  TaskItem,
  AgentStateDomain,
  TeamStateDomain,
  WorkerState,
  InboxMessage,
  UIStateDomain
} from './state/AppState';

export { createAppStateStore, getDefaultAppState } from './state/createAppStateStore';

export {
  getDefaultPermissionState,
  updatePermissionMode,
  updatePermissionContext,
  updatePermissionSettings
} from './state/permissionState';

export {
  getDefaultSettingsState,
  updateSettings,
  invalidateSettingsCache
} from './state/settingsState';
