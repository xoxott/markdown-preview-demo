/**
 * SessionEngineImpl — SessionEngineLike 实现
 *
 * 桥接3层基础设施:
 *
 * - RuntimeSession（ai-runtime）— AgentEvent 流式对话
 * - SDKSessionAdapter — RuntimeSession → SDKSession 接口映射
 * - SessionMetadataStore — title/tag 元数据管理
 *
 * 宿主在初始化时创建 SessionEngineImpl 并通过 setSessionEngine() 注入到 ai-sdk。
 */

import type {
  ForkSessionOptions,
  ForkSessionResult,
  GetSessionMessagesOptions,
  ListSessionsOptions,
  SDKMessage,
  SDKSession,
  SDKSessionInfo,
  SDKSessionOptions,
  SessionEngineLike
} from '@suga/ai-sdk';
import type {
  AgentMessage,
  AssistantMessage,
  ToolResultMessage,
  UserMessage
} from '@suga/ai-agent-loop';
import type { RuntimeConfig } from '../types/config';
import { fetchSystemPrompt } from '../sdk/fetchSystemPrompt';
import { RuntimeSession } from './RuntimeSession';
import { SDKSessionAdapter } from './SDKSessionAdapter';
import { SessionMetadataStore } from './SessionMetadataStore';

/**
 * SessionEngineImpl — 实现 SessionEngineLike 接口
 *
 * 管理多个 RuntimeSession 的生命周期，提供8个SDK session API方法。
 */
export class SessionEngineImpl implements SessionEngineLike {
  private readonly config: RuntimeConfig;
  private readonly metadataStore: SessionMetadataStore;
  /** 活跃会话 Map — sessionId → RuntimeSession */
  private readonly activeSessions: Map<string, RuntimeSession> = new Map();

  constructor(config: RuntimeConfig, metadataStore?: SessionMetadataStore) {
    this.config = config;
    this.metadataStore = metadataStore ?? new SessionMetadataStore();
  }

  /** 创建持久多轮会话 */
  async createSession(options?: SDKSessionOptions): Promise<SDKSession> {
    const effectiveConfig = this.applySessionOptions(this.config, options);
    const systemPrompt = await fetchSystemPrompt(effectiveConfig);

    const session = new RuntimeSession(effectiveConfig, systemPrompt);
    this.activeSessions.set(session.getSessionId(), session);

    // 注册元数据
    this.metadataStore.register(session.getSessionId());

    return new SDKSessionAdapter(session);
  }

  /** 恢复已有会话 */
  async resumeSession(sessionId: string): Promise<SDKSession> {
    const existing = this.activeSessions.get(sessionId);
    if (existing) {
      // 已在内存中 → 直接包装返回
      return new SDKSessionAdapter(existing);
    }

    // 不在内存 → 创建新 RuntimeSession（从存储恢复的路径由宿主处理）
    throw new Error(
      `Session ${sessionId} not found in active sessions. Use createSession() for new sessions.`
    );
  }

  /** 读取会话消息记录 — AgentMessage[] → SDKMessage[] 批量转换 */
  async getSessionMessages(
    sessionId: string,
    options?: GetSessionMessagesOptions
  ): Promise<readonly SDKMessage[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messages = session.getMessages();
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? messages.length;
    const slice = messages.slice(offset, offset + limit);

    // 批量转换 — 使用简化的映射（静态历史，无流式增量）
    return slice.map(msg => this.mapStaticMessage(msg));
  }

  /** 列出会话元数据 */
  async listSessions(_options?: ListSessionsOptions): Promise<readonly SDKSessionInfo[]> {
    const metadataList = this.metadataStore.list();

    return metadataList.map(meta => ({
      sessionId: meta.sessionId,
      customTitle: meta.title,
      firstPrompt: meta.firstPrompt ?? '',
      tag: meta.tag ?? undefined,
      createdAt: meta.createdAt,
      lastModified: meta.updatedAt,
      fileSize: 0,
      summary: meta.firstPrompt ? `对话: ${meta.firstPrompt.slice(0, 50)}` : undefined,
      gitBranch: undefined,
      cwd: undefined
    }));
  }

  /** 获取单个会话信息 */
  async getSessionInfo(sessionId: string): Promise<SDKSessionInfo> {
    const meta = this.metadataStore.get(sessionId);
    if (!meta) {
      throw new Error(`Session metadata not found: ${sessionId}`);
    }

    return {
      sessionId: meta.sessionId,
      customTitle: meta.title,
      firstPrompt: meta.firstPrompt ?? '',
      tag: meta.tag ?? undefined,
      createdAt: meta.createdAt,
      lastModified: meta.updatedAt,
      fileSize: 0,
      summary: meta.firstPrompt ? `对话: ${meta.firstPrompt.slice(0, 50)}` : undefined,
      gitBranch: undefined,
      cwd: undefined
    };
  }

  /** 重命名会话 */
  async renameSession(sessionId: string, title: string): Promise<void> {
    this.metadataStore.rename(sessionId, title);
  }

  /** 为会话打标签 */
  async tagSession(sessionId: string, tag: string | null): Promise<void> {
    this.metadataStore.tag(sessionId, tag);
  }

  /** 从某消息点分叉会话 */
  async forkSession(sessionId: string, options?: ForkSessionOptions): Promise<ForkSessionResult> {
    const sourceSession = this.activeSessions.get(sessionId);
    if (!sourceSession) {
      throw new Error(`Source session ${sessionId} not found`);
    }

    const sourceMessages = sourceSession.getMessages();
    const fromMessageId = options?.from_message_id;

    // 截断历史到指定消息
    if (fromMessageId) {
      const idx = sourceMessages.findIndex(m => m.id === fromMessageId);
      if (idx === -1) {
        throw new Error(`Message ${fromMessageId} not found in session ${sessionId}`);
      }
      // 截断逻辑保留，后续 sendMessage 可携带截断历史
    }

    // 创建新 RuntimeSession
    const newSession = new RuntimeSession(this.config);
    this.activeSessions.set(newSession.getSessionId(), newSession);
    this.metadataStore.register(newSession.getSessionId(), `fork from ${sessionId}`);

    return {
      new_session_id: newSession.getSessionId(),
      session_id: sessionId
    };
  }

  /** 获取元数据存储（测试用） */
  getMetadataStore(): SessionMetadataStore {
    return this.metadataStore;
  }

  /** 获取活跃会话 Map（测试用） */
  getActiveSessions(): Map<string, RuntimeSession> {
    return this.activeSessions;
  }

  /** 应用 session 选项到 RuntimeConfig */
  private applySessionOptions(base: RuntimeConfig, options?: SDKSessionOptions): RuntimeConfig {
    if (!options) return base;
    return { ...base };
  }

  /** 静态 AgentMessage → SDKMessage 简化映射（非流式历史） */
  private mapStaticMessage(msg: AgentMessage): SDKMessage {
    if (msg.role === 'user') {
      const userMsg = msg as UserMessage;
      return {
        type: 'user',
        message: userMsg
      };
    }
    if (msg.role === 'assistant') {
      const assistantMsg = msg as AssistantMessage;
      return {
        type: 'assistant',
        message: assistantMsg
      };
    }
    // tool_result
    const toolMsg = msg as ToolResultMessage;
    return {
      type: 'assistant',
      message: {
        role: 'assistant',
        id: toolMsg.id,
        content: toolMsg.isSuccess
          ? typeof toolMsg.result === 'string'
            ? toolMsg.result
            : JSON.stringify(toolMsg.result ?? '')
          : (toolMsg.error ?? 'Tool execution failed'),
        toolUses: [],
        timestamp: toolMsg.timestamp
      } as AssistantMessage
    };
  }
}

/**
 * createSessionEngine — 便捷工厂
 *
 * @param config RuntimeConfig
 * @returns SessionEngineImpl 实例
 */
export function createSessionEngine(config: RuntimeConfig): SessionEngineImpl {
  return new SessionEngineImpl(config);
}
