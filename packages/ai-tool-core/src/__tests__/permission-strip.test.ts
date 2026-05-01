/** 权限剥离与恢复测试 — stripDangerousPermissions / restoreDangerousPermissions */

import { describe, expect, it } from 'vitest';
import type { ToolPermissionContext } from '../types/permission-context';
import type { PermissionAllowRule } from '../types/permission-rule';
import {
  DANGEROUS_BASH_PATTERNS,
  isDangerousBashPermission,
  restoreDangerousPermissions,
  stripDangerousPermissionsForAutoMode
} from '../types/permission-strip';

const baseCtx: ToolPermissionContext = {
  mode: 'default',
  allowRules: [],
  denyRules: [],
  askRules: [],
  workingDirectories: [],
  bypassPermissions: false
};

describe('DANGEROUS_BASH_PATTERNS', () => {
  it('应包含 8 种危险 Bash 模式', () => {
    expect(DANGEROUS_BASH_PATTERNS).toHaveLength(8);
    expect(DANGEROUS_BASH_PATTERNS).toContain('bash(python *)');
    expect(DANGEROUS_BASH_PATTERNS).toContain('bash(*)');
  });
});

describe('isDangerousBashPermission', () => {
  it('危险模式 → true', () => {
    expect(isDangerousBashPermission('bash(python *)')).toBe(true);
    expect(isDangerousBashPermission('bash(node *)')).toBe(true);
    expect(isDangerousBashPermission('bash(bash *)')).toBe(true);
    expect(isDangerousBashPermission('bash(*)')).toBe(true);
    expect(isDangerousBashPermission('bash(sudo *)')).toBe(true);
  });

  it('非危险模式 → false', () => {
    expect(isDangerousBashPermission('bash(git status)')).toBe(false);
    expect(isDangerousBashPermission('read')).toBe(false);
    expect(isDangerousBashPermission('write')).toBe(false);
  });
});

describe('stripDangerousPermissionsForAutoMode', () => {
  it('剥离 bash(python *) 规则 → 移除并暂存', () => {
    const dangerousRule: PermissionAllowRule = {
      behavior: 'allow',
      ruleValue: 'bash(python *)',
      source: 'user',
      reason: '预授权 python'
    };
    const safeRule: PermissionAllowRule = {
      behavior: 'allow',
      ruleValue: 'read',
      source: 'project'
    };
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [safeRule, dangerousRule]
    };
    const result = stripDangerousPermissionsForAutoMode(ctx);
    expect(result.allowRules).toHaveLength(1);
    expect(result.allowRules[0].ruleValue).toBe('read');
    expect(result.strippedDangerousRules).toHaveLength(1);
    expect(result.strippedDangerousRules![0].ruleValue).toBe('bash(python *)');
  });

  it('剥离多条危险规则 → 全部暂存', () => {
    const rules: PermissionAllowRule[] = [
      { behavior: 'allow', ruleValue: 'bash(python *)', source: 'user' },
      { behavior: 'allow', ruleValue: 'bash(node *)', source: 'user' },
      { behavior: 'allow', ruleValue: 'bash(*)', source: 'session' },
      { behavior: 'allow', ruleValue: 'read', source: 'project' }
    ];
    const ctx: ToolPermissionContext = { ...baseCtx, allowRules: rules };
    const result = stripDangerousPermissionsForAutoMode(ctx);
    expect(result.allowRules).toHaveLength(1);
    expect(result.strippedDangerousRules).toHaveLength(3);
  });

  it('无危险规则 → 返回原上下文 (不变)', () => {
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [{ behavior: 'allow', ruleValue: 'read', source: 'project' }]
    };
    const result = stripDangerousPermissionsForAutoMode(ctx);
    expect(result).toBe(ctx);
  });

  it('已有暂存规则 → 新剥离追加到暂存列表', () => {
    const prevStripped: PermissionAllowRule[] = [
      { behavior: 'allow', ruleValue: 'bash(sudo *)', source: 'user' }
    ];
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [
        { behavior: 'allow', ruleValue: 'bash(python *)', source: 'user' },
        { behavior: 'allow', ruleValue: 'read', source: 'project' }
      ],
      strippedDangerousRules: prevStripped
    };
    const result = stripDangerousPermissionsForAutoMode(ctx);
    expect(result.strippedDangerousRules).toHaveLength(2);
    expect(result.strippedDangerousRules![0].ruleValue).toBe('bash(sudo *)');
    expect(result.strippedDangerousRules![1].ruleValue).toBe('bash(python *)');
  });

  it('空 allowRules → 返回原上下文 (不变)', () => {
    const result = stripDangerousPermissionsForAutoMode(baseCtx);
    expect(result).toBe(baseCtx);
  });
});

describe('restoreDangerousPermissions', () => {
  it('恢复暂存规则 → 合并到 allowRules', () => {
    const strippedRules: PermissionAllowRule[] = [
      { behavior: 'allow', ruleValue: 'bash(python *)', source: 'user' },
      { behavior: 'allow', ruleValue: 'bash(*)', source: 'session' }
    ];
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [{ behavior: 'allow', ruleValue: 'read', source: 'project' }],
      strippedDangerousRules: strippedRules
    };
    const result = restoreDangerousPermissions(ctx);
    expect(result.allowRules).toHaveLength(3);
    expect(result.strippedDangerousRules).toHaveLength(0);
  });

  it('无暂存规则 → 返回原上下文 (不变)', () => {
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [{ behavior: 'allow', ruleValue: 'read', source: 'project' }]
    };
    const result = restoreDangerousPermissions(ctx);
    expect(result).toBe(ctx);
  });

  it('空 strippedDangerousRules → 返回原上下文 (不变)', () => {
    const ctx: ToolPermissionContext = {
      ...baseCtx,
      allowRules: [{ behavior: 'allow', ruleValue: 'read', source: 'project' }],
      strippedDangerousRules: []
    };
    const result = restoreDangerousPermissions(ctx);
    expect(result).toBe(ctx);
  });

  it('strip → restore 完整周期 → 规则完整恢复', () => {
    const originalRules: PermissionAllowRule[] = [
      { behavior: 'allow', ruleValue: 'bash(python *)', source: 'user' },
      { behavior: 'allow', ruleValue: 'read', source: 'project' }
    ];
    const ctx: ToolPermissionContext = { ...baseCtx, allowRules: originalRules };
    const stripped = stripDangerousPermissionsForAutoMode(ctx);
    expect(stripped.allowRules).toHaveLength(1);
    const restored = restoreDangerousPermissions(stripped);
    expect(restored.allowRules).toHaveLength(2);
    expect(restored.strippedDangerousRules).toHaveLength(0);
  });
});
