/** 权限同步消息结构测试 */

import { describe, expect, it } from 'vitest';
import type { PermissionUpdateMessage, SettingsUpdateMessage } from '../../types/permission-sync';
import type { PermissionBubbleRule } from '../../types/permission-bubble';

describe('PermissionUpdateMessage', () => {
  it('addRules 更新 → 包含规则列表', () => {
    const msg: PermissionUpdateMessage = {
      type: 'permission_update',
      updateType: 'addRules',
      rules: [{ behavior: 'allow', ruleValue: 'Bash(git push:*)', source: 'user' }]
    };
    expect(msg.type).toBe('permission_update');
    expect(msg.updateType).toBe('addRules');
    expect(msg.rules!.length).toBe(1);
  });

  it('setMode 更新 → 包含模式', () => {
    const msg: PermissionUpdateMessage = {
      type: 'permission_update',
      updateType: 'setMode',
      mode: 'auto'
    };
    expect(msg.mode).toBe('auto');
  });

  it('reloadFromSettings 更新 → 包含 settings', () => {
    const msg: PermissionUpdateMessage = {
      type: 'permission_update',
      updateType: 'reloadFromSettings',
      settings: { permissions: { allow: ['Read'] } }
    };
    expect(msg.settings).toBeDefined();
  });
});

describe('SettingsUpdateMessage', () => {
  it('settings 变更 → 包含来源层', () => {
    const msg: SettingsUpdateMessage = {
      type: 'settings_update',
      sourceLayer: 'project',
      changedFields: ['permissions.allow']
    };
    expect(msg.sourceLayer).toBe('project');
    expect(msg.changedFields!.length).toBe(1);
  });
});

describe('PermissionBubbleRule', () => {
  it('简化权限规则 → 3种行为', () => {
    const rules: PermissionBubbleRule[] = [
      { behavior: 'allow', ruleValue: 'Read' },
      { behavior: 'deny', ruleValue: 'Bash(rm -rf *)', reason: '危险命令' },
      { behavior: 'ask', ruleValue: 'Write', source: 'project' }
    ];
    expect(rules[0].behavior).toBe('allow');
    expect(rules[1].behavior).toBe('deny');
    expect(rules[2].behavior).toBe('ask');
  });
});
