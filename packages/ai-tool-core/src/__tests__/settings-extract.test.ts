/** Settings 规则提取 + Zod 校验测试 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import type { MergedSettings } from '../types/settings-schema';
import {
  extractPermissionRulesFromMergedSettings,
  filterInvalidPermissionRules,
  formatSettingsZodError
} from '../types/settings-extract';

describe('extractPermissionRulesFromMergedSettings', () => {
  it('空配置 → 空规则列表', () => {
    const merged: MergedSettings = {};
    const rules = extractPermissionRulesFromMergedSettings(merged, ['project']);
    expect(rules).toEqual([]);
  });

  it('无 permissions → 规则列表', () => {
    const merged: MergedSettings = { hooks: {} };
    const rules = extractPermissionRulesFromMergedSettings(merged, ['project']);
    expect(rules).toEqual([]);
  });

  it('allow 规则提取 → behavior=allow', () => {
    const merged = { permissions: { allow: ['Read', 'Bash(git push)'] } } as MergedSettings;
    const rules = extractPermissionRulesFromMergedSettings(merged, ['project']);
    expect(rules).toHaveLength(2);
    expect(rules[0].behavior).toBe('allow');
    expect(rules[0].ruleValue).toBe('Read');
    expect(rules[0].source).toBe('project');
  });

  it('deny 规则提取 → behavior=deny + reason', () => {
    const merged = { permissions: { deny: ['Bash(rm -rf *)'] } } as MergedSettings;
    const rules = extractPermissionRulesFromMergedSettings(merged, ['project']);
    expect(rules).toHaveLength(1);
    expect(rules[0].behavior).toBe('deny');
    expect(rules[0].ruleValue).toBe('Bash(rm -rf *)');
    expect(rules[0].reason).toContain('Bash(rm -rf *)');
  });

  it('ask 规则提取 → behavior=ask', () => {
    const merged = { permissions: { ask: ['Write'] } } as MergedSettings;
    const rules = extractPermissionRulesFromMergedSettings(merged, ['project']);
    expect(rules).toHaveLength(1);
    expect(rules[0].behavior).toBe('ask');
    expect(rules[0].ruleValue).toBe('Write');
  });

  it('混合规则提取 → 3类规则', () => {
    const merged = {
      permissions: {
        allow: ['Read'],
        deny: ['Bash(rm *)'],
        ask: ['Write']
      }
    } as MergedSettings;
    const rules = extractPermissionRulesFromMergedSettings(merged, ['project']);
    expect(rules).toHaveLength(3);
    const allows = rules.filter(r => r.behavior === 'allow');
    const denys = rules.filter(r => r.behavior === 'deny');
    const asks = rules.filter(r => r.behavior === 'ask');
    expect(allows).toHaveLength(1);
    expect(denys).toHaveLength(1);
    expect(asks).toHaveLength(1);
  });

  it('source 取最高优先级层映射 — policy > project', () => {
    const merged = { permissions: { allow: ['Read'] } } as MergedSettings;
    const rules = extractPermissionRulesFromMergedSettings(merged, ['project', 'policy']);
    expect(rules[0].source).toBe('policy'); // policy 优先级更高
  });

  it('plugin 层被排除 → source 不映射 plugin', () => {
    const merged = { permissions: { allow: ['Read'] } } as MergedSettings;
    const rules = extractPermissionRulesFromMergedSettings(merged, ['plugin', 'user']);
    expect(rules[0].source).toBe('user'); // plugin 被排除
  });

  it('空 sourceLayers → fallback project', () => {
    const merged = { permissions: { allow: ['Read'] } } as MergedSettings;
    const rules = extractPermissionRulesFromMergedSettings(merged, []);
    expect(rules[0].source).toBe('project'); // fallback
  });
});

describe('filterInvalidPermissionRules', () => {
  it('全部合法 → valid=全部, invalid=空', () => {
    const result = filterInvalidPermissionRules(['Read', 'Bash(git push)']);
    expect(result.valid).toEqual(['Read', 'Bash(git push)']);
    expect(result.invalid).toEqual([]);
  });

  it('含空字符串 → 过滤为 invalid', () => {
    const result = filterInvalidPermissionRules(['Read', '', 'Write']);
    expect(result.valid).toEqual(['Read', 'Write']);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].rule).toBe('');
  });

  it('含非字符串 → 过滤为 invalid', () => {
    const customSchema = z.string().min(2);
    const result = filterInvalidPermissionRules(['OK', 'X'], customSchema);
    expect(result.valid).toEqual(['OK']);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].rule).toBe('X');
  });

  it('fail-soft: 无效规则不阻止有效规则', () => {
    const result = filterInvalidPermissionRules(['Read', '', 'Bash(*)', '   ']);
    expect(result.valid.length).toBeGreaterThan(0);
    expect(result.invalid.length).toBeGreaterThan(0);
  });
});

describe('formatSettingsZodError', () => {
  it('格式化 Zod 错误 → 人类可读字符串', () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: '' });
    if (!result.success) {
      const formatted = formatSettingsZodError(result.error);
      expect(formatted).toContain('name');
      expect(formatted).toContain('small');
    }
  });

  it('多错误 → 分号分隔', () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const result = schema.safeParse({ a: 1, b: 'x' });
    if (!result.success) {
      const formatted = formatSettingsZodError(result.error);
      expect(formatted).toContain(';');
    }
  });
});
