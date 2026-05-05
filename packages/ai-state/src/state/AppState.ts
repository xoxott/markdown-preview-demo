/**
 * AppState 核心域 — 可复用的全局状态接口
 *
 * 对齐 Claude Code 的 AppState 70+ 状态域。 ai-state
 * 只定义5个核心可复用域（permissions/settings/tasks/agents/team/ui）， 宿主通过 interface merging 扩展自己的域。
 *
 * 核心域引用 ai-tool-core（ToolPermissionContext/MergedSettings/PermissionMode） 和
 * ai-coordinator（AgentDefinition/Team/Worker 等），作为可选 peerDependency。
 */

import type { DeepImmutable } from '../immutable';

/** 权限状态域 */
export interface PermissionStateDomain {
  /** 权限上下文容器 */
  readonly toolPermissionContext: DeepImmutable<import('@suga/ai-tool-core').ToolPermissionContext>;
  /** 合并后的 settings 配置 */
  readonly settings?: DeepImmutable<import('@suga/ai-tool-core').MergedSettings>;
  /** 权限冒泡请求队列（Leader 端） */
  readonly pendingPermissionBubbles?: readonly DeepImmutable<
    import('@suga/ai-coordinator').PermissionBubbleRequest
  >[];
  /** 当前权限模式（从 toolPermissionContext.mode 推导） */
  readonly currentMode: import('@suga/ai-tool-core').PermissionMode;
}

/** Settings 状态域 */
export interface SettingsStateDomain {
  /** 合并后的全量配置 */
  readonly settings: DeepImmutable<import('@suga/ai-tool-core').MergedSettings>;
  /** 参与合并的 SettingLayer 列表 */
  readonly activeSourceLayers: readonly string[];
  /** settings 缓存是否有效 */
  readonly settingsCacheValid: boolean;
}

/** 单个任务状态 */
export interface TaskItem {
  readonly taskId: string;
  readonly subject: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  readonly owner?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** 任务状态域 */
export interface TaskStateDomain {
  /** 任务字典 (taskId → TaskState) */
  readonly tasks: ReadonlyMap<string, DeepImmutable<TaskItem>>;
  /** 当前前台任务 ID */
  readonly foregroundedTaskId?: string;
}

/** Agent 状态域 */
export interface AgentStateDomain {
  /** Agent 名称注册表 (name → agentId) */
  readonly agentNameRegistry: ReadonlyMap<string, string>;
  /** 当前查看的队友 ID */
  readonly viewingAgentId?: string;
  /** 视图选择模式 */
  readonly viewSelectionMode: 'none' | 'selecting-agent' | 'viewing-agent';
  /** Agent 定义列表 */
  readonly agentDefinitions: readonly DeepImmutable<
    import('@suga/ai-coordinator').AgentDefinition
  >[];
}

/** Worker 运行状态 */
export interface WorkerState {
  readonly workerId: string;
  readonly status: import('@suga/ai-coordinator').WorkerStatus;
  readonly lastActiveAt: number;
}

/** 收件箱消息 */
export interface InboxMessage {
  readonly id: string;
  readonly from: string;
  readonly text: string;
  readonly timestamp: number;
  readonly type?: import('@suga/ai-coordinator').MailboxMessageType;
  readonly status: 'unread' | 'read';
}

/** 团队状态域 */
export interface TeamStateDomain {
  /** 当前团队信息 */
  readonly team?: DeepImmutable<import('@suga/ai-coordinator').Team>;
  /** Worker 状态字典 (workerId → WorkerState) */
  readonly workers: ReadonlyMap<string, DeepImmutable<WorkerState>>;
  /** 消息收件箱 */
  readonly inbox: readonly DeepImmutable<InboxMessage>[];
  /** 是否为团队 Leader */
  readonly isLeader: boolean;
}

/** UI 状态域 */
export interface UIStateDomain {
  /** 扩展视图模式 */
  readonly expandedView: 'none' | 'tasks' | 'teammates';
  /** 状态栏文本 */
  readonly statusLineText?: string;
  /** spinner 提示 */
  readonly spinnerTip?: string;
}

/** P89: 对话状态域 — 会话级消息/提示/轮次追踪 */
export interface ConversationStateDomain {
  /** 消息历史（AgentMessage[]） */
  readonly messages: readonly unknown[];
  /** 当前用户输入提示 */
  readonly currentPrompt?: string;
  /** 当前轮次计数 */
  readonly turnCount: number;
  /** 最近一次模型响应文本 */
  readonly lastModelResponse?: string;
  /** 会话创建时间戳 */
  readonly sessionCreatedAt?: number;
  /** 会话最后活跃时间戳 */
  readonly sessionLastActiveAt?: number;
}

/** P89: 会话持久化接口 — 保存/恢复会话状态 */
export interface SessionPersistenceProvider {
  /** 保存会话状态到持久化存储 */
  saveSession(sessionId: string, state: DeepImmutable<ConversationStateDomain>): Promise<void>;
  /** 从持久化存储恢复会话状态 */
  loadSession(sessionId: string): Promise<DeepImmutable<ConversationStateDomain> | undefined>;
  /** 删除会话 */
  deleteSession(sessionId: string): Promise<void>;
  /** 列出所有会话 ID */
  listSessions(): Promise<readonly string[]>;
}

/** AppState 核心接口 — 6个核心域（P89 新增 conversation）+ 可通过 interface merging 扩展 */
export interface AppState {
  readonly permissions: PermissionStateDomain;
  readonly settings: SettingsStateDomain;
  readonly tasks: TaskStateDomain;
  readonly agents: AgentStateDomain;
  readonly team: TeamStateDomain;
  readonly ui: UIStateDomain;
  /** P89: 对话状态域 */
  readonly conversation: ConversationStateDomain;
}
