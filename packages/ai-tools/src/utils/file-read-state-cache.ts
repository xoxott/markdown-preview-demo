/**
 * FileReadStateCache — 文件读取去重缓存
 *
 * 对齐 Claude Code FileStateCache (fileStateCache.ts):
 *
 * 当 LLM 在同一会话内对同一文件发起重复 Read 调用 (相同 offset/limit 范围) 且文件 mtime 未变化, 则返回 file_unchanged stub
 * 而不重新发送完整文件内容。
 *
 * 这样可节省大量 cache_creation tokens (约 18% 的 Read 调用是重复)。
 *
 * 核心设计:
 *
 * - LRU cache, 路径键经过 normalize, 最大 100 条目, 最大 25MB
 * - offset !== undefined 区分"来自Read"vs"来自Edit/Write"
 * - Edit/Write 写入时 offset=undefined, 阻止后续 Read 错误去重
 * - isPartialView 标记阻止对自动注入内容(如 CLAUDE.md)的去重
 *
 * 参考 Claude Code src/utils/fileStateCache.ts
 */

/** 文件读取缓存条目 */
export interface FileReadCacheEntry {
  /** Read 时的完整文件内容 */
  readonly content: string;
  /** Read 时的 mtime (Math.floor(mtimeMs)) */
  readonly timestamp: number;
  /** Read 的 offset (Read设置; Edit/Write设undefined) */
  readonly offset: number | undefined;
  /** Read 的 limit */
  readonly limit: number | undefined;
  /** 是否为部分视图(自动注入的CLAUDE.md等) */
  readonly isPartialView?: boolean;
}

/** 去重判断结果 */
export interface DedupCheckResult {
  /** 是否命中去重(返回file_unchanged) */
  readonly dedupHit: boolean;
  /** 去重命中时的stub消息 */
  readonly stubMessage?: string;
}

/** file_unchanged stub 常量 — 对齐 Claude Code FILE_UNCHANGED_STUB */
export const FILE_UNCHANGED_STUB =
  'File unchanged since last read. The content from the earlier Read tool_result in this conversation is still current — refer to that instead of re-reading.';

/**
 * FileReadStateCache — LRU 缓存实现
 *
 * 使用简单 Map + 手动淘汰策略 (与 Claude Code 对齐):
 *
 * - 最大 100 条目
 * - 最大 25MB 内容
 * - 超限时淘汰最早写入的条目
 */
export class FileReadStateCache {
  private readonly cache: Map<string, FileReadCacheEntry> = new Map();
  private readonly maxSize = 100;
  private readonly maxBytes = 25 * 1024 * 1024; // 25MB
  private currentBytes = 0;

  /**
   * 获取文件读取状态
   *
   * @param key 文件路径(应先normalize)
   */
  get(key: string): FileReadCacheEntry | undefined {
    // LRU: 访问时移到末尾(最近使用)
    const state = this.cache.get(key);
    if (state !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, state);
    }
    return state;
  }

  /**
   * 设置文件读取状态
   *
   * @param key 文件路径(应先normalize)
   * @param state 文件读取状态
   */
  set(key: string, state: FileReadCacheEntry): this {
    // 如果已存在 → 先删除旧记录(更新大小)
    const existing = this.cache.get(key);
    if (existing) {
      this.currentBytes -= existing.content.length;
      this.cache.delete(key);
    }

    // 添加新记录
    this.currentBytes += state.content.length;
    this.cache.set(key, state);

    // 超限淘汰
    this.evict();

    return this;
  }

  /** 删除文件读取状态 */
  delete(key: string): boolean {
    const existing = this.cache.get(key);
    if (existing) {
      this.currentBytes -= existing.content.length;
    }
    return this.cache.delete(key);
  }

  /** 是否有记录 */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /** 当前条目数 */
  get size(): number {
    return this.cache.size;
  }

  /** 当前内容总大小(bytes) */
  get totalBytes(): number {
    return this.currentBytes;
  }

  /** 清空缓存 */
  clear(): void {
    this.cache.clear();
    this.currentBytes = 0;
  }

  /**
   * 去重检查 — 判断是否需要重新读取文件
   *
   * 条件:
   *
   * 1. 缓存中有记录
   * 2. 非部分视图(isPartialView=false)
   * 3. offset由Read设置(offset !== undefined)
   * 4. offset/limit与缓存记录匹配(range match)
   * 5. mtime一致(Math.floor(mtimeMs) === timestamp)
   *
   * @param filePath 文件路径
   * @param offset 读取的offset
   * @param limit 读取的limit
   * @param currentMtimeMs 文件当前mtime(毫秒)
   */
  checkDedup(
    filePath: string,
    offset: number | undefined,
    limit: number | undefined,
    currentMtimeMs: number
  ): DedupCheckResult {
    const state = this.get(filePath);

    if (!state) {
      return { dedupHit: false };
    }

    // 部分视图 → 不去重
    if (state.isPartialView) {
      return { dedupHit: false };
    }

    // offset为undefined → 来自Edit/Write, 不去重
    if (state.offset === undefined) {
      return { dedupHit: false };
    }

    // offset/limit不匹配 → 不去重(读取范围不同)
    if (state.offset !== offset || state.limit !== limit) {
      return { dedupHit: false };
    }

    // mtime一致 → 去重命中
    const currentTimestamp = Math.floor(currentMtimeMs);
    if (currentTimestamp === state.timestamp) {
      return {
        dedupHit: true,
        stubMessage: FILE_UNCHANGED_STUB
      };
    }

    // mtime不一致 → 文件已被修改, 不去重
    return { dedupHit: false };
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /** 淘汰超出限制的最早条目 */
  private evict(): void {
    while (this.cache.size > this.maxSize || this.currentBytes > this.maxBytes) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey === undefined) break;

      const existing = this.cache.get(firstKey);
      if (existing) {
        this.currentBytes -= existing.content.length;
      }
      this.cache.delete(firstKey);
    }
  }
}
