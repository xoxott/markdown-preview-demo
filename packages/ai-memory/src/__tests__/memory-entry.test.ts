/** MemoryEntry 测试 — frontmatter 解析 + 序列化 + 验证 */

import { describe, expect, it } from 'vitest';
import {
  parseFrontmatter,
  parseMemoryEntry,
  serializeEntry,
  serializeFrontmatter,
  validateHeader
} from '../core/memory-entry';
import type { MemoryEntry, MemoryHeader } from '../types/memory-entry';

const VALID_ENTRY = `---
name: User Preferences
description: Preferred coding style and tools
type: user
created: 2026-04-15
updated: 2026-05-01
---

Prefers dark mode and VS Code.`;

describe('MemoryEntry — parseFrontmatter', () => {
  it('有效 frontmatter → 解析成功', () => {
    const result = parseFrontmatter(VALID_ENTRY);
    expect(result.header).not.toBeNull();
    expect(result.header!.name).toBe('User Preferences');
    expect(result.header!.description).toBe('Preferred coding style and tools');
    expect(result.header!.type).toBe('user');
    expect(result.header!.created).toBe('2026-04-15');
    expect(result.header!.updated).toBe('2026-05-01');
    expect(result.body).toContain('Prefers dark mode');
  });

  it('无 frontmatter → header=null, body=原始', () => {
    const result = parseFrontmatter('Just plain text');
    expect(result.header).toBeNull();
    expect(result.body).toBe('Just plain text');
    expect(result.rawFrontmatter).toBeNull();
  });

  it('空内容 → header=null, body=空', () => {
    const result = parseFrontmatter('');
    expect(result.header).toBeNull();
    expect(result.body).toBe('');
  });

  it('缺 name → parseError=missing_name', () => {
    const result = parseFrontmatter(`---
description: Some desc
type: user
---

Body content`);
    expect(result.header).toBeNull();
    expect(result.parseError).toBe('missing_name');
  });

  it('缺 description → parseError=missing_description', () => {
    const result = parseFrontmatter(`---
name: Some name
type: user
---

Body`);
    expect(result.header).toBeNull();
    expect(result.parseError).toBe('missing_description');
  });

  it('无效 type → parseError=invalid_type', () => {
    const result = parseFrontmatter(`---
name: Test
description: Test
type: invalid_type
---

Body`);
    expect(result.header).toBeNull();
    expect(result.parseError).toContain('invalid_type');
  });

  it('空 body → body 为空字符串', () => {
    const result = parseFrontmatter(`---
name: Test
description: Test
type: user
---
`);
    expect(result.header).not.toBeNull();
    expect(result.body).toBe('');
  });

  it('多行 body → body 含换行', () => {
    const result = parseFrontmatter(`---
name: Test
description: Test
type: feedback
---

Line 1
Line 2
Line 3`);
    expect(result.body).toContain('Line 1\nLine 2\nLine 3');
  });

  it('未知 key 被忽略 → 只提取已知字段', () => {
    const result = parseFrontmatter(`---
name: Test
description: Test
type: project
priority: high
---

Body`);
    expect(result.header).not.toBeNull();
    expect(result.header!.name).toBe('Test');
  });
});

describe('MemoryEntry — serializeFrontmatter', () => {
  it('完整 header → 格式正确', () => {
    const header: MemoryHeader = {
      name: 'User Preferences',
      description: 'Preferred coding style',
      type: 'user',
      created: '2026-04-15',
      updated: '2026-05-01'
    };
    const result = serializeFrontmatter(header);
    expect(result).toContain('name: User Preferences');
    expect(result).toContain('description: Preferred coding style');
    expect(result).toContain('type: user');
    expect(result).toContain('created: 2026-04-15');
    expect(result).toContain('updated: 2026-05-01');
    expect(result.startsWith('---')).toBe(true);
    expect(result).toContain('\n---');
  });

  it('无日期字段 → 不包含 created/updated 行', () => {
    const header: MemoryHeader = {
      name: 'Test',
      description: 'Test',
      type: 'feedback'
    };
    const result = serializeFrontmatter(header);
    expect(result).not.toContain('created');
    expect(result).not.toContain('updated');
  });
});

describe('MemoryEntry — serializeEntry', () => {
  it('frontmatter + body → 完整序列化', () => {
    const entry: MemoryEntry = {
      header: { name: 'Test', description: 'Test', type: 'user' },
      body: 'Content here.',
      filePath: 'user/test.md',
      mtimeMs: 1000
    };
    const result = serializeEntry(entry);
    expect(result).toContain('---');
    expect(result).toContain('name: Test');
    expect(result).toContain('Content here.');
  });
});

describe('MemoryEntry — parseMemoryEntry', () => {
  it('完整条目 → 成功解析', () => {
    const result = parseMemoryEntry(VALID_ENTRY, 'user/preferences.md', 1000);
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe('user/preferences.md');
    expect(result!.mtimeMs).toBe(1000);
    expect(result!.header.type).toBe('user');
  });

  it('无 frontmatter → 返回 null', () => {
    const result = parseMemoryEntry('Just text', 'test.md', 1000);
    expect(result).toBeNull();
  });

  it('格式错误 → 返回 null', () => {
    const result = parseMemoryEntry(
      `---
name: Test
---

Missing description and type`,
      'test.md',
      1000
    );
    expect(result).toBeNull();
  });
});

describe('MemoryEntry — validateHeader', () => {
  it('完整 header → 无错误', () => {
    const errors = validateHeader({ name: 'Test', description: 'Desc', type: 'user' });
    expect(errors).toHaveLength(0);
  });

  it('缺 name → name_required', () => {
    const errors = validateHeader({ description: 'Desc', type: 'user' });
    expect(errors).toContain('name_required');
  });

  it('缺 description → description_required', () => {
    const errors = validateHeader({ name: 'Test', type: 'user' });
    expect(errors).toContain('description_required');
  });

  it('无效 type → type_invalid', () => {
    const errors = validateHeader({ name: 'Test', description: 'Desc', type: 'invalid' as any });
    expect(errors).toContain('type_invalid');
  });

  it('空 name → name_required', () => {
    const errors = validateHeader({ name: '', description: 'Desc', type: 'user' });
    expect(errors).toContain('name_required');
  });

  it('多个错误同时返回', () => {
    const errors = validateHeader({ type: 'invalid' as any });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
