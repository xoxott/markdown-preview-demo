/** 记忆类型 — 分类 + 提示段落生成 */

import type { MemoryType, MemoryTypeDef } from '../types/memory-type';
import { MEMORY_TYPES, MEMORY_TYPE_VALUES } from '../types/memory-type';

/** 解析记忆类型 — 大小写不敏感，无效返回 null */
export function parseMemoryType(raw: string): MemoryType | null {
  const normalized = raw.toLowerCase().trim();
  if (MEMORY_TYPE_VALUES.includes(normalized as MemoryType)) {
    return normalized as MemoryType;
  }
  return null;
}

/** 记忆类型验证 — 类型守卫 */
export function isValidMemoryType(value: string): boolean {
  return parseMemoryType(value) !== null;
}

/** 获取类型定义元数据 */
export function getMemoryTypeDef(type: MemoryType): MemoryTypeDef {
  return MEMORY_TYPES[type];
}

/** 生成 scope XML 标签 */
export function buildScopeTag(type: MemoryType): string {
  return MEMORY_TYPES[type].scopeTag;
}

/** 生成类型分类提示段落 — individual模式（无scope标签） */
export function buildTypesSection(): string {
  const lines: string[] = ['## Types of memory'];
  lines.push('');
  lines.push('There are several discrete types of memory you can store:');
  lines.push('');

  for (const type of MEMORY_TYPE_VALUES) {
    const def = MEMORY_TYPES[type];
    lines.push(`<type>`);
    lines.push(`<name>${def.label}</name>`);
    lines.push(`<description>${def.description}</description>`);
    lines.push(`<body>${def.bodyGuidelines}</body>`);
    lines.push(`</type>`);
    lines.push('');
  }

  return lines.join('\n');
}

/** 生成类型分类提示段落 — combined模式（含scope标签） */
export function buildTypesSectionCombined(): string {
  const lines: string[] = ['## Types of memory'];
  lines.push('');
  lines.push('There are several discrete types of memory you can store:');
  lines.push('');

  for (const type of MEMORY_TYPE_VALUES) {
    const def = MEMORY_TYPES[type];
    lines.push(`<type>`);
    lines.push(`<name>${def.label}</name>`);
    lines.push(`<scope>${def.scopeTag}</scope>`);
    lines.push(`<description>${def.description}</description>`);
    lines.push(`<body>${def.bodyGuidelines}</body>`);
    lines.push(`</type>`);
    lines.push('');
  }

  return lines.join('\n');
}

/** 生成排除规则提示段落 */
export function buildWhatNotToSaveSection(): string {
  const lines: string[] = ['## What NOT to save in memory'];
  lines.push('');
  lines.push(
    '- Code patterns, conventions, architecture, file paths, or project structure — these can be derived by reading the current project state.'
  );
  lines.push(
    '- Git history, recent changes, or who-changed-what — `git log` / `git blame` are authoritative.'
  );
  lines.push(
    '- Debugging solutions or fix recipes — the fix is in the code; the commit message has the context.'
  );
  lines.push('- Anything already documented in CLAUDE.md files.');
  lines.push(
    '- Ephemeral task details: in-progress work, temporary state, current conversation context.'
  );
  lines.push('');
  lines.push(
    'These exclusions apply even when the user explicitly asks you to save. If they ask you to save a PR list or activity summary, ask what was *surprising* or *non-obvious* about it — that is the part worth keeping.'
  );

  return lines.join('\n');
}

/** 生成何时访问记忆提示段落 */
export function buildWhenToAccessSection(): string {
  const lines: string[] = ['## When to access memories'];
  lines.push('');
  lines.push('- When memories seem relevant, or the user references prior-conversation work.');
  lines.push(
    '- You MUST access memory when the user explicitly asks you to check, recall, or remember.'
  );
  lines.push(
    '- If the user says to *ignore* or *not use* memory: proceed as if MEMORY.md were empty. Do not apply remembered facts, cite, compare against, or mention memory content.'
  );

  return lines.join('\n');
}

/** 生成信任回溯提示段落 — 推荐前需验证 */
export function buildTrustingRecallSection(): string {
  const lines: string[] = ['## Before recommending from memory'];
  lines.push('');
  lines.push(
    'A memory that names a specific function, file, or flag is a claim that it existed *when the memory was written*. It may have been renamed, removed, or never merged. Before recommending it:'
  );
  lines.push('');
  lines.push('- If the memory names a file path: check the file exists.');
  lines.push('- If the memory names a function or flag: grep for it.');
  lines.push(
    '- If the user is about to act on your recommendation (not just asking about history), verify first.'
  );
  lines.push('');
  lines.push('"The memory says X exists" is not the same as "X exists now."');
  lines.push('');
  lines.push(
    'A memory that summarizes repo state (activity logs, architecture snapshots) is frozen in time. If the user asks about *recent* or *current* state, prefer `git log` or reading the code over recalling the snapshot.'
  );

  return lines.join('\n');
}
