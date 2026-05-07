/**
 * Session Transcript — 把对话流持久化到磁盘的滚动日志（按日期分段）
 *
 * 对齐 CC services/sessionTranscript/sessionTranscript.ts。CC 主仓只保留了 stub 实现，但实际产品中 transcript 用于：
 *
 * 1. /resume 列表中的"上次对话预览"
 * 2. 回滚（双 ESC）所需的历史快照
 * 3. 跨日期切换时强制 flush 上一段（避免被新 session 覆盖）
 *
 * 本模块抽象出一个 storage 接口，允许 CLI 写文件、SDK 写内存、test 写 mock。
 */

// ============================================================
// 类型
// ============================================================

/** Transcript 中保存的消息形态（结构与具体引擎解耦） */
export interface TranscriptMessage {
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly content: unknown;
  readonly timestamp?: number;
  readonly id?: string;
}

/** Transcript 段（按日期分段） */
export interface TranscriptSegment {
  readonly sessionId: string;
  readonly date: string;
  readonly messages: readonly TranscriptMessage[];
}

/** Transcript 存储适配器 */
export interface TranscriptStorage {
  /** 追加（或合并写入）当前 session/day 段 */
  appendSegment(segment: TranscriptSegment): Promise<void>;
  /** 强制 flush 当前缓冲（用于跨日期切换或退出） */
  flush?(sessionId: string): Promise<void>;
}

/** Transcript 写入器配置 */
export interface SessionTranscriptConfig {
  readonly storage: TranscriptStorage;
  readonly sessionId: string;
  /** 当前日期字符串生成器（默认 ISO YYYY-MM-DD） */
  readonly currentDate?: () => string;
}

// ============================================================
// 工具
// ============================================================

const defaultDate = (): string => new Date().toISOString().slice(0, 10);

// ============================================================
// 主类
// ============================================================

/** SessionTranscriptWriter — 维护 lastDate 状态，跨日期切换时自动 flush */
export class SessionTranscriptWriter {
  private lastDate: string;
  private readonly storage: TranscriptStorage;
  private readonly sessionId: string;
  private readonly currentDateFn: () => string;

  constructor(config: SessionTranscriptConfig) {
    this.storage = config.storage;
    this.sessionId = config.sessionId;
    this.currentDateFn = config.currentDate ?? defaultDate;
    this.lastDate = this.currentDateFn();
  }

  /** 写入一段 transcript（如果跨日期会自动先 flush 上一段） */
  async writeSegment(messages: readonly TranscriptMessage[]): Promise<void> {
    if (messages.length === 0) return;
    const today = this.currentDateFn();
    if (today !== this.lastDate) {
      await this.flush();
      this.lastDate = today;
    }
    await this.storage.appendSegment({
      sessionId: this.sessionId,
      date: today,
      messages
    });
  }

  /** 强制 flush（用于退出、cwd 切换、compact 后等） */
  async flush(): Promise<void> {
    await this.storage.flush?.(this.sessionId);
  }

  /**
   * 跨日期 flush 钩子 — 暴露给上层在保存消息前调用
   *
   * 如果今天 ≠ lastDate，把"昨天的最后一段"先冻结，然后切换 lastDate。
   */
  async flushOnDateChange(messages: readonly TranscriptMessage[]): Promise<void> {
    const today = this.currentDateFn();
    if (today === this.lastDate) return;
    if (messages.length > 0) {
      await this.storage.appendSegment({
        sessionId: this.sessionId,
        date: this.lastDate,
        messages
      });
    }
    await this.storage.flush?.(this.sessionId);
    this.lastDate = today;
  }
}
