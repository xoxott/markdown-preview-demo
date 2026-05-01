/** Settings 桥接测试 — buildPermissionContextFromSettings + reloadFromSettings */

import { describe, expect, it } from 'vitest';
import type { MergedSettings } from '../types/settings-schema';
import { buildPermissionContextFromSettings } from '../types/settings-bridge';
import { applyPermissionUpdate } from '../types/permission-context';
import type { ToolPermissionContext } from '../types/permission-context';

describe('buildPermissionContextFromSettings', () => {
  it('空配置 → 默认上下文 + settings 字段', () => {
    const merged: MergedSettings = {};
    const result = buildPermissionContextFromSettings(merged, ['project']);
    expect(result.mode).toBe('default');
    expect(result.allowRules).toHaveLength(0);
    expect(result.denyRules).toHaveLength(0);
    expect(result.settings).toEqual({});
  });

  it('含 allow 规则 → allowRules 非空', () => {
    const merged = { permissions: { allow: ['Read'] } } as MergedSettings;
    const result = buildPermissionContextFromSettings(merged, ['project']);
    expect(result.allowRules).toHaveLength(1);
    expect(result.allowRules[0].ruleValue).toBe('Read');
    expect(result.allowRules[0].source).toBe('project');
  });

  it('含 deny 规则 → denyRules 非空', () => {
    const merged = { permissions: { deny: ['Bash(rm *)'] } } as MergedSettings;
    const result = buildPermissionContextFromSettings(merged, ['project']);
    expect(result.denyRules).toHaveLength(1);
    expect(result.denyRules[0].ruleValue).toBe('Bash(rm *)');
  });

  it('含 ask 规则 → askRules 非空', () => {
    const merged = { permissions: { ask: ['Write'] } } as MergedSettings;
    const result = buildPermissionContextFromSettings(merged, ['project']);
    expect(result.askRules).toHaveLength(1);
    expect(result.askRules[0].ruleValue).toBe('Write');
  });

  it('与 baseCtx 合并 → 规则追加到现有规则', () => {
    const baseCtx: ToolPermissionContext = {
      mode: 'auto',
      allowRules: [{ behavior: 'allow', ruleValue: 'Glob', source: 'session' }],
      denyRules: [],
      askRules: [],
      workingDirectories: ['/tmp'],
      bypassPermissions: false
    };
    const merged = { permissions: { allow: ['Read'] } } as MergedSettings;
    const result = buildPermissionContextFromSettings(merged, ['project'], baseCtx);
    expect(result.allowRules).toHaveLength(2);
    expect(result.mode).toBe('auto');
    expect(result.workingDirectories).toEqual(['/tmp']);
  });

  it('settings 字段附加到上下文', () => {
    const merged = { permissions: { allow: ['Read'] } } as MergedSettings;
    const result = buildPermissionContextFromSettings(merged, ['project']);
    expect(result.settings).toBeDefined();
    expect(result.settings?.permissions?.allow).toContain('Read');
  });
});

describe('reloadFromSettings PermissionUpdate', () => {
  it('reloadFromSettings → 替换所有规则 + 附加 settings', () => {
    const ctx: ToolPermissionContext = {
      mode: 'default',
      allowRules: [{ behavior: 'allow', ruleValue: 'OldRule', source: 'session' }],
      denyRules: [],
      askRules: [],
      workingDirectories: ['/tmp'],
      bypassPermissions: false
    };
    const merged: MergedSettings = {
      permissions: { allow: ['Read'], deny: ['Bash(rm *)'], ask: [] }
    };
    const result = applyPermissionUpdate(ctx, {
      type: 'reloadFromSettings',
      merged,
      sourceLayers: ['project']
    });
    expect(result.allowRules).toHaveLength(1);
    expect(result.allowRules[0].ruleValue).toBe('Read');
    expect(result.denyRules).toHaveLength(1);
    expect(result.settings).toBeDefined();
    expect(result.mode).toBe('default');
    expect(result.workingDirectories).toEqual(['/tmp']);
  });
});
