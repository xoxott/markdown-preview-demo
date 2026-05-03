/** PermissionMode 扩展测试 */

import { describe, expect, it } from 'vitest';
import type { PermissionMode } from '../types/permission';
import {
  PERMISSION_MODES,
  classifyPermissionMode,
  isAcceptEditsDeniedTool,
  isAutoApproveReadonlyMode,
  isInteractiveMode,
  isPlanModeAllowedTool,
  isSilentDenyMode,
  shouldAvoidPermissionPrompts
} from '../types/permission-mode';

describe('PermissionMode', () => {
  it('应有7种模式', () => {
    expect(PERMISSION_MODES).toEqual([
      'default',
      'plan',
      'acceptEdits',
      'bypassPermissions',
      'auto',
      'restricted',
      'dontAsk'
    ]);
    expect(PERMISSION_MODES.length).toBe(7);
  });

  it('旧3种模式值仍有效', () => {
    const oldModes: PermissionMode[] = ['default', 'auto', 'restricted'];
    for (const mode of oldModes) {
      expect(PERMISSION_MODES).toContain(mode);
    }
  });
});

describe('classifyPermissionMode', () => {
  it('default → interactive', () => {
    expect(classifyPermissionMode('default')).toBe('interactive');
  });

  it('plan → interactive', () => {
    expect(classifyPermissionMode('plan')).toBe('interactive');
  });

  it('acceptEdits → interactive', () => {
    expect(classifyPermissionMode('acceptEdits')).toBe('interactive');
  });

  it('auto → autoapprove', () => {
    expect(classifyPermissionMode('auto')).toBe('autoapprove');
  });

  it('restricted → restricted', () => {
    expect(classifyPermissionMode('restricted')).toBe('restricted');
  });

  it('bypassPermissions → bypass', () => {
    expect(classifyPermissionMode('bypassPermissions')).toBe('bypass');
  });

  it('dontAsk → silentDeny', () => {
    expect(classifyPermissionMode('dontAsk')).toBe('silentDeny');
  });
});

describe('isInteractiveMode', () => {
  it('default/plan/acceptEdits → true', () => {
    expect(isInteractiveMode('default')).toBe(true);
    expect(isInteractiveMode('plan')).toBe(true);
    expect(isInteractiveMode('acceptEdits')).toBe(true);
  });

  it('auto/restricted/bypass/dontAsk → false', () => {
    expect(isInteractiveMode('auto')).toBe(false);
    expect(isInteractiveMode('restricted')).toBe(false);
    expect(isInteractiveMode('bypassPermissions')).toBe(false);
    expect(isInteractiveMode('dontAsk')).toBe(false);
  });
});

describe('isAutoApproveReadonlyMode', () => {
  it('auto → true', () => {
    expect(isAutoApproveReadonlyMode('auto')).toBe(true);
  });

  it('其他模式 → false', () => {
    expect(isAutoApproveReadonlyMode('default')).toBe(false);
    expect(isAutoApproveReadonlyMode('restricted')).toBe(false);
  });
});

describe('isPlanModeAllowedTool', () => {
  it('白名单工具 → true', () => {
    expect(isPlanModeAllowedTool('read')).toBe(true);
    expect(isPlanModeAllowedTool('glob')).toBe(true);
  });

  it('非白名单工具 → false', () => {
    expect(isPlanModeAllowedTool('Bash')).toBe(false);
    expect(isPlanModeAllowedTool('Write')).toBe(false);
  });
});

describe('isAcceptEditsDeniedTool', () => {
  it('黑名单工具 → true', () => {
    expect(isAcceptEditsDeniedTool('bash')).toBe(true);
    expect(isAcceptEditsDeniedTool('shell')).toBe(true);
  });

  it('非黑名单工具 → false', () => {
    expect(isAcceptEditsDeniedTool('Write')).toBe(false);
    expect(isAcceptEditsDeniedTool('Read')).toBe(false);
  });
});

describe('isSilentDenyMode', () => {
  it('dontAsk → true', () => {
    expect(isSilentDenyMode('dontAsk')).toBe(true);
  });

  it('其他模式 → false', () => {
    expect(isSilentDenyMode('default')).toBe(false);
    expect(isSilentDenyMode('auto')).toBe(false);
    expect(isSilentDenyMode('bypassPermissions')).toBe(false);
    expect(isSilentDenyMode('restricted')).toBe(false);
  });
});

describe('shouldAvoidPermissionPrompts', () => {
  it('dontAsk → true', () => {
    expect(shouldAvoidPermissionPrompts('dontAsk')).toBe(true);
  });

  it('其他模式 → false', () => {
    expect(shouldAvoidPermissionPrompts('default')).toBe(false);
    expect(shouldAvoidPermissionPrompts('auto')).toBe(false);
    expect(shouldAvoidPermissionPrompts('bypassPermissions')).toBe(false);
  });
});
