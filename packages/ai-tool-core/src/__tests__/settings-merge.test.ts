/** Settings 合并引擎测试 — mergeSettingsLayers + customizer + policy first-source-wins */

import { describe, expect, it } from 'vitest';
import type { SettingSource } from '../types/settings-source';
import type { MergedSettings } from '../types/settings-schema';
import type { SettingLayer } from '../types/settings-layer';
import {
  applyPolicyFirstSourceWins,
  deepMergeSettings,
  mergeSettingsLayers
} from '../types/settings-merge';

function makeSource(layer: SettingLayer, content: Record<string, unknown>): SettingSource {
  return {
    metadata: { layer, path: `/${layer}/settings.json`, exists: true },
    content
  };
}

describe('deepMergeSettings', () => {
  it('基本类型 → overlay 覆盖 base', () => {
    const result = deepMergeSettings({ key: 'old' }, { key: 'new' });
    expect(result.key).toBe('new');
  });

  it('数组 → concat 去重', () => {
    const result = deepMergeSettings({ items: ['a', 'b'] }, { items: ['b', 'c'] });
    expect(result.items).toEqual(['a', 'b', 'c']);
  });

  it('嵌套对象 → 递归合并', () => {
    const result = deepMergeSettings({ nested: { a: 1, b: 2 } }, { nested: { b: 3, c: 4 } });
    expect(result.nested).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('overlay undefined → 删除 base 键', () => {
    const result = deepMergeSettings({ a: 1, b: 2 }, { b: undefined }) as MergedSettings;
    expect(result.a).toBe(1);
    expect(result.b).toBeUndefined();
  });

  it('permissions 数组 → concat 去重', () => {
    const result = deepMergeSettings(
      { permissions: { allow: ['Read'] } },
      { permissions: { allow: ['Bash'] } }
    ) as MergedSettings;
    expect(result.permissions?.allow).toEqual(['Read', 'Bash']);
  });
});

describe('applyPolicyFirstSourceWins', () => {
  it('policy 补充 base 缺失字段 → 添加', () => {
    const base: MergedSettings = { permissions: { allow: ['Read'] } } as MergedSettings;
    const policySource = makeSource('policy', { env: { KEY: 'value' } });
    const result = applyPolicyFirstSourceWins(base, policySource);
    expect((result as any).env?.KEY).toBe('value');
    expect(result.permissions?.allow).toEqual(['Read']);
  });

  it('policy 不覆盖 base 已有字段 → first-source-wins', () => {
    const base: MergedSettings = {
      permissions: { allow: ['Read'], deny: ['Bash(rm *)'] }
    } as MergedSettings;
    const policySource = makeSource('policy', {
      permissions: { allow: ['PolicyTool'], deny: ['PolicyDeny'] }
    });
    const result = applyPolicyFirstSourceWins(base, policySource);
    // base 已有 permissions → policy 的 permissions 子字段也遵循 first-source-wins
    expect(result.permissions?.allow).toEqual(['Read']); // 不覆盖
    expect(result.permissions?.deny).toEqual(['Bash(rm *)']); // 不覆盖
  });

  it('policy 嵌套对象补充缺失子字段', () => {
    const base: MergedSettings = { permissions: { allow: ['Read'] } } as MergedSettings;
    const policySource = makeSource('policy', { permissions: { deny: ['PolicyDeny'] } });
    const result = applyPolicyFirstSourceWins(base, policySource);
    expect(result.permissions?.allow).toEqual(['Read']); // 已有 → 不覆盖
    expect(result.permissions?.deny).toEqual(['PolicyDeny']); // 缺失 → 补充
  });
});

describe('mergeSettingsLayers', () => {
  it('空源列表 → 空配置', () => {
    const result = mergeSettingsLayers([]);
    expect(result).toEqual({});
  });

  it('单层配置 → 直接输出', () => {
    const sources = [makeSource('project', { permissions: { allow: ['Read'] } })];
    const result = mergeSettingsLayers(sources);
    expect(result.permissions?.allow).toContain('Read');
  });

  it('多层叠加 — user + project → 合并', () => {
    const sources = [
      makeSource('user', { permissions: { allow: ['Read'] } }),
      makeSource('project', { permissions: { allow: ['Bash(git push)'] } })
    ];
    const result = mergeSettingsLayers(sources);
    expect(result.permissions?.allow).toEqual(['Read', 'Bash(git push)']);
  });

  it('3层叠加 — user + project + local → 按优先级排序合并', () => {
    const sources = [
      makeSource('local', { permissions: { allow: ['LocalTool'] } }),
      makeSource('user', { permissions: { allow: ['Read'] } }),
      makeSource('project', { permissions: { allow: ['Bash(git push)'] } })
    ];
    const result = mergeSettingsLayers(sources);
    expect(result.permissions?.allow).toEqual(['Read', 'Bash(git push)', 'LocalTool']);
  });

  it('policy 层 — first-source-wins 不覆盖已有字段', () => {
    const sources = [
      makeSource('user', { permissions: { allow: ['Read'] }, env: { USER_KEY: '1' } }),
      makeSource('policy', { env: { POLICY_KEY: '2' } })
    ];
    const result = mergeSettingsLayers(sources);
    expect(result.permissions?.allow).toEqual(['Read']);
    expect((result as any).env?.USER_KEY).toBe('1');
    expect((result as any).env?.POLICY_KEY).toBe('2');
  });

  it('deny 数组合并去重', () => {
    const sources = [
      makeSource('user', { permissions: { deny: ['Bash(rm *)'] } }),
      makeSource('project', { permissions: { deny: ['Bash(rm *)'] } })
    ];
    const result = mergeSettingsLayers(sources);
    expect(result.permissions?.deny).toEqual(['Bash(rm *)']);
  });
});
