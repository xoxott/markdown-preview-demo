/** 内存 Session Ingress Provider 实现 — 测试用 */

import type {
  SessionIngressEntry,
  SessionIngressFilter,
  SessionIngressProvider
} from '../types/session-ingress';

/** 默认最大条目数 */
const DEFAULT_MAX_ENTRIES = 1000;

/**
 * InMemorySessionIngress — 内存默认实现
 *
 * 数组存储 + 过滤查询，上限 1000 条（超出丢弃最旧条目）。
 */
export class InMemorySessionIngress implements SessionIngressProvider {
  private entries: SessionIngressEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries?: number) {
    this.maxEntries = maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  async writeEntry(entry: SessionIngressEntry): Promise<void> {
    this.entries.push(entry);

    // 超出上限 → 丢弃最旧条目
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  async queryEntries(filter: SessionIngressFilter): Promise<SessionIngressEntry[]> {
    let result = this.entries;

    if (filter.sessionId !== undefined) {
      result = result.filter(e => e.sessionId === filter.sessionId);
    }

    if (filter.eventType !== undefined) {
      result = result.filter(e => e.eventType === filter.eventType);
    }

    if (filter.since !== undefined) {
      result = result.filter(e => e.timestamp >= filter.since!);
    }

    if (filter.limit !== undefined) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  /** 获取所有条目（用于调试） */
  getAllEntries(): SessionIngressEntry[] {
    return [...this.entries];
  }

  /** 获取条目总数 */
  getEntryCount(): number {
    return this.entries.length;
  }

  /** 重置（用于测试） */
  reset(): void {
    this.entries = [];
  }
}
