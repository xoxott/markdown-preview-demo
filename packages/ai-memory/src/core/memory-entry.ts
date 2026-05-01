/** 记忆条目 — frontmatter 解析 + 序列化 + 验证 */

import type { FrontmatterParseResult, MemoryEntry, MemoryHeader } from '../types/memory-entry';
import { parseMemoryType } from './memory-type';

/**
 * 解析 frontmatter — 从 `---` 包围的 YAML-like key: value 块中提取头部 仅提取已知 key: name, description, type,
 * created, updated 无 frontmatter → header=null, body=原始内容 格式错误 → header=null, parseError=描述
 */
export function parseFrontmatter(content: string): FrontmatterParseResult {
  // 匹配 --- ... --- 块（允许首行无 ---）
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { header: null, body: content, rawFrontmatter: null };
  }

  const rawFrontmatter = match[1];
  const body = match[2] ?? '';

  // 逐行解析 key: value
  const fields: Record<string, string> = {};
  for (const line of rawFrontmatter.split('\n')) {
    const kvMatch = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (kvMatch) {
      fields[kvMatch[1]] = kvMatch[2].trim();
    }
  }

  // 必需字段验证
  const name = fields.name ?? '';
  const description = fields.description ?? '';
  const typeRaw = fields.type ?? '';
  const type = parseMemoryType(typeRaw);

  if (!name || !description) {
    return {
      header: null,
      body,
      rawFrontmatter,
      parseError: !name ? 'missing_name' : 'missing_description'
    };
  }

  if (!type) {
    return {
      header: null,
      body,
      rawFrontmatter,
      parseError: `invalid_type: ${typeRaw}`
    };
  }

  return {
    header: {
      name,
      description,
      type,
      created: fields.created,
      updated: fields.updated
    },
    body,
    rawFrontmatter
  };
}

/** 序列化 frontmatter — 将 MemoryHeader 转为 `---\nkey: value\n---` 格式 */
export function serializeFrontmatter(header: MemoryHeader): string {
  const lines: string[] = ['---'];
  lines.push(`name: ${header.name}`);
  lines.push(`description: ${header.description}`);
  lines.push(`type: ${header.type}`);
  if (header.created) lines.push(`created: ${header.created}`);
  if (header.updated) lines.push(`updated: ${header.updated}`);
  lines.push('---');
  return lines.join('\n');
}

/** 序列化完整条目 — frontmatter + body */
export function serializeEntry(entry: MemoryEntry): string {
  return `${serializeFrontmatter(entry.header)}\n${entry.body}`;
}

/** 解析记忆条目 — 从文件内容+元信息创建 MemoryEntry frontmatter 缺失/错误 → 返回 null */
export function parseMemoryEntry(
  content: string,
  filePath: string,
  mtimeMs: number
): MemoryEntry | null {
  const parsed = parseFrontmatter(content);
  if (!parsed.header) return null;

  return {
    header: parsed.header,
    body: parsed.body,
    filePath,
    mtimeMs
  };
}

/** 验证 MemoryHeader — 返回错误消息列表（空=有效） */
export function validateHeader(header: Partial<MemoryHeader>): string[] {
  const errors: string[] = [];

  if (!header.name || header.name.trim() === '') {
    errors.push('name_required');
  }
  if (!header.type || parseMemoryType(header.type) === null) {
    errors.push('type_invalid');
  }
  if (!header.description || header.description.trim() === '') {
    errors.push('description_required');
  }

  return errors;
}
