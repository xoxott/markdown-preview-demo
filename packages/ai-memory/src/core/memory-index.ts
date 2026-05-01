/** 记忆索引 — MEMORY.md 截断 + 索引 CRUD + 异步读写 */

import type { MemoryIndexEntry, TruncateResult } from '../types/memory-index';
import {
  INDEX_ENTRY_PATTERN,
  MAX_ENTRYPOINT_BYTES,
  MAX_ENTRYPOINT_LINES
} from '../types/memory-index';
import type { MemoryStorageProvider } from '../types/memory-storage';

/** 截断入口内容 — 先行截断(≤maxLines)，后字节截断(≤maxBytes) 行截断保留前 N 行，字节截断在上限内找最后一个换行符截断 返回 TruncateResult 含截断统计 */
export function truncateEntrypointContent(
  content: string,
  maxLines: number = MAX_ENTRYPOINT_LINES,
  maxBytes: number = MAX_ENTRYPOINT_BYTES
): TruncateResult {
  const originalLineCount = content.split('\n').length;
  const originalByteCount = content.length;

  let truncatedLineCount = originalLineCount;
  let truncatedByteCount = originalByteCount;
  let truncationMethod: TruncateResult['truncationMethod'] = 'none';
  let result = content;

  // Step 1: 行截断
  if (originalLineCount > maxLines) {
    const lines = content.split('\n');
    result = lines.slice(0, maxLines).join('\n');
    truncatedLineCount = maxLines;
    truncatedByteCount = result.length;
    truncationMethod = 'line';
  }

  // Step 2: 字节截断（在行截断结果基础上）
  if (result.length > maxBytes) {
    // 在字节上限内找最后一个换行符
    const lastNewline = result.lastIndexOf('\n', maxBytes);
    if (lastNewline > 0) {
      result = result.slice(0, lastNewline);
    } else {
      // 无换行符 → 在 maxBytes 处截断
      result = result.slice(0, maxBytes);
    }
    truncatedByteCount = result.length;
    truncationMethod = truncationMethod === 'line' ? 'line' : 'byte';
  }

  // 添加截断警告
  if (truncationMethod !== 'none') {
    const warning = `\n\n> ⚠️ MEMORY.md truncated: ${truncationMethod === 'line' ? `${originalLineCount} lines → ${truncatedLineCount} lines` : `exceeded ${maxBytes} bytes`}. Older entries below the cap are not shown.`;
    result += warning;
    truncatedByteCount = result.length;
  }

  const wasTruncated = truncationMethod !== 'none';

  return {
    content: result,
    originalLineCount,
    originalByteCount,
    truncatedLineCount,
    truncatedByteCount,
    wasTruncated,
    truncationMethod
  };
}

/** 解析索引条目 — 从 MEMORY.md 内容解析 `- [Title](path) — hook` 行 */
export function parseIndexEntries(content: string): MemoryIndexEntry[] {
  const entries: MemoryIndexEntry[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(INDEX_ENTRY_PATTERN);
    if (match) {
      entries.push({
        title: match[1],
        filePath: match[2],
        hook: match[3]
      });
    }
  }
  return entries;
}

/** 序列化索引条目 — 将 MemoryIndexEntry[] 转回 MEMORY.md 格式 */
export function serializeIndexEntries(entries: MemoryIndexEntry[]): string {
  return entries.map(e => `- [${e.title}](${e.filePath}) — ${e.hook}`).join('\n');
}

/** 添加索引条目 — 去重（按 filePath） */
export function addIndexEntry(
  entries: MemoryIndexEntry[],
  newEntry: MemoryIndexEntry
): MemoryIndexEntry[] {
  // 去重：如果 filePath 已存在，替换旧条目
  const filtered = entries.filter(e => e.filePath !== newEntry.filePath);
  return [...filtered, newEntry];
}

/** 删除索引条目 — 按 filePath */
export function removeIndexEntry(
  entries: MemoryIndexEntry[],
  filePath: string
): MemoryIndexEntry[] {
  return entries.filter(e => e.filePath !== filePath);
}

/** 更新索引条目 — 按 filePath 修改 title/hook */
export function updateIndexEntry(
  entries: MemoryIndexEntry[],
  filePath: string,
  updates: Partial<Pick<MemoryIndexEntry, 'title' | 'hook'>>
): MemoryIndexEntry[] {
  return entries.map(e => (e.filePath === filePath ? { ...e, ...updates } : e));
}

/** 异步读取 MEMORY.md — 文件不存在返回 null */
export async function readEntrypoint(
  provider: MemoryStorageProvider,
  path: string
): Promise<string | null> {
  const exists = await provider.exists(path);
  if (!exists) return null;
  return provider.readFile(path);
}

/** 异步写入 MEMORY.md */
export async function writeEntrypoint(
  provider: MemoryStorageProvider,
  path: string,
  content: string
): Promise<void> {
  // 确保目录存在
  const dir = path.substring(0, path.lastIndexOf('/') + 1);
  await provider.mkdir(dir);
  await provider.writeFile(path, content);
}

/** 异步加载+截断入口 — 读取 MEMORY.md + 截断 */
export async function loadAndTruncateEntrypoint(
  provider: MemoryStorageProvider,
  path: string,
  config?: { maxLines?: number; maxBytes?: number }
): Promise<TruncateResult & { content: string }> {
  const raw = await readEntrypoint(provider, path);
  if (!raw) {
    return {
      content: '',
      originalLineCount: 0,
      originalByteCount: 0,
      truncatedLineCount: 0,
      truncatedByteCount: 0,
      wasTruncated: false,
      truncationMethod: 'none'
    };
  }

  const result = truncateEntrypointContent(raw, config?.maxLines, config?.maxBytes);
  return { ...result, content: result.content };
}
