/** Session Ingress 类型 — 会话日志持久化接口 */

/** Session Ingress 事件类型 */
export type SessionIngressEventType =
  | 'request_start'
  | 'request_end'
  | 'cache_break'
  | 'rate_limit'
  | 'error';

/** 单条会话日志 */
export interface SessionIngressEntry {
  /** 会话 ID */
  readonly sessionId: string;
  /** 日志时间戳 */
  readonly timestamp: number;
  /** 事件类型 */
  readonly eventType: SessionIngressEventType;
  /** 事件详细数据 */
  readonly data: Record<string, unknown>;
  /** 关联 ID（跨事件串联） */
  readonly correlationId?: string;
}

/** 会话日志查询过滤条件 */
export interface SessionIngressFilter {
  /** 按会话 ID 过滤 */
  readonly sessionId?: string;
  /** 按事件类型过滤 */
  readonly eventType?: SessionIngressEventType;
  /** 起始时间戳 */
  readonly since?: number;
  /** 返回条数上限 */
  readonly limit?: number;
}

/** Session Ingress Provider — 宿主注入接口 */
export interface SessionIngressProvider {
  /** 写入一条会话日志 */
  writeEntry(entry: SessionIngressEntry): Promise<void>;
  /** 查询会话日志 */
  queryEntries(filter: SessionIngressFilter): Promise<SessionIngressEntry[]>;
}
