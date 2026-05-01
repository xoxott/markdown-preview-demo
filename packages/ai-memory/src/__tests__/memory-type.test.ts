/** MemoryType 测试 — 分类 + 提示段落生成 */

import { describe, expect, it } from 'vitest';
import {
  buildScopeTag,
  buildTrustingRecallSection,
  buildTypesSection,
  buildTypesSectionCombined,
  buildWhatNotToSaveSection,
  buildWhenToAccessSection,
  getMemoryTypeDef,
  isValidMemoryType,
  parseMemoryType
} from '../core/memory-type';

describe('MemoryType — parseMemoryType', () => {
  it('有效小写 → 返回类型', () => {
    expect(parseMemoryType('user')).toBe('user');
    expect(parseMemoryType('feedback')).toBe('feedback');
    expect(parseMemoryType('project')).toBe('project');
    expect(parseMemoryType('reference')).toBe('reference');
  });

  it('大写 → 大小写不敏感解析', () => {
    expect(parseMemoryType('User')).toBe('user');
    expect(parseMemoryType('FEEDBACK')).toBe('feedback');
  });

  it('前后空格 → trim 后解析', () => {
    expect(parseMemoryType('  user  ')).toBe('user');
  });

  it('无效类型 → 返回 null', () => {
    expect(parseMemoryType('invalid')).toBeNull();
    expect(parseMemoryType('')).toBeNull();
    expect(parseMemoryType('memory')).toBeNull();
  });
});

describe('MemoryType — isValidMemoryType', () => {
  it('有效 → true', () => {
    expect(isValidMemoryType('user')).toBe(true);
    expect(isValidMemoryType('feedback')).toBe(true);
  });

  it('无效 → false', () => {
    expect(isValidMemoryType('invalid')).toBe(false);
    expect(isValidMemoryType('')).toBe(false);
  });
});

describe('MemoryType — getMemoryTypeDef', () => {
  it('每种类型有完整元数据', () => {
    const userDef = getMemoryTypeDef('user');
    expect(userDef.label).toBe('User');
    expect(userDef.scope).toBe('private');
    expect(userDef.scopeTag).toBe('<private>');
    expect(userDef.bodyGuidelines).toBeDefined();
    expect(userDef.description).toBeDefined();
  });

  it('feedback scope → private→team', () => {
    expect(getMemoryTypeDef('feedback').scope).toBe('private→team');
  });

  it('reference scope → team', () => {
    expect(getMemoryTypeDef('reference').scope).toBe('team');
  });
});

describe('MemoryType — buildScopeTag', () => {
  it('user → <private>', () => {
    expect(buildScopeTag('user')).toBe('<private>');
  });
  it('feedback → <private→team>', () => {
    expect(buildScopeTag('feedback')).toBe('<private→team>');
  });
  it('project → <→team>', () => {
    expect(buildScopeTag('project')).toBe('<→team>');
  });
  it('reference → <team>', () => {
    expect(buildScopeTag('reference')).toBe('<team>');
  });
});

describe('MemoryType — buildTypesSection', () => {
  it('individual 模式 → 含4个 <type> 块，无 <scope>', () => {
    const section = buildTypesSection();
    expect(section).toContain('<type>');
    expect(section).toContain('<name>User</name>');
    expect(section).toContain('<name>Feedback</name>');
    expect(section).toContain('<name>Project</name>');
    expect(section).toContain('<name>Reference</name>');
    expect(section).not.toContain('<scope>');
  });
});

describe('MemoryType — buildTypesSectionCombined', () => {
  it('combined 模式 → 含 <scope> 标签', () => {
    const section = buildTypesSectionCombined();
    expect(section).toContain('<scope>');
    expect(section).toContain('<scope><private></scope>');
    expect(section).toContain('<scope><team></scope>');
  });
});

describe('MemoryType — buildWhatNotToSaveSection', () => {
  it('含排除规则 — code/git/debug/CLAUDE.md/ephemeral', () => {
    const section = buildWhatNotToSaveSection();
    expect(section).toContain('Code patterns');
    expect(section).toContain('Git history');
    expect(section).toContain('Debugging solutions');
    expect(section).toContain('CLAUDE.md');
    expect(section).toContain('Ephemeral');
  });

  it('含 "even when" 强调句', () => {
    const section = buildWhatNotToSaveSection();
    expect(section).toContain('even when the user explicitly asks');
  });
});

describe('MemoryType — buildWhenToAccessSection', () => {
  it('含 3 条访问规则', () => {
    const section = buildWhenToAccessSection();
    expect(section).toContain('seem relevant');
    expect(section).toContain('explicitly asks');
    expect(section).toContain('ignore');
  });
});

describe('MemoryType — buildTrustingRecallSection', () => {
  it('含验证步骤 — check file/grep', () => {
    const section = buildTrustingRecallSection();
    expect(section).toContain('check the file exists');
    expect(section).toContain('grep for it');
  });

  it('含核心警告句', () => {
    const section = buildTrustingRecallSection();
    expect(section).toContain('The memory says X exists');
    expect(section).toContain('X exists now');
  });
});
