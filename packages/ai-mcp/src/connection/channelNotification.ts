/**
 * MCP Channel Notification — MCP 频道入站消息推送
 *
 * 对齐 CC services/mcp/channelNotification.ts。让 MCP server（Discord/Slack/SMS 等） 通过
 * `notifications/claude/channel` 协议向对话推入用户消息。
 *
 * 通知处理流程：
 *
 * 1. 接收 notifications/claude/channel
 * 2. 校验 server 是否在白名单
 * 3. 用 <channel> 标签包裹内容
 * 4. enqueue — SleepTool 轮询 hasCommandsInQueue() 并在 1s 内唤醒
 */

import { z } from 'zod';
import type { ChannelAllowlistProvider } from './channelAllowlist';

// ============================================================
// 协议常量
// ============================================================

export const CHANNEL_NOTIFICATION_METHOD = 'notifications/claude/channel';
export const CHANNEL_PERMISSION_METHOD = 'notifications/claude/channel/permission';
export const CHANNEL_PERMISSION_REQUEST_METHOD = 'notifications/claude/channel/permission_request';

export const CHANNEL_TAG = 'channel';

// ============================================================
// Schema
// ============================================================

export const ChannelMessageNotificationSchema = z.object({
  method: z.literal(CHANNEL_NOTIFICATION_METHOD),
  params: z.object({
    content: z.string(),
    /** 透传 — thread_id/user 等任何想给模型看到的 metadata，会渲染成 <channel> 标签的属性 */
    meta: z.record(z.string(), z.string()).optional()
  })
});

export type ChannelMessageNotification = z.infer<typeof ChannelMessageNotificationSchema>;

export const ChannelPermissionNotificationSchema = z.object({
  method: z.literal(CHANNEL_PERMISSION_METHOD),
  params: z.object({
    request_id: z.string(),
    behavior: z.enum(['allow', 'deny'])
  })
});

export type ChannelPermissionNotification = z.infer<typeof ChannelPermissionNotificationSchema>;

// 出站权限请求 — CC -> server。Server 把消息格式化后发给真实用户（手机/IM）
export interface ChannelPermissionRequestParams {
  readonly request_id: string;
  readonly tool_name: string;
  readonly description: string;
  /** JSON 化的工具输入预览（截断到 200 字符 + 省略号） */
  readonly input_preview: string;
}

// ============================================================
// XML 编码 / 注入安全
// ============================================================

/** 仅接受看起来像普通标识符的 meta key（防止 attribute 注入）。 严格于 XML 规范以避免 `x="" injected="y"` 这类断出 attribute 的攻击。 */
const SAFE_META_KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

export function isSafeMetaKey(key: string): boolean {
  return SAFE_META_KEY_RE.test(key);
}

/** XML attribute value 转义 */
export function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 将 channel notification 渲染为 <channel> 标签字符串，注入到对话中
 *
 * @param notification 频道通知
 * @param serverName 来源服务名（标记为 from 属性）
 * @returns 形如 `<channel from="...">content</channel>` 的字符串
 */
export function renderChannelMessage(
  notification: ChannelMessageNotification,
  serverName: string
): string {
  const attrs: string[] = [`from="${escapeXmlAttr(serverName)}"`];
  const meta = notification.params.meta ?? {};
  for (const [key, value] of Object.entries(meta)) {
    if (isSafeMetaKey(key)) {
      attrs.push(`${key}="${escapeXmlAttr(value)}"`);
    }
  }
  return `<${CHANNEL_TAG} ${attrs.join(' ')}>${notification.params.content}</${CHANNEL_TAG}>`;
}

// ============================================================
// Channel Sink — 由宿主接入对话队列
// ============================================================

/** 入站消息推送目标 */
export interface ChannelMessageSink {
  /** 将消息推入用户对话队列 */
  enqueueChannelMessage(rendered: string, sourceServer: string): void;
  /** 队列是否非空（SleepTool 唤醒判定） */
  hasCommandsInQueue(): boolean;
}

/** 频道权限响应 */
export interface ChannelPermissionResponse {
  readonly behavior: 'allow' | 'deny';
  /** 来源 server 名（如 plugin:telegram:tg） */
  readonly fromServer: string;
}

/** 频道权限回调 — 用于注册 request_id 监听器 */
export interface ChannelPermissionCallbacks {
  /** 注册 requestId 的 resolver — 返回 unsubscribe */
  onResponse(requestId: string, handler: (response: ChannelPermissionResponse) => void): () => void;
}

// ============================================================
// 主调度器
// ============================================================

export interface ChannelNotificationDispatcherOptions {
  readonly allowlistProvider: ChannelAllowlistProvider;
  readonly sink: ChannelMessageSink;
  readonly permissionCallbacks?: ChannelPermissionCallbacks;
}

/**
 * Channel 通知调度器
 *
 * 接收原始 notification + 来源 server，做白名单校验后推送到对话队列； 权限响应通过 permissionCallbacks 路由到等待中的 resolver。
 */
export class ChannelNotificationDispatcher {
  private readonly options: ChannelNotificationDispatcherOptions;
  private readonly pendingResolvers = new Map<
    string,
    (response: ChannelPermissionResponse) => void
  >();

  constructor(options: ChannelNotificationDispatcherOptions) {
    this.options = options;
  }

  /**
   * 处理一条 notification — 路由到正确的处理器
   *
   * @returns 是否处理成功（false 表示 schema 不匹配/被拒绝）
   */
  handleNotification(rawNotification: unknown, sourceServer: string): boolean {
    if (!this.options.allowlistProvider.isChannelsEnabled()) return false;

    const messageMatch = ChannelMessageNotificationSchema.safeParse(rawNotification);
    if (messageMatch.success) {
      const rendered = renderChannelMessage(messageMatch.data, sourceServer);
      this.options.sink.enqueueChannelMessage(rendered, sourceServer);
      return true;
    }

    if (this.options.allowlistProvider.isChannelPermissionRelayEnabled()) {
      const permissionMatch = ChannelPermissionNotificationSchema.safeParse(rawNotification);
      if (permissionMatch.success) {
        const { request_id, behavior } = permissionMatch.data.params;
        const resolver = this.pendingResolvers.get(request_id);
        if (resolver) {
          this.pendingResolvers.delete(request_id);
          resolver({ behavior, fromServer: sourceServer });
        }
        return true;
      }
    }

    return false;
  }

  /** 注册一个权限请求的 resolver，等待 server 通过 channel 返回响应 */
  awaitPermissionResponse(
    requestId: string,
    handler: (response: ChannelPermissionResponse) => void
  ): () => void {
    this.pendingResolvers.set(requestId, handler);
    return () => {
      this.pendingResolvers.delete(requestId);
    };
  }
}
