/** Settings 合并引擎（Settings Merge） 逐层合并+customizer+policy first-source-wins */

import type { SettingSource } from './settings-source';
import type { MergedSettings } from './settings-schema';
import { SETTING_LAYER_PRIORITY, getMergeStrategy } from './settings-layer';
import { SettingsSchema } from './settings-schema';

/**
 * 合并 customizer — 决定不同类型字段的合并策略
 *
 * 参考 Claude Code 的 settingsMergeCustomizer:
 *
 * - 数组字段: concat（拼接而非覆盖） — permissions.allow/deny/ask 是累积的
 * - 其他对象字段: 让 mergeWith 默认处理（递归合并）
 * - 基本类型字段: srcValue 覆盖 objValue（last-source-wins）
 *
 * @param objValue 目标对象中的值
 * @param srcValue 源对象中的值
 * @param key 字段名
 * @returns 合并后的值，undefined 表示让 mergeWith 默认处理
 */
export function settingsMergeCustomizer(
  objValue: unknown,
  srcValue: unknown,
  key: string
): unknown {
  // 数组字段 → concat（拼接去重）
  if (Array.isArray(objValue) && Array.isArray(srcValue)) {
    return [...new Set([...objValue, ...srcValue])];
  }

  // 其他类型 → 让 mergeWith 默认处理
  // undefined 返回值 = mergeWith 递归合并（对象）或覆盖（基本类型）
  return undefined;
}

/**
 * Policy 层 first-source-wins 合并
 *
 * 参考 Claude Code 的 policySettings 处理: policy 层中已定义的字段不被后续覆盖。 即: base 中已有值的字段保持不变，policy 只填充 base
 * 中缺失的字段。
 *
 * 这与 last-source-wins 相反: policy 不能覆盖用户/项目级配置中已有的字段， 只能补充它们没有的字段（如企业管控的 deny 规则）。
 *
 * @param base 当前合并结果
 * @param policySource Policy 层的配置源
 * @returns 合并后的配置
 */
export function applyPolicyFirstSourceWins(
  base: MergedSettings,
  policySource: SettingSource
): MergedSettings {
  const policyContent = policySource.content as Record<string, unknown>;

  // first-source-wins: 只填充 base 中没有的字段
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(policyContent)) {
    if (key in result) {
      // first-source-wins: base 中有实质内容 → 不覆盖
      // 空数组 [] 视为无实质内容 → policy 可覆盖
      if (isEmptyValue(result[key])) {
        result[key] = value;
        continue;
      }
      // 需要递归处理嵌套对象
      if (
        typeof result[key] === 'object' &&
        result[key] !== null &&
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(result[key]) &&
        !Array.isArray(value)
      ) {
        // 嵌套对象: 递归 first-source-wins
        result[key] = applyFirstSourceWinsRecursive(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>
        );
      }
      // 非空数组和基本类型: 已存在实质内容则不覆盖
    } else {
      // base 中没有此字段 → policy 填充
      result[key] = value;
    }
  }

  return result as MergedSettings;
}

/**
 * 判断值是否为空（无实质内容）
 *
 * 空数组、空对象、undefined、null 都视为无实质内容， policy 层可以覆盖这些"空值"。
 *
 * 参考 Claude Code: policy 层 first-source-wins 的语义是 "有实质内容的字段不被覆盖"，空数组不算有实质内容。
 */
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value as Record<string, unknown>).length === 0)
    return true;
  return false;
}

/**
 * 递归 first-source-wins 合并嵌套对象
 *
 * base 中已有的子字段保持不变，policy 只补充缺失的子字段。
 */
function applyFirstSourceWinsRecursive(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (key in result) {
      // 空值 → policy 可覆盖
      if (isEmptyValue(result[key])) {
        result[key] = value;
        continue;
      }
      if (
        typeof result[key] === 'object' &&
        result[key] !== null &&
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(result[key]) &&
        !Array.isArray(value)
      ) {
        result[key] = applyFirstSourceWinsRecursive(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>
        );
      }
      // 其他类型: 有实质内容则不覆盖
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 深合并两个配置对象
 *
 * 使用自定义 customizer:
 *
 * - 数组 → concat 去重
 * - 对象 → 递归合并
 * - 基本类型 → overlay 覆盖 base
 *
 * @param base 基础配置
 * @param overlay 覆盖配置
 * @returns 合并后的配置
 */
export function deepMergeSettings(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, overlayValue] of Object.entries(overlay)) {
    const baseValue = result[key];

    // 两个都是数组 → concat 去重
    if (Array.isArray(baseValue) && Array.isArray(overlayValue)) {
      result[key] = [...new Set([...baseValue, ...overlayValue])];
      continue;
    }

    // 两个都是非数组对象 → 递归合并
    if (
      typeof baseValue === 'object' &&
      baseValue !== null &&
      typeof overlayValue === 'object' &&
      overlayValue !== null &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overlayValue)
    ) {
      result[key] = deepMergeSettings(
        baseValue as Record<string, unknown>,
        overlayValue as Record<string, unknown>
      );
      continue;
    }

    // overlay 值为 undefined → 删除 base 中对应键
    if (overlayValue === undefined) {
      delete result[key];
      continue;
    }

    // 其他情况 → overlay 覆盖 base
    result[key] = overlayValue;
  }

  return result;
}

/**
 * 逐层合并 Settings 配置
 *
 * 参考 Claude Code 的 loadSettingsFromDisk(): 按 SETTING_LAYERS 优先级顺序，从低到高逐层合并:
 *
 * - 层 0-4 (plugin/user/project/local/flag): last-source-wins
 * - 层 5 (policy): first-source-wins
 *
 * 合并策略:
 *
 * 1. 按 SETTING_LAYERS 数组顺序排序输入源
 * 2. 层 0-4: 使用 deepMergeSettings 逐层叠加
 * 3. 层 5: 使用 applyPolicyFirstSourceWins（policy 补充缺失字段，不覆盖已有字段）
 * 4. 最终结果经过 SettingsSchema 校验（宽松校验，passthrough 允许未知字段）
 *
 * @param sources 配置源列表（每个源包含 metadata.layer 和 content）
 * @returns 合并后的配置，经过 Zod schema 校验
 */
export function mergeSettingsLayers(sources: readonly SettingSource[]): MergedSettings {
  if (sources.length === 0) {
    return {} as MergedSettings;
  }

  // 按 SETTING_LAYER_PRIORITY 排序（从低到高）
  const sorted = [...sources].sort(
    (a, b) => SETTING_LAYER_PRIORITY[a.metadata.layer] - SETTING_LAYER_PRIORITY[b.metadata.layer]
  );

  // 逐层合并
  let accumulated: Record<string, unknown> = {};

  for (const source of sorted) {
    const layer = source.metadata.layer;
    const content = source.content as Record<string, unknown>;
    const strategy = getMergeStrategy(layer);

    if (strategy === 'first-source-wins') {
      // Policy 层: first-source-wins
      accumulated = applyPolicyFirstSourceWins(accumulated as MergedSettings, source) as Record<
        string,
        unknown
      >;
    } else {
      // 层 0-4: last-source-wins (深合并)
      accumulated = deepMergeSettings(accumulated, content);
    }
  }

  // Zod schema 校验（宽松，passthrough 允许未知字段）
  const parsed = SettingsSchema.safeParse(accumulated);
  if (parsed.success) {
    return parsed.data;
  }

  // 校验失败 → 仍返回合并结果（宽松策略，不因校验错误阻止配置使用）
  // 校验错误可通过 formatSettingsZodError 查看
  return accumulated as MergedSettings;
}
