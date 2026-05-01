import { describe, expect, it } from 'vitest';
import { resolveHooksPolicy } from '../utils/resolvePolicy';
import type { HookSource, HooksPolicy } from '../types/policy';

describe('resolveHooksPolicy — 4层安全门控', () => {
  /** 层级1: disableAllHooks — 全禁用 */

  it('disableAllHooks=true → 拒绝所有非高信任来源', () => {
    const policy: HooksPolicy = { disableAllHooks: true };

    expect(resolveHooksPolicy(policy, 'user')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'project')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'plugin')).toBe('deny');
  });

  it('disableAllHooks=true → 允许 managed/policy/built-in', () => {
    const policy: HooksPolicy = { disableAllHooks: true };

    expect(resolveHooksPolicy(policy, 'managed')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'policy')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'built-in')).toBe('allow');
  });

  /** 层级2: allowManagedHooksOnly — 仅允许 managed */

  it('allowManagedHooksOnly=true → 拒绝 user/project/plugin', () => {
    const policy: HooksPolicy = { allowManagedHooksOnly: true };

    expect(resolveHooksPolicy(policy, 'user')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'project')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'plugin')).toBe('deny');
  });

  it('allowManagedHooksOnly=true → 允许 managed/policy/built-in', () => {
    const policy: HooksPolicy = { allowManagedHooksOnly: true };

    expect(resolveHooksPolicy(policy, 'managed')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'policy')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'built-in')).toBe('allow');
  });

  /** 层级2 优先级高于层级3 — disableAllHooks 时不再检查 allowManagedHooksOnly */

  it('disableAllHooks 优先级高于 allowManagedHooksOnly', () => {
    const policy: HooksPolicy = { disableAllHooks: true, allowManagedHooksOnly: true };

    // disableAllHooks=true 时，managed 也被允许（高信任绕过）
    expect(resolveHooksPolicy(policy, 'managed')).toBe('allow');
    // plugin 被拒绝（非高信任）
    expect(resolveHooksPolicy(policy, 'plugin')).toBe('deny');
  });

  /** 层级3: strictPluginOnlyCustomization — 仅允许 plugin/policy/built-in */

  it('strictPluginOnlyCustomization=true → 锁定全部表面，拒绝 user/project', () => {
    const policy: HooksPolicy = { strictPluginOnlyCustomization: true };

    expect(resolveHooksPolicy(policy, 'user')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'project')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'plugin')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'managed')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'policy')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'built-in')).toBe('allow');
  });

  it('strictPluginOnlyCustomization=["hooks"] → 锁定 hooks 表面', () => {
    const policy: HooksPolicy = { strictPluginOnlyCustomization: ['hooks'] };

    expect(resolveHooksPolicy(policy, 'user')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'plugin')).toBe('allow');
  });

  it('strictPluginOnlyCustomization=["skills"] → 不锁定 hooks 表面，user 可通过（workspaceTrust 默认允许）', () => {
    const policy: HooksPolicy = { strictPluginOnlyCustomization: ['skills'] };

    // hooks 表面未被锁定 → user 允许
    expect(resolveHooksPolicy(policy, 'user')).toBe('allow');
  });

  /** 层级4: workspaceTrust — 未信任时跳过 user/project */

  it('workspaceTrust=false → 拒绝 user/project，允许其他来源', () => {
    const policy: HooksPolicy = { workspaceTrust: false };

    expect(resolveHooksPolicy(policy, 'user')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'project')).toBe('deny');
    expect(resolveHooksPolicy(policy, 'managed')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'plugin')).toBe('allow');
  });

  it('workspaceTrust 未设置 → 默认允许所有来源', () => {
    const policy: HooksPolicy = {};

    expect(resolveHooksPolicy(policy, 'user')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'project')).toBe('allow');
  });

  it('workspaceTrust=true → 允许所有来源', () => {
    const policy: HooksPolicy = { workspaceTrust: true };

    expect(resolveHooksPolicy(policy, 'user')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'project')).toBe('allow');
    expect(resolveHooksPolicy(policy, 'managed')).toBe('allow');
  });

  /** 空策略 → 允许所有来源 */

  it('空策略 → 允许所有来源', () => {
    const policy: HooksPolicy = {};

    for (const source of [
      'user',
      'project',
      'managed',
      'plugin',
      'policy',
      'built-in'
    ] as HookSource[]) {
      expect(resolveHooksPolicy(policy, source)).toBe('allow');
    }
  });

  /** 级联优先级测试 — 更高层级覆盖更低层级 */

  it('allowManagedHooksOnly 覆盖 workspaceTrust', () => {
    const policy: HooksPolicy = { allowManagedHooksOnly: true, workspaceTrust: true };

    // 即使 workspaceTrust=true，allowManagedHooksOnly 仍然拒绝 user
    expect(resolveHooksPolicy(policy, 'user')).toBe('deny');
  });

  it('strictPluginOnlyCustomization 覆盖 workspaceTrust', () => {
    const policy: HooksPolicy = { strictPluginOnlyCustomization: ['hooks'], workspaceTrust: true };

    // workspaceTrust=true，但 strictPluginOnly 锁定了 hooks → user 被拒绝
    expect(resolveHooksPolicy(policy, 'user')).toBe('deny');
  });
});
