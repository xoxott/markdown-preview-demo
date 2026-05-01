/** 权限冒泡处理器（Permission Bubble Handler） Worker→Leader Mailbox投递+响应轮询 */

import type { Mailbox, StructuredMessage } from '../types/mailbox';
import type { PermissionBubbleRequest, PermissionBubbleResponse } from '../types/permission-bubble';
import { DEFAULT_MESSAGE_ID_PREFIX } from '../constants';

/**
 * 生成权限请求唯一 ID
 *
 * 格式: perm_{timestamp}_{random}
 */
function generateRequestId(): string {
  return `perm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 将 PermissionBubbleRequest 投递到 Mailbox — Worker 端
 *
 * Worker 需要权限时，通过 Mailbox 向 Leader 发送请求。 请求以 StructuredMessage 格式投递，type='permission_request'。
 *
 * @param mailbox Mailbox 实例
 * @param request 权限请求
 * @param leaderName Leader 名称
 * @returns 请求唯一 ID
 */
export async function sendPermissionBubble(
  mailbox: Mailbox,
  request: PermissionBubbleRequest,
  leaderName: string
): Promise<string> {
  const requestId = request.requestId ?? generateRequestId();
  const enrichedRequest: PermissionBubbleRequest = {
    ...request,
    requestId
  };

  const structured: StructuredMessage = {
    type: 'permission_request',
    payload: enrichedRequest
  };

  await mailbox.send({
    messageId: `${DEFAULT_MESSAGE_ID_PREFIX}_${requestId}`,
    from: request.workerId,
    to: leaderName,
    content: structured,
    timestamp: Date.now(),
    summary: `权限请求: ${request.toolName} (${request.workerName})`
  });

  return requestId;
}

/**
 * 从 Mailbox 接收权限请求 — Leader 端
 *
 * Leader 从自己的 inbox 中提取所有类型为 permission_request 的 StructuredMessage， 解析为 PermissionBubbleRequest
 * 列表。
 *
 * @param mailbox Mailbox 实例
 * @param leaderName Leader 名称
 * @returns 权限请求列表
 */
export async function receivePermissionBubbleRequests(
  mailbox: Mailbox,
  leaderName: string
): Promise<PermissionBubbleRequest[]> {
  const messages = await mailbox.receive(leaderName);
  const requests: PermissionBubbleRequest[] = [];

  for (const msg of messages) {
    if (typeof msg.content === 'object' && msg.content !== null) {
      const structured = msg.content as StructuredMessage;
      if (structured.type === 'permission_request') {
        const payload = structured.payload as PermissionBubbleRequest;
        if (payload.type === 'permission_request') {
          requests.push(payload);
        }
      }
    }
  }

  return requests;
}

/**
 * 将 PermissionBubbleResponse 投递到 Mailbox — Leader 端
 *
 * Leader 决策后，通过 Mailbox 向 Worker 发送响应。 响应以 StructuredMessage 格式投递，type='permission_response'。
 *
 * @param mailbox Mailbox 实例
 * @param response 权限响应
 * @param workerName Worker 名称
 */
export async function sendPermissionBubbleResponse(
  mailbox: Mailbox,
  response: PermissionBubbleResponse,
  workerName: string
): Promise<void> {
  const structured: StructuredMessage = {
    type: 'permission_response',
    payload: response
  };

  await mailbox.send({
    messageId: `${DEFAULT_MESSAGE_ID_PREFIX}_resp_${Date.now()}`,
    from: 'coordinator',
    to: workerName,
    content: structured,
    timestamp: Date.now(),
    summary: `权限响应: ${response.approved ? '批准' : '拒绝'} (${workerName})`
  });
}

/**
 * Worker 轮询权限响应
 *
 * Worker 从自己的 inbox 中查找匹配 requestId 的权限响应。 如果找不到且超时未到，返回 null。
 *
 * @param mailbox Mailbox 实例
 * @param workerName Worker 名称
 * @param requestId 请求 ID（用于匹配响应）
 * @param timeoutMs 超时时间（毫秒，默认 30000）
 * @returns 权限响应，超时或未找到时返回 null
 */
export async function pollPermissionBubbleResponse(
  mailbox: Mailbox,
  workerName: string,
  requestId: string,
  timeoutMs: number = 30000
): Promise<PermissionBubbleResponse | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const messages = await mailbox.receive(workerName);

    for (const msg of messages) {
      if (typeof msg.content === 'object' && msg.content !== null) {
        const structured = msg.content as StructuredMessage;
        if (structured.type === 'permission_response') {
          const payload = structured.payload as PermissionBubbleResponse;
          if (payload.type === 'permission_response' && payload.workerId === workerName) {
            // 如果响应有 requestId，需要匹配
            if (!payload.requestId || payload.requestId === requestId) {
              return payload;
            }
          }
        }
      }
    }

    // 未找到匹配响应，等待一小段时间再重试
    // 注意: 这里不使用 sleep，在实际宿主环境中由宿主实现轮询间隔
    // 在 InMemoryMailbox 场景下，下一次 receive 会立即返回新消息
    // 对于 FileMailbox，宿主需要设置轮询间隔
    if (Date.now() - startTime >= timeoutMs) {
      return null;
    }
  }

  return null;
}
