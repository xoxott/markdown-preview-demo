/** Leader 端权限请求队列（Permission Bubble Queue） 管理待处理和已处理的权限冒泡 */

import type { PermissionBubbleRequest } from '../types/permission-bubble';

/** 待处理权限冒泡 — 记录请求状态和元数据 */
export interface PendingPermissionBubble {
  /** 权限请求 */
  readonly request: PermissionBubbleRequest;
  /** 请求唯一 ID */
  readonly requestId: string;
  /** 接收时间（ms） */
  readonly receivedAt: number;
  /** 请求状态 */
  readonly status: 'pending' | 'approved' | 'rejected';
}

/**
 * Leader 端权限请求队列 — 管理待处理和已处理的权限冒泡
 *
 * 参考 Claude Code 的 PermissionCallback 管理: Leader 收到 Worker 的权限请求后，将其加入队列等待用户交互处理。 用户决策后，标记请求状态并通知
 * Worker。
 *
 * 队列设计:
 *
 * - 使用 Map 存储，requestId 为键
 * - enqueue: 添加请求到队列，标记 pending
 * - getPending: 获取所有 pending 状态的请求
 * - resolve: Leader 决策后标记 approved/rejected
 * - getStatus: 查询指定请求的状态
 */
export class PermissionBubbleQueue {
  private readonly queue = new Map<string, PendingPermissionBubble>();

  /**
   * 添加请求到队列
   *
   * @param request 权限请求
   * @param requestId 请求唯一 ID
   * @returns 队列条目
   */
  enqueue(request: PermissionBubbleRequest, requestId: string): PendingPermissionBubble {
    const entry: PendingPermissionBubble = {
      request,
      requestId,
      receivedAt: Date.now(),
      status: 'pending'
    };
    this.queue.set(requestId, entry);
    return entry;
  }

  /**
   * 获取所有待处理请求
   *
   * @returns pending 状态的请求列表
   */
  getPending(): PendingPermissionBubble[] {
    return [...this.queue.values()].filter(entry => entry.status === 'pending');
  }

  /**
   * 获取所有请求（包括已处理的）
   *
   * @returns 全部请求列表
   */
  getAll(): PendingPermissionBubble[] {
    return [...this.queue.values()];
  }

  /**
   * 解析请求 — Leader 决策后标记状态
   *
   * @param requestId 请求 ID
   * @param approved 是否批准
   * @returns 更新后的队列条目
   * @throws 如果 requestId 不存在
   */
  resolve(requestId: string, approved: boolean): PendingPermissionBubble {
    const entry = this.queue.get(requestId);
    if (!entry) {
      throw new Error(`权限请求 ${requestId} 不存在于队列中`);
    }

    const updated: PendingPermissionBubble = {
      ...entry,
      status: approved ? 'approved' : 'rejected'
    };
    this.queue.set(requestId, updated);
    return updated;
  }

  /**
   * 获取请求状态
   *
   * @param requestId 请求 ID
   * @returns 队列条目，不存在时返回 undefined
   */
  getStatus(requestId: string): PendingPermissionBubble | undefined {
    return this.queue.get(requestId);
  }

  /**
   * 清除已处理的请求
   *
   * 移除所有 approved/rejected 状态的条目， 保留 pending 状态的请求。
   */
  clearResolved(): void {
    for (const [requestId, entry] of this.queue) {
      if (entry.status !== 'pending') {
        this.queue.delete(requestId);
      }
    }
  }

  /** 队列大小 */
  get size(): number {
    return this.queue.size;
  }
}
