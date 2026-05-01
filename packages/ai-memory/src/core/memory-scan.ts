/** 记忆扫描 — 目录扫描 + frontmatter 解析 */

import type { MemoryStorageProvider } from '../types/memory-storage';
import type { MemoryEntry } from '../types/memory-entry';
import { MEMORY_MD_FILENAME } from '../types/memory-index';
import { parseMemoryEntry } from './memory-entry';

/** 扫描最大文件数 */
export const MAX_SCAN_FILES = 200;

/** frontmatter 扫描行数限制 */
export const FRONTMATTER_SCAN_LINES = 30;

/** 扫描记忆文件 — 递归扫描 .md 文件（排除 MEMORY.md） 解析 frontmatter，按 mtimeMs 降序排列（最新优先），上限 200 */
export async function scanMemoryFiles(
  provider: MemoryStorageProvider,
  dir: string,
  excludeFiles?: string[]
): Promise<MemoryEntry[]> {
  const allFiles = await provider.listFiles(dir, '.md');
  const exclude = new Set(excludeFiles ?? []);
  exclude.add(MEMORY_MD_FILENAME);

  // 过滤排除文件
  const candidates = allFiles.filter(f => {
    const name = f.split('/').pop() ?? '';
    return !exclude.has(name);
  });

  // 限制扫描数量
  const limited = candidates.slice(0, MAX_SCAN_FILES);

  // 读取并解析每个文件
  const entries: MemoryEntry[] = [];
  for (const filePath of limited) {
    try {
      const content = await provider.readFile(filePath);
      const stat = await provider.stat(filePath);
      const entry = parseMemoryEntry(content, filePath, stat.mtimeMs);
      if (entry) {
        entries.push(entry);
      }
    } catch {
      // 文件读取/解析错误 → 跳过
    }
  }

  // 按 mtimeMs 降序（最新优先）
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);

  return entries;
}

/** 格式化记忆清单 — 用于 UI 展示 */
export function formatMemoryManifest(entries: MemoryEntry[]): string {
  if (entries.length === 0) return '(no memory files found)';

  return entries
    .map(e => {
      const typeLabel = e.header.type.toUpperCase();
      const mtime = new Date(e.mtimeMs).toISOString().slice(0, 10);
      return `- [${typeLabel}] ${e.filePath} (${mtime}): ${e.header.description}`;
    })
    .join('\n');
}
