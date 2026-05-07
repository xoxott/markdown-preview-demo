/**
 * MCP Channel 通知系统
 *
 * N14: MCP 服务器推送 inbound 消息的 notification handler。 支持 notifications/claude/channel 协议。
 */

/** Channel 通知消息 */
export interface ChannelNotification {
  readonly type: 'channel_notification';
  readonly serverName: string;
  readonly messageType: 'message' | 'reaction' | 'file_share' | 'status_update';
  readonly content: string;
  readonly sender?: string;
  readonly timestamp: number;
}

/** Channel 权限中继 */
export interface ChannelPermissionRelay {
  readonly type: 'permission_relay';
  readonly serverName: string;
  readonly toolName: string;
  readonly inputHash: string;
  readonly decision: 'allow' | 'deny';
  readonly reason?: string;
}

/** Channel 白名单配置 */
export interface ChannelAllowlistConfig {
  readonly enabled: boolean;
  readonly allowedServers: readonly string[];
  readonly featureFlag?: string;
}

/** ChannelNotificationHandler — 宿主注入接口 */
export interface ChannelNotificationHandler {
  readonly handle: (notification: ChannelNotification) => void;
  readonly handlePermissionRelay: (relay: ChannelPermissionRelay) => 'allow' | 'deny';
}

/** isChannelAllowed — 检查 MCP 服务器是否在频道白名单中 */
export function isChannelAllowed(serverName: string, config: ChannelAllowlistConfig): boolean {
  if (!config.enabled) return false;
  return config.allowedServers.includes(serverName) || config.allowedServers.includes('*');
}
