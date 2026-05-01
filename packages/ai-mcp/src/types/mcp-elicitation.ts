/**
 * MCP Elicitation 类型定义
 *
 * Elicitation 是 MCP 的用户信息请求机制， 允许 MCP 服务器向用户请求额外信息或确认
 */

/** Elicitation 模式 */
export type McpElicitationMode = 'form' | 'url';

/** Elicitation 请求参数 */
export interface McpElicitRequestParams {
  readonly message: string;
  readonly mode: McpElicitationMode;
  readonly requestedSchema?: Record<string, unknown>;
  readonly url?: string;
  readonly elicitationId?: string;
}

/** Elicitation 响应结果 */
export type McpElicitResult =
  | { action: 'accept'; content?: Record<string, unknown> }
  | { action: 'decline' }
  | { action: 'cancel' };

/** Elicitation 等待状态配置 */
export interface McpElicitationWaitingState {
  /** 按钮标签，如 "Retry now" 或 "Skip confirmation" */
  readonly actionLabel: string;
  /** 是否显示取消按钮 */
  readonly showCancel?: boolean;
}

/** Elicitation 请求事件 — 发给宿主 UI 的完整信息 */
export interface McpElicitationRequestEvent {
  readonly serverName: string;
  readonly requestId: string | number;
  readonly params: McpElicitRequestParams;
  readonly signal: AbortSignal;
  /** 解决 elicitation 的回调 */
  readonly respond: (result: McpElicitResult) => void;
  /** URL 模式下的等待状态 */
  readonly waitingState?: McpElicitationWaitingState;
  /** 等待状态被用户行动完成时调用 */
  readonly onWaitingDismiss?: (action: 'dismiss' | 'retry' | 'cancel') => void;
  /** 服务器确认完成时设为 true */
  readonly completed?: boolean;
}

/** Elicitation 处理器接口 — 宿主注入 UI 实现 */
export interface McpElicitationHandler {
  /**
   * 处理 MCP Elicitation 请求
   *
   * 宿主实现此接口提供 CLI/IDE/Web UI 交互。 此函数应阻塞直到用户做出决策。
   *
   * @param request Elicitation 请求事件
   * @returns 用户决策结果，undefined 表示无处理（宿主未注入）
   */
  handleElicitation(request: McpElicitationRequestEvent): Promise<McpElicitResult | undefined>;
}
