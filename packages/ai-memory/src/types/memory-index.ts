/** 记忆索引类型 — MEMORY.md 入口索引 */

/** MEMORY.md 索引条目格式: `- [Title](file.md) — one-line hook` */
export interface MemoryIndexEntry {
  readonly title: string;
  readonly filePath: string; // e.g., 'user/preferences.md'
  readonly hook: string; // 一行描述/钩子
}

/** 入口截断结果 */
export interface TruncateResult {
  readonly content: string;
  readonly originalLineCount: number;
  readonly originalByteCount: number;
  readonly truncatedLineCount: number;
  readonly truncatedByteCount: number;
  readonly wasTruncated: boolean;
  readonly truncationMethod: 'none' | 'line' | 'byte';
}

/** 入口索引常量 */
export const MAX_ENTRYPOINT_LINES = 200;
export const MAX_ENTRYPOINT_BYTES = 25000;
export const MEMORY_MD_FILENAME = 'MEMORY.md';

/** 索引条目解析正则: `- [Title](path) — hook` */
export const INDEX_ENTRY_PATTERN = /^-\s+\[([^\]]+)\]\(([^)]+)\)\s+—\s+(.+)$/;
