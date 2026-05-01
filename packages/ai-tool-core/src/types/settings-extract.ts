/** Settings 规则提取与校验（Settings Extract & Validate） 字符串→PermissionRule+Zod校验+无效过滤 */

import type { z } from 'zod';
import type { MergedSettings } from './settings-schema';
import type { PermissionRule, PermissionRuleSource } from './permission-rule';
import type { SettingLayer } from './settings-layer';
import { PermissionRuleStringSchema } from './settings-schema';
import { settingLayerToRuleSource } from './settings-layer';

/**
 * 从合并配置中提取权限规则列表
 *
 * 参考 Claude Code 的权限规则提取逻辑: settings.json 中权限规则是字符串数组格式:
 *
 * - permissions.allow: ["Bash(git push:*)", "Read"]
 * - permissions.deny: ["Bash(rm -rf *)"]
 * - permissions.ask: ["Write"]
 *
 * 此函数将字符串数组转换为结构化 PermissionRule 对象， 并自动标记 source（由最高优先级 SettingLayer 映射决定）。
 *
 * source 映射规则:
 *
 * - 合并后的规则来自多个层，同一规则值可能在多个层中出现
 * - source 取最高优先级层的映射（last-source-wins 语义下，最终生效的是最高层）
 * - 例如: user 层 allow "Read" + project 层 allow "Read" → source='project'（优先级更高）
 *
 * 简化实现: 使用传入的 sourceLayers 列表中的最高优先级层作为统一 source， 因为合并后已无法区分每条规则的原始层。 宿主如需精确来源追踪，可在合并前逐层提取并保留元数据。
 *
 * @param merged 合并后的配置
 * @param sourceLayers 参与合并的层列表（用于确定规则来源）
 * @returns 权限规则列表
 */
export function extractPermissionRulesFromMergedSettings(
  merged: MergedSettings,
  sourceLayers: readonly SettingLayer[]
): PermissionRule[] {
  const rules: PermissionRule[] = [];

  // 找到最高优先级层的 PermissionRuleSource（排除 plugin，plugin 不产生规则）
  const highestSource = findHighestRuleSource(sourceLayers);

  const permissions = merged.permissions;
  if (!permissions) return rules;

  // allow 规则
  const allowRules = permissions.allow ?? [];
  for (const ruleValue of allowRules) {
    rules.push({
      behavior: 'allow',
      ruleValue,
      source: highestSource ?? 'project' // fallback: 无有效层时用 project
    });
  }

  // deny 规则
  const denyRules = permissions.deny ?? [];
  for (const ruleValue of denyRules) {
    rules.push({
      behavior: 'deny',
      ruleValue,
      source: highestSource ?? 'project',
      reason: `settings.json 拒绝规则: ${ruleValue}`
    });
  }

  // ask 规则
  const askRules = permissions.ask ?? [];
  for (const ruleValue of askRules) {
    rules.push({
      behavior: 'ask',
      ruleValue,
      source: highestSource ?? 'project'
    });
  }

  return rules;
}

/**
 * 从层列表中找到最高优先级的有效 PermissionRuleSource
 *
 * 排除 plugin 层（不产生规则），按 SETTING_LAYER_PRIORITY 从高到低 找到第一个有映射的层。
 */
function findHighestRuleSource(
  sourceLayers: readonly SettingLayer[]
): PermissionRuleSource | undefined {
  // 按优先级从高到低排序
  const sorted = [...sourceLayers]
    .filter(layer => layer !== 'plugin') // plugin 不产生规则
    .sort((a, b) => {
      const priority: Record<string, number> = {
        plugin: 0,
        user: 1,
        project: 2,
        local: 3,
        flag: 4,
        policy: 5
      };
      return priority[b] - priority[a]; // 高→低
    });

  for (const layer of sorted) {
    const source = settingLayerToRuleSource(layer);
    if (source !== undefined) return source;
  }

  return undefined;
}

/**
 * Zod 校验 + 无效规则过滤
 *
 * 参考 Claude Code 的 filterInvalidPermissionRules: fail-soft 策略 — 单条规则校验失败不影响其他规则。
 * 无效规则被过滤并报告，有效规则照常使用。
 *
 * 设计意图:
 *
 * - 防止一条无效规则导致整个配置失效
 * - 保留无效规则信息供宿主报告错误
 * - 用户可在 UI 中看到哪些规则格式错误
 *
 * @param rawRules 原始规则字符串列表
 * @param schema Zod schema（默认使用 PermissionRuleStringSchema）
 * @returns 有效规则列表 + 无效规则详情
 */
export function filterInvalidPermissionRules(
  rawRules: readonly string[],
  schema: z.ZodType = PermissionRuleStringSchema
): { valid: string[]; invalid: Array<{ rule: string; error: string }> } {
  const valid: string[] = [];
  const invalid: Array<{ rule: string; error: string }> = [];

  for (const rule of rawRules) {
    const result = schema.safeParse(rule);
    if (result.success) {
      valid.push(rule);
    } else {
      invalid.push({
        rule,
        error: formatSettingsZodError(result.error)
      });
    }
  }

  return { valid, invalid };
}

/**
 * 格式化 Zod 校验错误 — 面向开发者的诊断信息
 *
 * 参考 Claude Code 的 formatZodError(): 将 Zod 的结构化错误转为人类可读的字符串。
 *
 * @param error Zod 校验错误
 * @returns 格式化后的错误字符串
 */
export function formatSettingsZodError(error: z.ZodError): string {
  return error.issues
    .map(issue => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
