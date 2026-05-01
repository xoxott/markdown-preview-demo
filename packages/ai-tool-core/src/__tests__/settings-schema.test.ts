/** SettingsSchema Zod 校验测试 */

import { describe, expect, it } from 'vitest';
import {
  PermissionRuleStringSchema,
  SettingsPermissionsSectionSchema,
  SettingsSchema
} from '../types/settings-schema';

describe('PermissionRuleStringSchema', () => {
  it('合法字符串 → 通过', () => {
    expect(PermissionRuleStringSchema.safeParse('Bash(git push)').success).toBe(true);
    expect(PermissionRuleStringSchema.safeParse('Read').success).toBe(true);
    expect(PermissionRuleStringSchema.safeParse('write').success).toBe(true);
  });

  it('空字符串 → 失败', () => {
    expect(PermissionRuleStringSchema.safeParse('').success).toBe(false);
  });

  it('非字符串 → 失败', () => {
    expect(PermissionRuleStringSchema.safeParse(123).success).toBe(false);
    expect(PermissionRuleStringSchema.safeParse(null).success).toBe(false);
  });
});

describe('SettingsPermissionsSectionSchema', () => {
  it('完整 permissions → 通过', () => {
    const result = SettingsPermissionsSectionSchema.safeParse({
      allow: ['Read', 'Bash(git push)'],
      deny: ['Bash(rm -rf *)'],
      ask: ['Write']
    });
    expect(result.success).toBe(true);
  });

  it('默认值 — 无 allow/deny/ask → 空数组', () => {
    const result = SettingsPermissionsSectionSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allow).toEqual([]);
      expect(result.data.deny).toEqual([]);
      expect(result.data.ask).toEqual([]);
    }
  });

  it('部分字段 → 通过', () => {
    const result = SettingsPermissionsSectionSchema.safeParse({
      allow: ['Read']
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allow).toEqual(['Read']);
      expect(result.data.deny).toEqual([]);
    }
  });

  it('passthrough — 允许未知字段', () => {
    const result = SettingsPermissionsSectionSchema.safeParse({
      allow: ['Read'],
      defaultMode: 'auto',
      additionalDirectories: ['/tmp']
    });
    expect(result.success).toBe(true);
  });

  it('无效 allow 规则（空字符串） → 失败', () => {
    const result = SettingsPermissionsSectionSchema.safeParse({
      allow: ['']
    });
    expect(result.success).toBe(false);
  });
});

describe('SettingsSchema', () => {
  it('空配置 → 通过', () => {
    const result = SettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('含 permissions → 通过', () => {
    const result = SettingsSchema.safeParse({
      permissions: {
        allow: ['Read'],
        deny: [],
        ask: []
      }
    });
    expect(result.success).toBe(true);
  });

  it('passthrough — 允许任意字段', () => {
    const result = SettingsSchema.safeParse({
      permissions: { allow: ['Read'] },
      hooks: {},
      env: { KEY: 'value' },
      mcpServers: {}
    });
    expect(result.success).toBe(true);
  });

  it('无 permissions → 通过', () => {
    const result = SettingsSchema.safeParse({
      hooks: {}
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permissions).toBeUndefined();
    }
  });
});
