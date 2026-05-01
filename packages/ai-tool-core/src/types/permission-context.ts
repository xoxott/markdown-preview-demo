/** 权限上下文容器与更新操作（Permission Context & Update） 运行时权限状态模型 */

import type { PermissionMode } from './permission-mode';
import type {
  PermissionAllowRule,
  PermissionAskRule,
  PermissionDenyRule,
  PermissionRule,
  PermissionRuleValue
} from './permission-rule';
import type { IronGate, PermissionClassifier } from './permission-classifier';
import type { MergedSettings } from './settings-schema';
import type { SettingLayer } from './settings-layer';
import { extractPermissionRulesFromMergedSettings } from './settings-extract';

/**
 * 权限上下文容器 — 权限决策的完整运行时状态
 *
 * 参考 Claude Code 的 ToolPermissionContext:
 *
 * - mode: 当前权限模式
 * - allow/deny/ask rules: 三类规则列表
 * - workingDirectories: 工作目录白名单
 * - bypassPermissions: 绕过开关
 * - classifierFn: P16B AI 分类器（宿主注入）
 * - ironGate: P16B Iron Gate 门控（分类器不可用时的安全策略）
 * - strippedDangerousRules: P16B auto 模式下剥离的危险规则暂存
 *
 * 容器是不可变的 — 通过 applyPermissionUpdate 产生新容器。
 */
export interface ToolPermissionContext {
  /** 当前权限模式 */
  readonly mode: PermissionMode;
  /** 允许规则列表 */
  readonly allowRules: readonly PermissionAllowRule[];
  /** 拒绝规则列表 */
  readonly denyRules: readonly PermissionDenyRule[];
  /** 询问规则列表 */
  readonly askRules: readonly PermissionAskRule[];
  /** 工作目录白名单 */
  readonly workingDirectories: readonly string[];
  /** 是否绕过所有权限检查 */
  readonly bypassPermissions: boolean;
  /** P16B: AI 分类器（可选，宿主注入） */
  readonly classifierFn?: PermissionClassifier;
  /** P16B: Iron Gate 门控（可选，分类器不可用时的安全策略） */
  readonly ironGate?: IronGate;
  /** P16B: auto 模式下剥离的危险规则暂存区（restore 时恢复） */
  readonly strippedDangerousRules?: readonly PermissionAllowRule[];
  /** P16C: 合并后的 settings 配置（可选，宿主注入） */
  readonly settings?: MergedSettings;
}

/** 默认权限上下文 */
export const DEFAULT_TOOL_PERMISSION_CONTEXT: ToolPermissionContext = {
  mode: 'default',
  allowRules: [],
  denyRules: [],
  askRules: [],
  workingDirectories: [],
  bypassPermissions: false
};

/**
 * 权限更新操作 — 6种操作类型
 *
 * 参考 Claude Code 的 PermissionUpdate:
 *
 * - addRules: 添加规则到对应列表（根据 behavior 字段自动分类）
 * - removeRules: 按规则值移除规则
 * - replaceRules: 替换所有同类规则（根据 behavior 字段自动分类）
 * - setMode: 设置权限模式
 * - addDirs: 添加工作目录
 * - removeDirs: 移除工作目录
 */
export type PermissionUpdate =
  | { readonly type: 'addRules'; readonly rules: readonly PermissionRule[] }
  | { readonly type: 'removeRules'; readonly ruleValues: readonly PermissionRuleValue[] }
  | { readonly type: 'replaceRules'; readonly rules: readonly PermissionRule[] }
  | { readonly type: 'setMode'; readonly mode: PermissionMode }
  | { readonly type: 'addDirs'; readonly directories: readonly string[] }
  | { readonly type: 'removeDirs'; readonly directories: readonly string[] }
  | {
      readonly type: 'reloadFromSettings';
      readonly merged: MergedSettings;
      readonly sourceLayers: readonly SettingLayer[];
    };

/** 按 behavior 字段分类规则到三个列表 */
function classifyRules(rules: readonly PermissionRule[]): {
  allowRules: PermissionAllowRule[];
  denyRules: PermissionDenyRule[];
  askRules: PermissionAskRule[];
} {
  const allowRules: PermissionAllowRule[] = [];
  const denyRules: PermissionDenyRule[] = [];
  const askRules: PermissionAskRule[] = [];

  for (const rule of rules) {
    switch (rule.behavior) {
      case 'allow':
        allowRules.push(rule);
        break;
      case 'deny':
        denyRules.push(rule);
        break;
      case 'ask':
        askRules.push(rule);
        break;
      default:
        // 未知 behavior 类型，安全忽略
        break;
    }
  }

  return { allowRules, denyRules, askRules };
}

/**
 * 应用权限更新 — 在上下文上应用更新操作，返回新上下文（不可变模式）
 *
 * @param ctx 当前权限上下文
 * @param update 更新操作
 * @returns 新权限上下文
 */
export function applyPermissionUpdate(
  ctx: ToolPermissionContext,
  update: PermissionUpdate
): ToolPermissionContext {
  switch (update.type) {
    case 'addRules': {
      const classified = classifyRules(update.rules);
      return {
        ...ctx,
        allowRules: [...ctx.allowRules, ...classified.allowRules],
        denyRules: [...ctx.denyRules, ...classified.denyRules],
        askRules: [...ctx.askRules, ...classified.askRules]
      };
    }

    case 'removeRules': {
      const removeSet = new Set(update.ruleValues);
      return {
        ...ctx,
        allowRules: ctx.allowRules.filter(r => !removeSet.has(r.ruleValue)),
        denyRules: ctx.denyRules.filter(r => !removeSet.has(r.ruleValue)),
        askRules: ctx.askRules.filter(r => !removeSet.has(r.ruleValue))
      };
    }

    case 'replaceRules': {
      const classified = classifyRules(update.rules);
      return {
        ...ctx,
        allowRules: classified.allowRules,
        denyRules: classified.denyRules,
        askRules: classified.askRules
      };
    }

    case 'setMode':
      return { ...ctx, mode: update.mode };

    case 'addDirs':
      return { ...ctx, workingDirectories: [...ctx.workingDirectories, ...update.directories] };

    case 'removeDirs': {
      const removeDirSet = new Set(update.directories);
      return {
        ...ctx,
        workingDirectories: ctx.workingDirectories.filter(d => !removeDirSet.has(d))
      };
    }

    case 'reloadFromSettings': {
      const rules = extractPermissionRulesFromMergedSettings(update.merged, update.sourceLayers);
      const classified = classifyRules(rules);
      return {
        ...ctx,
        allowRules: classified.allowRules,
        denyRules: classified.denyRules,
        askRules: classified.askRules,
        settings: update.merged
      };
    }

    default:
      return ctx;
  }
}
