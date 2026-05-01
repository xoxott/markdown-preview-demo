/** 记忆条目类型 — frontmatter 头部 + 主体 */

import type { MemoryType } from './memory-type';

/** 记忆文件 frontmatter 头部 */
export interface MemoryHeader {
  readonly name: string;
  readonly description: string;
  readonly type: MemoryType;
  readonly created?: string; // ISO date string
  readonly updated?: string; // ISO date string
}

/** 记忆条目 — 解析后的完整记忆文件 */
export interface MemoryEntry {
  readonly header: MemoryHeader;
  readonly body: string; // Markdown 主体内容（frontmatter 之后）
  readonly filePath: string; // 相对路径（记忆目录内）
  readonly mtimeMs: number; // 文件修改时间戳
}

/** Frontmatter 解析结果 */
export interface FrontmatterParseResult {
  readonly header: MemoryHeader | null;
  readonly body: string;
  readonly rawFrontmatter: string | null;
  readonly parseError?: string;
}
