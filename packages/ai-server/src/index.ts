/**
 * @suga/ai-server — Headless Server + Daemon 公共 API
 *
 * 无UI环境Agent执行 + stdin/stdout JSON流通信 + 进程级生命周期管理。
 */

// === 核心实现 ===
export { DaemonLifecycle } from './core/DaemonLifecycle';
export { DaemonSessionManager } from './core/DaemonSessionManager';
export { NodeHeadlessIO } from './io/HeadlessIO';
export { DaemonServer } from './daemon/DaemonServer';

// === 类型导出 ===
export type * from './types/server';

// === Zod Schema导出 ===
export {
  DaemonConfigSchema,
  ServerConnectResponseSchema,
  DEFAULT_DAEMON_CONFIG
} from './types/server';
