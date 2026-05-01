/** Mailbox 抽象接口 + 消息类型 */

/** Mailbox 消息类型 */
export type MailboxMessageType =
  | 'idle_notification'
  | 'task_assignment'
  | 'task_result'
  | 'shutdown_request'
  | 'shutdown_response'
  | 'plan_approval_response'
  | 'permission_request'
  | 'permission_response'
  | 'permission_update'
  | 'settings_update'
  | 'broadcast'
  | 'custom';

/** 结构化消息 */
export interface StructuredMessage {
  readonly type: MailboxMessageType;
  readonly payload: unknown;
}

/** Mailbox 消息 */
export interface MailboxMessage {
  /** 消息唯一 ID */
  readonly messageId: string;
  /** 发送者名称 */
  readonly from: string;
  /** 接收者名称 或 "*" 表示广播 */
  readonly to: string;
  /** 消息内容 (文本 或 结构化消息) */
  readonly content: string | StructuredMessage;
  /** 消息时间戳 */
  readonly timestamp: number;
  /** 可选摘要 (用于 Coordinator 综合汇报) */
  readonly summary?: string;
}

/**
 * Mailbox 抽象接口 — 跨 Worker 消息传递
 *
 * 默认提供 InMemoryMailbox 实现。 下游可替换为文件系统实现或网络实现。
 */
export interface Mailbox {
  /** 发送消息 */
  send(message: MailboxMessage): Promise<void>;
  /** 接收消息 (弹出) */
  receive(recipientName: string): Promise<MailboxMessage[]>;
  /** 广播消息 */
  broadcast(from: string, content: string | StructuredMessage, summary?: string): Promise<void>;
  /** 检查是否有待接收消息 */
  hasPending(recipientName: string): Promise<boolean>;
  /** 清空指定接收者的 inbox */
  clear(recipientName: string): Promise<void>;
  /** 销毁整个 Mailbox */
  destroy(): Promise<void>;
}
