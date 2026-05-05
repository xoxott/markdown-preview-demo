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
  UIStateDomain,
  ConversationStateDomain,
  SessionPersistenceProvider
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

// P89: ConversationState 域更新函数
export {
  getDefaultConversationState,
  appendMessage,
  setCurrentPrompt,
  incrementTurnCount,
  setLastModelResponse,
  initSessionTimestamps,
  resetConversation
} from './state/conversationState';

// P89: 会话持久化
export { InMemorySessionPersistence } from './session/InMemorySessionPersistence';
