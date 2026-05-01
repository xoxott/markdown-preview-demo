/** 权限剥离与恢复（Permission Strip & Restore） auto模式危险规则剥离+恢复机制 */

import type { PermissionAllowRule, PermissionRuleValue } from './permission-rule';
import type { ToolPermissionContext } from './permission-context';
import type { PermissionMode } from './permission-mode';

/**
 * 危险 Bash 模式 — auto 模式下必须经过分类器评估，不能被预授权规则绕过
 *
 * 参考 Claude Code 的 stripDangerousPermissions: 进入 auto 模式时，从 allowRules 中剥离匹配这些模式的规则， 暂存到
 * strippedDangerousRules，离开 auto 模式时恢复。
 *
 * 这些模式代表可执行任意代码的 Bash 命令，在 auto 模式下 即使有用户预授权的 allow 规则，也必须经过分类器评估。
 */
export const DANGEROUS_BASH_PATTERNS: readonly PermissionRuleValue[] = [
  'bash(python *)',
  'bash(node *)',
  'bash(bash *)',
  'bash(sh *)',
  'bash(eval *)',
  'bash(exec *)',
  'bash(sudo *)',
  'bash(*)'
];

/**
 * 判断规则值是否为危险 Bash 权限
 *
 * 匹配 DANGEROUS_BASH_PATTERNS 中的任一模式。 危险 Bash 规则在 auto 模式下会被剥离，防止预授权绕过分类器。
 *
 * @param ruleValue 规则值
 * @returns 是否为危险 Bash 权限
 */
export function isDangerousBashPermission(ruleValue: PermissionRuleValue): boolean {
  return DANGEROUS_BASH_PATTERNS.includes(ruleValue);
}

/**
 * auto 模式权限剥离 — 从 allowRules 中移除危险规则，暂存到 strippedDangerousRules
 *
 * 参考 Claude Code 的 stripDangerousPermissions: 进入 auto 模式时调用，将匹配 DANGEROUS_BASH_PATTERNS 的 allow 规则
 * 从 allowRules 移除并暂存到 strippedDangerousRules。
 *
 * 设计意图:
 *
 * - auto 模式下，危险 Bash 命令必须经过分类器评估
 * - 用户预授权的 allow 规则不能绕过分类器
 * - 剥离的规则暂存，离开 auto 模式时恢复，避免丢失用户授权
 *
 * @param ctx 当前权限上下文
 * @returns 剥离危险规则后的新上下文
 */
export function stripDangerousPermissionsForAutoMode(
  ctx: ToolPermissionContext
): ToolPermissionContext {
  const stripped: PermissionAllowRule[] = [];
  const remaining: PermissionAllowRule[] = [];

  for (const rule of ctx.allowRules) {
    if (isDangerousBashPermission(rule.ruleValue)) {
      stripped.push(rule);
    } else {
      remaining.push(rule);
    }
  }

  // 如果没有剥离任何规则，返回原上下文（避免不必要的对象创建）
  if (stripped.length === 0) {
    return ctx;
  }

  return {
    ...ctx,
    allowRules: remaining,
    strippedDangerousRules: [...(ctx.strippedDangerousRules ?? []), ...stripped]
  };
}

/**
 * auto 模式权限恢复 — 从 strippedDangerousRules 中恢复到 allowRules
 *
 * 参考 Claude Code 的 restoreDangerousPermissions: 离开 auto 模式时调用，将暂存的危险规则恢复到 allowRules， 恢复用户的预授权授权。
 *
 * @param ctx 当前权限上下文
 * @returns 恢复危险规则后的新上下文
 */
export function restoreDangerousPermissions(ctx: ToolPermissionContext): ToolPermissionContext {
  // 无暂存规则 → 无需恢复
  if (!ctx.strippedDangerousRules || ctx.strippedDangerousRules.length === 0) {
    return ctx;
  }

  return {
    ...ctx,
    allowRules: [...ctx.allowRules, ...ctx.strippedDangerousRules],
    strippedDangerousRules: []
  };
}

/**
 * 判断权限模式切换是否需要剥离操作
 *
 * 从非 auto 模式切换到 auto 模式时需要剥离。
 *
 * @param oldMode 旧模式
 * @param newMode 新模式
 * @returns 是否需要剥离
 */
export function shouldStripOnTransition(oldMode: PermissionMode, newMode: PermissionMode): boolean {
  return oldMode !== 'auto' && newMode === 'auto';
}

/**
 * 判断权限模式切换是否需要恢复操作
 *
 * 从 auto 模式切换到非 auto 模式时需要恢复。
 *
 * @param oldMode 旧模式
 * @param newMode 新模式
 * @returns 是否需要恢复
 */
export function shouldRestoreOnTransition(
  oldMode: PermissionMode,
  newMode: PermissionMode
): boolean {
  return oldMode === 'auto' && newMode !== 'auto';
}

/**
 * 权限模式切换 — 进入/离开 auto 模式时自动 strip/restore
 *
 * 参考 Claude Code 的模式切换逻辑:
 *
 * - 进入 auto → stripDangerousPermissionsForAutoMode + setMode
 * - 离开 auto → restoreDangerousPermissions + setMode
 * - 其他切换 → 仅 setMode
 *
 * @param ctx 当前权限上下文
 * @param newMode 目标模式
 * @returns 切换后的新上下文
 */
export function transitionPermissionMode(
  ctx: ToolPermissionContext,
  newMode: PermissionMode
): ToolPermissionContext {
  const oldMode = ctx.mode;

  // 进入 auto → 先剥离危险规则，再切换模式
  if (shouldStripOnTransition(oldMode, newMode)) {
    const stripped = stripDangerousPermissionsForAutoMode(ctx);
    return { ...stripped, mode: newMode };
  }

  // 离开 auto → 先恢复危险规则，再切换模式
  if (shouldRestoreOnTransition(oldMode, newMode)) {
    const restored = restoreDangerousPermissions(ctx);
    return { ...restored, mode: newMode };
  }

  // 其他切换 → 仅切换模式
  return { ...ctx, mode: newMode };
}
