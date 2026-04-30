/** resolveHooksPolicy — 4层安全门控级联决策 */

import type { HooksPolicy, HooksCustomizationSurface, HookSource } from '../types/policy';

/** 高信任来源 — 在所有门控层级中均被允许 */
const HIGH_TRUST_SOURCES: readonly HookSource[] = ['managed', 'policy', 'built-in'];

/** plugin 来源 — 在 strictPluginOnlyCustomization 层级中被允许 */
const PLUGIN_TRUST_SOURCES: readonly HookSource[] = ['plugin', ...HIGH_TRUST_SOURCES];

/** 低信任来源 — 受 workspaceTrust 和 stricter 层级限制 */
const LOW_TRUST_SOURCES: readonly HookSource[] = ['user', 'project'];

/** 判断来源是否在指定信任列表中 */
function isTrustedSource(source: HookSource, trustedSources: readonly HookSource[]): boolean {
  return trustedSources.includes(source);
}

/**
 * resolveHooksPolicy — 级联门控决策
 *
 * 参考 Claude Code 源码 hooksConfigSnapshot.ts 的执行流程:
 *
 * 1. disableAllHooks → 全禁用（仅 policy/built-in 绕过）
 * 2. allowManagedHooksOnly → 仅 managed/policy/built-in
 * 3. strictPluginOnlyCustomization → 仅 plugin/policy/built-in（检查是否锁定 hooks 表面）
 * 4. workspaceTrust → 未信任时跳过 user/project
 *
 * 优先级: 层级1最高，层级4最低。任何更高层级生效时，更低层级不再检查。
 */
export function resolveHooksPolicy(policy: HooksPolicy, hookSource: HookSource): 'allow' | 'deny' {
  // 层级1: 全局禁用 — 仅 policy/built-in 绕过
  if (policy.disableAllHooks === true) {
    return isTrustedSource(hookSource, HIGH_TRUST_SOURCES) ? 'allow' : 'deny';
  }

  // 层级2: 仅允许 managed hooks
  if (policy.allowManagedHooksOnly === true) {
    return isTrustedSource(hookSource, HIGH_TRUST_SOURCES) ? 'allow' : 'deny';
  }

  // 层级3: strictPluginOnlyCustomization
  if (policy.strictPluginOnlyCustomization !== undefined) {
    const isLockedAll = policy.strictPluginOnlyCustomization === true;
    const lockedSurfaces = isLockedAll
      ? (['hooks', 'skills', 'agents', 'mcp'] as readonly HooksCustomizationSurface[])
      : (policy.strictPluginOnlyCustomization as readonly HooksCustomizationSurface[]);

    // 检查 hooks 表面是否被锁定
    if (lockedSurfaces.includes('hooks')) {
      return isTrustedSource(hookSource, PLUGIN_TRUST_SOURCES) ? 'allow' : 'deny';
    }
  }

  // 层级4: 工作区信任 — 仅当明确设为 false 时拒绝低信任来源
  if (policy.workspaceTrust === false) {
    if (isTrustedSource(hookSource, LOW_TRUST_SOURCES)) {
      return 'deny';
    }
  }

  // 默认允许
  return 'allow';
}
