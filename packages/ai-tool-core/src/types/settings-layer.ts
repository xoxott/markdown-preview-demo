/** Settings 合并层定义（Setting Layer） 6种优先级层+合并策略+规则来源映射 */

import type { PermissionRuleSource } from './permission-rule';

/**
 * Settings 合并层 — 6种配置文件合并优先级
 *
 * 参考 Claude Code 的 SETTING_SOURCES: 配置文件按优先级从低到高逐层合并，后者覆盖前者（last-source-wins）， 但 policy 层使用
 * first-source-wins（首个出现的字段不被覆盖）。
 *
 * | 层      | 来源                                 | 说明                                       |
 * | ------- | ------------------------------------ | ------------------------------------------ |
 * | plugin  | 插件基础配置                         | 不产生权限规则，仅提供 tool/inputSchema 等 |
 * | user    | ~/.claude/settings.json              | 全局用户设置                               |
 * | project | $PROJECT/.claude/settings.json       | 项目共享设置                               |
 * | local   | $PROJECT/.claude/settings.local.json | 项目本地设置（gitignored）                 |
 * | flag    | CLI --settings 路径                  | 只读，不可编辑                             |
 * | policy  | 企业策略文件                         | 只读，不可编辑，first-source-wins          |
 */
export type SettingLayer = 'plugin' | 'user' | 'project' | 'local' | 'flag' | 'policy';

/**
 * 合并层优先级序列 — 从低到高，后者覆盖前者
 *
 * 数组顺序即合并顺序：先合并低优先级层，再叠加高优先级层。
 */
export const SETTING_LAYERS: readonly SettingLayer[] = [
  'plugin',
  'user',
  'project',
  'local',
  'flag',
  'policy'
];

/**
 * 合并层优先级数值 — 用于比较和排序
 *
 * 数值越高优先级越高，在合并时后叠加。
 */
export const SETTING_LAYER_PRIORITY: Record<SettingLayer, number> = {
  plugin: 0,
  user: 1,
  project: 2,
  local: 3,
  flag: 4,
  policy: 5
};

/**
 * 合并策略 — 决定配置合并时字段冲突的解决方式
 *
 * - last-source-wins: 高优先级层的字段覆盖低优先级层（层 0-4）
 * - first-source-wins: 首个出现的字段不被后续覆盖（层 5 policy）
 */
export type SettingMergeStrategy = 'last-source-wins' | 'first-source-wins';

/**
 * 获取合并层的合并策略
 *
 * policy 层使用 first-source-wins（企业策略不可被用户配置覆盖）， 其他层使用 last-source-wins（高优先级覆盖低优先级）。
 *
 * @param layer 合并层
 * @returns 合并策略
 */
export function getMergeStrategy(layer: SettingLayer): SettingMergeStrategy {
  return layer === 'policy' ? 'first-source-wins' : 'last-source-wins';
}

/**
 * SettingLayer → PermissionRuleSource 映射
 *
 * 建立 Settings 合并层与权限规则来源标记的映射关系。
 *
 * | SettingLayer | PermissionRuleSource | 说明                                |
 * | ------------ | -------------------- | ----------------------------------- |
 * | plugin       | undefined            | plugin 不产生权限规则               |
 * | user         | 'user'               | 用户级 settings 中的规则标记为 user |
 * | project      | 'project'            | 项目级规则标记为 project            |
 * | local        | 'local'              | 本地级规则标记为 local              |
 * | flag         | 'flag'               | CLI flag 规则标记为 flag            |
 * | policy       | 'policy'             | 企业策略规则标记为 policy           |
 *
 * 注意: cliArg/command/session 不属于 settings 合并层， 它们在运行时通过 PermissionUpdate 直接注入
 * ToolPermissionContext。
 *
 * @param layer Settings 合并层
 * @returns 对应的 PermissionRuleSource，plugin 层返回 undefined
 */
export function settingLayerToRuleSource(layer: SettingLayer): PermissionRuleSource | undefined {
  const map: Record<SettingLayer, PermissionRuleSource | undefined> = {
    plugin: undefined,
    user: 'user',
    project: 'project',
    local: 'local',
    flag: 'flag',
    policy: 'policy'
  };
  return map[layer];
}
