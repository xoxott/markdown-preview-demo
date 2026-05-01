/** ToolPermissionContext + PermissionUpdate 测试 */

import { describe, expect, it } from 'vitest';
import type { ToolPermissionContext } from '../types/permission-context';
import {
  DEFAULT_TOOL_PERMISSION_CONTEXT,
  applyPermissionUpdate
} from '../types/permission-context';

describe('DEFAULT_TOOL_PERMISSION_CONTEXT', () => {
  it('应有正确的默认值', () => {
    expect(DEFAULT_TOOL_PERMISSION_CONTEXT.mode).toBe('default');
    expect(DEFAULT_TOOL_PERMISSION_CONTEXT.allowRules).toEqual([]);
    expect(DEFAULT_TOOL_PERMISSION_CONTEXT.denyRules).toEqual([]);
    expect(DEFAULT_TOOL_PERMISSION_CONTEXT.askRules).toEqual([]);
    expect(DEFAULT_TOOL_PERMISSION_CONTEXT.workingDirectories).toEqual([]);
    expect(DEFAULT_TOOL_PERMISSION_CONTEXT.bypassPermissions).toBe(false);
  });
});

describe('applyPermissionUpdate', () => {
  const baseCtx: ToolPermissionContext = {
    mode: 'default',
    allowRules: [
      { behavior: 'allow', ruleValue: 'Read', source: 'project', reason: '只读工具允许' }
    ],
    denyRules: [
      { behavior: 'deny', ruleValue: 'Bash(rm *)', source: 'project', reason: '禁止删除命令' }
    ],
    askRules: [{ behavior: 'ask', ruleValue: 'Write', source: 'session', reason: '写入需确认' }],
    workingDirectories: ['/home/user'],
    bypassPermissions: false
  };

  it('setMode — 设置权限模式', () => {
    const result = applyPermissionUpdate(baseCtx, { type: 'setMode', mode: 'auto' });
    expect(result.mode).toBe('auto');
    expect(result.allowRules).toEqual(baseCtx.allowRules); // 其他不变
  });

  it('addRules — 添加 allow/deny/ask 规则', () => {
    const result = applyPermissionUpdate(DEFAULT_TOOL_PERMISSION_CONTEXT, {
      type: 'addRules',
      rules: [
        { behavior: 'allow', ruleValue: 'Glob', source: 'local', reason: '搜索允许' },
        { behavior: 'deny', ruleValue: 'Bash(curl *)', source: 'policy', reason: '禁止curl' },
        { behavior: 'ask', ruleValue: 'Bash', source: 'user', reason: 'Bash需确认' }
      ]
    });
    expect(result.allowRules.length).toBe(1);
    expect(result.denyRules.length).toBe(1);
    expect(result.askRules.length).toBe(1);
  });

  it('removeRules — 按规则值移除', () => {
    const result = applyPermissionUpdate(baseCtx, {
      type: 'removeRules',
      ruleValues: ['Bash(rm *)', 'Write']
    });
    expect(result.denyRules.length).toBe(0); // Bash(rm *) 已移除
    expect(result.askRules.length).toBe(0); // Write 已移除
    expect(result.allowRules.length).toBe(1); // Read 保留
  });

  it('replaceRules — 替换所有规则', () => {
    const result = applyPermissionUpdate(DEFAULT_TOOL_PERMISSION_CONTEXT, {
      type: 'replaceRules',
      rules: [
        { behavior: 'allow', ruleValue: 'Read', source: 'project' },
        { behavior: 'deny', ruleValue: 'Bash', source: 'policy', reason: '禁止Bash' }
      ]
    });
    expect(result.allowRules.length).toBe(1);
    expect(result.denyRules.length).toBe(1);
    expect(result.askRules.length).toBe(0);
  });

  it('addDirs — 添加工作目录', () => {
    const result = applyPermissionUpdate(baseCtx, {
      type: 'addDirs',
      directories: ['/tmp', '/var']
    });
    expect(result.workingDirectories).toEqual(['/home/user', '/tmp', '/var']);
  });

  it('removeDirs — 移除工作目录', () => {
    const result = applyPermissionUpdate(baseCtx, {
      type: 'removeDirs',
      directories: ['/home/user']
    });
    expect(result.workingDirectories).toEqual([]);
  });

  it('组合操作 — 多次 apply 不变语义', () => {
    let ctx = DEFAULT_TOOL_PERMISSION_CONTEXT;
    ctx = applyPermissionUpdate(ctx, { type: 'setMode', mode: 'plan' });
    ctx = applyPermissionUpdate(ctx, {
      type: 'addRules',
      rules: [{ behavior: 'allow', ruleValue: 'Read', source: 'project' }]
    });
    ctx = applyPermissionUpdate(ctx, { type: 'addDirs', directories: ['/home'] });
    expect(ctx.mode).toBe('plan');
    expect(ctx.allowRules.length).toBe(1);
    expect(ctx.workingDirectories).toEqual(['/home']);
  });
});
