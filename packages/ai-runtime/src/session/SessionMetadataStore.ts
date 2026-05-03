/**
 * SessionMetadataStore — 会话元数据持久化
 *
 * 独立于 SerializedSession 的轻量级元数据层，存储 title/tag/firstPrompt 等。 避免扩展核心序列化格式（向后兼容）。 持久化委托给宿主注入的
 * metadataPersister（可选）。
 */

/** 会话元数据条目 */
export interface SessionMetadata {
  /** 会话ID */
  readonly sessionId: string;
  /** 自定义标题 */
  title?: string;
  /** 标签 */
  tag?: string | null;
  /** 首条用户消息（用于摘要） */
  firstPrompt?: string;
  /** 创建时间 */
  readonly createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/** 元数据持久化接口（宿主注入） */
export interface MetadataPersister {
  save(entries: Map<string, SessionMetadata>): Promise<void>;
  load(): Promise<Map<string, SessionMetadata>>;
}

/**
 * SessionMetadataStore — 内存+可选持久化
 *
 * 管理 title/tag/firstPrompt 等元数据，不涉及 AgentMessage 或 Session 状态。
 */
export class SessionMetadataStore {
  private readonly entries: Map<string, SessionMetadata> = new Map();
  private readonly persister?: MetadataPersister;

  constructor(persister?: MetadataPersister) {
    this.persister = persister;
  }

  /** 从持久化加载（异步，初始化时调用） */
  async init(): Promise<void> {
    if (this.persister) {
      const loaded = await this.persister.load();
      for (const [key, value] of loaded) {
        this.entries.set(key, value);
      }
    }
  }

  /** 注册新会话元数据 */
  register(sessionId: string, firstPrompt?: string): void {
    const now = Date.now();
    this.entries.set(sessionId, {
      sessionId,
      firstPrompt,
      createdAt: now,
      updatedAt: now
    });
    this.persistIfAvailable();
  }

  /** 更新标题 */
  rename(sessionId: string, title: string): void {
    const entry = this.entries.get(sessionId);
    if (!entry) {
      throw new Error(`Session metadata not found: ${sessionId}`);
    }
    this.entries.set(sessionId, { ...entry, title, updatedAt: Date.now() });
    this.persistIfAvailable();
  }

  /** 更新标签 */
  tag(sessionId: string, tag: string | null): void {
    const entry = this.entries.get(sessionId);
    if (!entry) {
      throw new Error(`Session metadata not found: ${sessionId}`);
    }
    this.entries.set(sessionId, { ...entry, tag, updatedAt: Date.now() });
    this.persistIfAvailable();
  }

  /** 获取单个元数据 */
  get(sessionId: string): SessionMetadata | undefined {
    return this.entries.get(sessionId);
  }

  /** 列出所有元数据 */
  list(): SessionMetadata[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt // 最近更新的排在前面
    );
  }

  /** 删除元数据（会话销毁时） */
  delete(sessionId: string): void {
    this.entries.delete(sessionId);
    this.persistIfAvailable();
  }

  /** 条目数量 */
  get size(): number {
    return this.entries.size;
  }

  /** 异步持久化（如果 persister 存在） */
  private persistIfAvailable(): void {
    if (this.persister) {
      // eslint-disable-next-line no-void
      void this.persister.save(this.entries);
    }
  }
}
