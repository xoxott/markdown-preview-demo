/** 权限模式切换测试 — transitionPermissionMode */

import { describe, expect, it } from 'vitest';
import type { ToolPermissionContext } from '../types/permission-context';
import type { PermissionAllowRule } from '../types/permission-rule';
import {
  shouldRestoreOnTransition,
  shouldStripOnTransition,
  transitionPermissionMode
} from '../types/permission-strip';

const baseCtx: ToolPermissionContext = {
  mode: 'default',
  allowRules: [],
  denyRules: [],
  askRules: [],
  workingDirectories: [],
  bypassPermissions: false
};

describe('shouldStripOnTransition', () => {
  it('default → auto → true', () => {
    expect(shouldStripOnTransition('default', 'auto')).toBe(true);
  });

  it('plan → auto → true', () => {
    expect(shouldStripOnTransition('plan', 'auto')).toBe(true);
  });

  it('acceptEdits → auto → true', () => {
    expect(shouldStripOnTransition('acceptEdits', 'auto')).toBe(true);
  });

  it('auto → auto → false (同模式)', () => {
    expect(shouldStripOnTransition('auto', 'auto')).toBe(false);
  });

  it('default → restricted → false (非 auto 目标)', () => {
    expect(shouldStripOnTransition('default', 'restricted')).toBe(false);
  });
});

describe('shouldRestoreOnTransition', () => {
  it('auto → default → true', () => {
    expect(shouldRestoreOnTransition('auto', 'default')).toBe(true);
  });

  it('auto → restricted → true', () => {
    expect(shouldRestoreOnTransition('auto', 'restricted')).toBe(true);
  });

  it('auto → plan → true', () => {
    expect(shouldRestoreOnTransition('auto', 'plan')).toBe(true);
  });

  it('auto → auto → false (同模式)', () => {
    expect(shouldRestoreOnTransition('auto', 'auto')).toBe(false);
  });

  it('default → restricted → false (非 auto 源)', () => {
    expect(shouldRestoreOnTransition('default', 'restricted')).toBe(false);
  });
});

describe('transitionPermissionMode', () => {
  it('default → auto → 触发 strip', () => {
    const dangerousRule: PermissionAllowRule = {
      behavior: 'allow',
      ruleValue: 'bash(python *)',
      source: 'user'
    };
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [dangerousRule, { behavior: 'allow', ruleValue: 'read', source: 'project' }]
    };
    const result = transitionPermissionMode(ctx, 'auto');
    expect(result.mode).toBe('auto');
    expect(result.allowRules).toHaveLength(1);
    expect(result.strippedDangerousRules).toHaveLength(1);
  });

  it('auto → default → 触发 restore', () => {
    const strippedRules: PermissionAllowRule[] = [
      { behavior: 'allow', ruleValue: 'bash(python *)', source: 'user' }
    ];
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      mode: 'auto',
      allowRules: [{ behavior: 'allow', ruleValue: 'read', source: 'project' }],
      strippedDangerousRules: strippedRules
    };
    const result = transitionPermissionMode(ctx, 'default');
    expect(result.mode).toBe('default');
    expect(result.allowRules).toHaveLength(2);
    expect(result.strippedDangerousRules).toHaveLength(0);
  });

  it('default → restricted → 仅切换模式 (不触发 strip/restore)', () => {
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [{ behavior: 'allow', ruleValue: 'read', source: 'project' }]
    };
    const result = transitionPermissionMode(ctx, 'restricted');
    expect(result.mode).toBe('restricted');
    expect(result.allowRules).toHaveLength(1);
    expect(result.strippedDangerousRules).toBeUndefined();
  });

  it('auto → auto → 仅切换模式 (同模式不触发 strip/restore)', () => {
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      mode: 'auto',
      allowRules: [{ behavior: 'allow', ruleValue: 'read', source: 'project' }]
    };
    const result = transitionPermissionMode(ctx, 'auto');
    expect(result.mode).toBe('auto');
    expect(result.allowRules).toHaveLength(1);
  });

  it('完整周期: default → auto → default → 规则完整恢复', () => {
    const originalRules: PermissionAllowRule[] = [
      { behavior: 'allow', ruleValue: 'bash(python *)', source: 'user' },
      { behavior: 'allow', ruleValue: 'read', source: 'project' }
    ];
    const ctx: ToolPermissionContext = { ...baseCtx, allowRules: originalRules };
    // Step 1: 进入 auto (strip)
    const autoCtx = transitionPermissionMode(ctx, 'auto');
    expect(autoCtx.mode).toBe('auto');
    expect(autoCtx.allowRules).toHaveLength(1);
    expect(autoCtx.strippedDangerousRules).toHaveLength(1);
    // Step 2: 退出 auto (restore)
    const defaultCtx = transitionPermissionMode(autoCtx, 'default');
    expect(defaultCtx.mode).toBe('default');
    expect(defaultCtx.allowRules).toHaveLength(2);
    expect(defaultCtx.strippedDangerousRules).toHaveLength(0);
  });
});
