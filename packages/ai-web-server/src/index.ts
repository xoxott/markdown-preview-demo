/**
 * @suga/ai-web-server
 * Web Session Server — HTTP API + WebSocket 桥接，让浏览器连接 agent session
 */

// 类型导出
export type * from './types';

// 常量导出
export {
  DEFAULT_WEB_PORT,
  DEFAULT_WEB_HOST,
  DEFAULT_CORS_ORIGIN,
  DEFAULT_MAX_SESSIONS,
  DEFAULT_IDLE_TIMEOUT_MS
} from './types/web-server';

// 核心服务器
export { WebSessionServer } from './server/WebSessionServer';

// WebSocket 桥接
export { SessionConnection } from './ws/SessionConnection';
export { PermissionBridge } from './ws/PermissionBridge';
