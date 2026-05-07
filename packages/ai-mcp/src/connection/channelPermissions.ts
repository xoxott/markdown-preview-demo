/**
 * MCP Channel Permissions — 通过频道转发权限请求
 *
 * 对齐 CC services/mcp/channelPermissions.ts。当 CC 触发权限对话框时，**同时**：
 *
 * - 在本地 UI 弹出
 * - 通过激活的 channel server 推送到 IM/手机
 * - 任意一处 reply 先到先赢（claim 模式）
 *
 * 入站使用结构化事件：channel server 解析用户的 "yes <request_id>" 文本回复 后，调用
 * notifications/claude/channel/permission 协议返回 {request_id, behavior}。
 */

import type {
  ChannelPermissionCallbacks,
  ChannelPermissionRequestParams,
  ChannelPermissionResponse
} from './channelNotification';

/** 权限决策来源 */
export type PermissionDecisionSource =
  | 'local-ui'
  | 'bridge'
  | 'hooks'
  | 'classifier'
  | 'channel'
  | 'mcp-elicitation';

/** 权限决策结果 */
export interface PermissionDecisionResult {
  readonly behavior: 'allow' | 'deny';
  readonly source: PermissionDecisionSource;
  /** 当 source='channel' 时，承载 fromServer */
  readonly fromServer?: string;
}

/** 抢占式权限响应竞速器 */
export class PermissionRaceCoordinator {
  private resolved = false;
  private result: PermissionDecisionResult | null = null;
  private readonly waiters: Array<(result: PermissionDecisionResult) => void> = [];

  /**
   * 第一个调用 claim 的来源胜出，后续调用被忽略
   *
   * @returns 是否成功 claim（先到先赢）
   */
  claim(result: PermissionDecisionResult): boolean {
    if (this.resolved) return false;
    this.resolved = true;
    this.result = result;
    for (const w of this.waiters) {
      w(result);
    }
    this.waiters.length = 0;
    return true;
  }

  /** 等待第一个决策（不超时） */
  wait(): Promise<PermissionDecisionResult> {
    if (this.result) return Promise.resolve(this.result);
    return new Promise(resolve => {
      this.waiters.push(resolve);
    });
  }

  isResolved(): boolean {
    return this.resolved;
  }
}

/** Channel 权限请求发送器 — 由宿主提供（typically MCP client.notification） */
export interface ChannelPermissionRequestSender {
  /**
   * 通过指定 server 推送权限请求
   *
   * 注意：这是出站 notification，CC -> server，不是 zod 校验的入站协议。
   */
  sendPermissionRequest(serverName: string, params: ChannelPermissionRequestParams): Promise<void>;
}

/** 活跃 channel server 名单 */
export interface ActiveChannelsProvider {
  getActiveChannelServers(): readonly string[];
}

// ============================================================
// 主流程
// ============================================================

export interface RequestChannelPermissionOptions {
  readonly requestId: string;
  readonly toolName: string;
  readonly description: string;
  readonly inputPreview: string;
  readonly sender: ChannelPermissionRequestSender;
  readonly callbacks: ChannelPermissionCallbacks;
  readonly activeChannels: ActiveChannelsProvider;
  /** 超时（毫秒）。超时后 unsubscribe 但不 reject */
  readonly timeoutMs?: number;
}

/** 向所有活跃的 channel servers 广播权限请求，等待**任意一个** server 返回响应。返回的 promise 在收到响应或超时时 resolve（超时返回 null）。 */
export async function requestChannelPermission(
  options: RequestChannelPermissionOptions
): Promise<ChannelPermissionResponse | null> {
  const channels = options.activeChannels.getActiveChannelServers();
  if (channels.length === 0) return null;

  const params: ChannelPermissionRequestParams = {
    request_id: options.requestId,
    tool_name: options.toolName,
    description: options.description,
    input_preview: options.inputPreview
  };

  // 并行向所有活跃 channel 发送请求
  await Promise.all(
    channels.map(server =>
      options.sender.sendPermissionRequest(server, params).catch(() => undefined)
    )
  );

  return new Promise(resolve => {
    let settled = false;
    const unsubscribe = options.callbacks.onResponse(options.requestId, response => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(response);
    });

    if (options.timeoutMs && options.timeoutMs > 0) {
      setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        resolve(null);
      }, options.timeoutMs);
    }
  });
}

// ============================================================
// 输入预览 — 截断 + JSON 化
// ============================================================

const PREVIEW_MAX_LENGTH = 200;

/**
 * 截断工具输入用于 preview（避免敏感数据泄漏到手机/IM）
 *
 * @param input 工具输入对象
 * @returns 不超过 PREVIEW_MAX_LENGTH 的 JSON 字符串
 */
export function buildInputPreview(input: unknown): string {
  let json: string;
  try {
    json = JSON.stringify(input);
  } catch {
    json = String(input);
  }
  if (json.length <= PREVIEW_MAX_LENGTH) return json;
  return `${json.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
}
