/** HooksPolicy — 4层安全门控类型定义 */

/** Hook 来源类型 — 决定安全门控中的信任级别 */
export type HookSource = 'user' | 'project' | 'managed' | 'plugin' | 'policy' | 'built-in';

/** Hook 安全策略层级 — resolveHooksPolicy 的最终决策 */
export type HooksTrustLevel = 'full' | 'managed_only' | 'plugin_only' | 'disabled';

/** 可定制表面 — strictPluginOnlyCustomization 可锁定哪些表面 */
export type HooksCustomizationSurface = 'hooks' | 'skills' | 'agents' | 'mcp';

/** HooksPolicy — 4层安全门控配置
 *
 * 参考 Claude Code 源码 hooksConfigSnapshot.ts 的级联门控逻辑:
 *
 * 层级1: disableAllHooks — 全局禁用所有 hooks（仅 policy/built-in 可绕过）
 * 层级2: allowManagedHooksOnly — 仅允许 managed/policy/built-in 来源的 hooks
 * 层级3: strictPluginOnlyCustomization — 仅允许 plugin/policy/built-in 来源（可锁定指定表面）
 * 层级4: workspaceTrust — 工作区未信任时跳过 user/project 来源的 hooks
 */
export interface HooksPolicy {
  /** 层级1: 全局禁用所有 hooks（含 managed） */
  readonly disableAllHooks?: boolean;
  /** 层级2: 仅允许 managed hooks */
  readonly allowManagedHooksOnly?: boolean;
  /** 层级3: 仅允许 plugin/policy 来源（true=锁定全部表面, array=锁定指定表面） */
  readonly strictPluginOnlyCustomization?: boolean | readonly HooksCustomizationSurface[];
  /** 层级4: 工作区信任（false=跳过 user/project hooks） */
  readonly workspaceTrust?: boolean;
}
