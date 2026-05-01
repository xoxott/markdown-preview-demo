/** Settings → ToolPermissionContext 桥接（Settings Bridge） 合并配置→权限上下文+reloadFromSettings */

import type { MergedSettings } from './settings-schema';
import type { SettingLayer } from './settings-layer';
import type { ToolPermissionContext } from './permission-context';
import type { PermissionRule } from './permission-rule';
import { DEFAULT_TOOL_PERMISSION_CONTEXT } from './permission-context';
import { extractPermissionRulesFromMergedSettings } from './settings-extract';

/**
 * 规则分类 — 将 PermissionRule 按行为分到三个列表
 *
 * 复用 permission-context.ts 中的 classifyRules 逻辑， 但此处独立实现避免循环依赖。
 */
function classifyRulesByBehavior(rules: readonly PermissionRule[]): {
  allowRules: Extract<PermissionRule, { behavior: 'allow' }>[];
  denyRules: Extract<PermissionRule, { behavior: 'deny' }>[];
  askRules: Extract<PermissionRule, { behavior: 'ask' }>[];
} {
  const allowRules: Extract<PermissionRule, { behavior: 'allow' }>[] = [];
  const denyRules: Extract<PermissionRule, { behavior: 'deny' }>[] = [];
  const askRules: Extract<PermissionRule, { behavior: 'ask' }>[] = [];

  for (const rule of rules) {
    switch (rule.behavior) {
      case 'allow':
        allowRules.push(rule as Extract<PermissionRule, { behavior: 'allow' }>);
        break;
      case 'deny':
        denyRules.push(rule as Extract<PermissionRule, { behavior: 'deny' }>);
        break;
      case 'ask':
        askRules.push(rule as Extract<PermissionRule, { behavior: 'ask' }>);
        break;
      default:
        // 未知 behavior 类型，安全忽略
        break;
    }
  }

  return { allowRules, denyRules, askRules };
}

/**
 * 从 MergedSettings 构建 ToolPermissionContext
 *
 * 这是 Settings 系统与权限管线的关键衔接点:
 *
 * 1. 从 merged 中提取 PermissionRule 列表
 * 2. 分类为 allowRules/denyRules/askRules
 * 3. 合并到 baseCtx + 附加 settings 字段
 *
 * @param merged 合并后的配置
 * @param sourceLayers 参与合并的层列表（用于确定规则来源）
 * @param baseCtx 基础权限上下文（默认使用 DEFAULT_TOOL_PERMISSION_CONTEXT）
 * @returns 包含 settings 规则的 ToolPermissionContext
 */
export function buildPermissionContextFromSettings(
  merged: MergedSettings,
  sourceLayers: readonly SettingLayer[],
  baseCtx: ToolPermissionContext = DEFAULT_TOOL_PERMISSION_CONTEXT
): ToolPermissionContext {
  // 提取权限规则
  const rules = extractPermissionRulesFromMergedSettings(merged, sourceLayers);
  const { allowRules, denyRules, askRules } = classifyRulesByBehavior(rules);

  return {
    ...baseCtx,
    allowRules: [...baseCtx.allowRules, ...allowRules],
    denyRules: [...baseCtx.denyRules, ...denyRules],
    askRules: [...baseCtx.askRules, ...askRules],
    settings: merged
  };
}
