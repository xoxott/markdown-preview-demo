/** TeamProvider + MailboxProvider — Team管理+消息宿主注入接口 */

// === Team ===

/** Team创建结果 */
export interface TeamResult {
  teamName: string;
  teamFilePath: string;
  leadAgentId: string;
}

/** Team删除结果 */
export interface TeamDeleteResult {
  success: boolean;
  message: string;
  teamName?: string;
}

/** Team成员信息 */
export interface TeamMember {
  name: string;
  agentId: string;
  agentType: string;
}

/** Team信息 */
export interface TeamInfo {
  teamName: string;
  members: TeamMember[];
  leadAgentId: string;
}

/**
 * TeamProvider — Team管理宿主注入
 *
 * 工具通过此接口操作Team，宿主注入具体实现。 ai-coordinator的TeamManager可作为真实宿主后端。
 */
export interface TeamProvider {
  /** 创建Team */
  createTeam(teamName: string, description?: string): Promise<TeamResult>;
  /** 删除当前Team（需无活跃成员） */
  deleteTeam(): Promise<TeamDeleteResult>;
  /** 获取Team信息 */
  getTeamInfo(): Promise<TeamInfo | null>;
}

// === Mailbox ===

/** Mailbox消息结果 */
export interface SendMessageResult {
  success: boolean;
  message: string;
  recipient?: string;
}

/** 结构化消息类型 */
export type StructuredMessage =
  | { type: 'shutdown_request'; reason?: string }
  | { type: 'shutdown_response'; request_id: string; approve: boolean; reason?: string }
  | { type: 'plan_approval_response'; request_id: string; approve: boolean; feedback?: string };

/** Mailbox消息输入 — 支持纯文本+结构化消息 */
export type MailboxMessageInput = string | StructuredMessage;

/**
 * MailboxProvider — 消息收发宿主注入
 *
 * 工具通过此接口收发Agent间消息，宿主注入具体实现。 ai-coordinator的InMemoryMailbox/FileMailbox可作为真实宿主后端。
 */
export interface MailboxProvider {
  /** 写消息到mailbox */
  writeToMailbox(to: string, message: string, summary?: string): Promise<void>;
  /** 读mailbox消息 */
  readMailbox(agentId: string): Promise<string[]>;
  /** 发送结构化消息（shutdown/plan_approval等） */
  sendStructuredMessage(to: string, message: StructuredMessage): Promise<SendMessageResult>;
  /** 广播消息到所有team成员 */
  broadcastMessage(message: string, summary?: string): Promise<SendMessageResult>;
}
