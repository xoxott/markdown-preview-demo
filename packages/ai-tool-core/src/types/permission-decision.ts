/** 权限决策原因、拒绝追踪与用户确认接口（Permission Decision Types） */

import type { ToolPermissionContext } from './permission-context';
import type { HookPermissionDecision, PermissionResult } from './permission';
import type { ToolUseContext } from './context';
import type { AnyBuiltTool } from './registry';
import type {
  PermissionAllowRule,
  PermissionAskRule,
  PermissionDenyRule,
  PermissionRule,
  PermissionRuleSource
} from './permission-rule';

/**
 * G15: 结构化决策原因 — discriminated union 包装器
 *
 * Claude Code 使用 { type, classifier, reason } 结构而非扁平字符串， 便于审计日志、调试和后续扩展。@suga 原有的
 * PermissionDecisionReason 是扁平字符串枚举，G15 将其包装为 discriminated union。
 *
 * type: 决策的大类（rule/mode/hook/classifier/safety/headless/swarm） classifier: 产生决策的分类器或规则引擎标识 reason:
 * 具体的决策原因（精确标记）
 */
export type StructuredDecisionReason =
  | {
      readonly type: 'rule';
      readonly classifier?: string;
      readonly reason: string;
    }
  | {
      readonly type: 'mode';
      readonly classifier?: 'mode_engine';
      readonly reason: string;
    }
  | {
      readonly type: 'hook';
      readonly classifier?: string;
      readonly reason: string;
    }
  | {
      readonly type: 'classifier';
      readonly classifier?: string;
      readonly reason: string;
    }
  | {
      readonly type: 'safety';
      readonly classifier?: 'safety_check';
      readonly reason:
        | 'safety_check_block'
        | 'requires_user_interaction_block'
        | 'denial_limit_fallback';
    }
  | {
      readonly type: 'headless';
      readonly classifier?: 'headless_agent';
      readonly reason: 'headless_agent_deny';
    }
  | {
      readonly type: 'swarm';
      readonly classifier?: string;
      readonly reason: string;
    }
  | {
      readonly type: 'tool';
      readonly classifier?: string;
      readonly reason: 'tool_check_permissions';
    };

/**
 * 结构化决策原因 — 25种权限决策的精确标记（扁平字符串枚举，向后兼容）
 *
 * 参考 Claude Code 的 PermissionDecisionReason: 每种原因对应管线中的特定步骤，便于审计日志和调试。 P16B 新增 5 种 classifier
 * 相关原因。P41 新增 4 种安全检查原因。P48 新增 3 种 swarm 原因。
 */
export type PermissionDecisionReason =
  | 'deny_rule_match' // 拒绝规则匹配
  | 'ask_rule_match' // 询问规则匹配
  | 'mode_restricted_non_readonly' // 受限模式拒绝非只读
  | 'mode_plan_disallowed' // 计划模式拒绝不允许的工具
  | 'mode_accept_edits_disallowed' // 接受编辑模式拒绝不允许的工具
  | 'mode_auto_approve_readonly' // 自动模式批准只读
  | 'mode_bypass' // 绕过模式
  | 'mode_dont_ask_converted_deny' // P41: dontAsk 模式将 ask 转为 deny
  | 'mode_dont_ask' // P41: dontAsk 模式标识
  | 'tool_check_permissions' // 工具自定义 checkPermissions
  | 'hook_deny' // PreToolUse hook deny
  | 'hook_allow' // PreToolUse hook allow
  | 'hook_ask' // PreToolUse hook ask
  | 'classifier_allow' // P16B: 分类器自动允许
  | 'classifier_deny' // P16B: 分类器拒绝
  | 'classifier_ask' // P16B: 分类器建议用户确认
  | 'classifier_unavailable_deny' // P16B: 分类器不可用 + Iron Gate fail-closed
  | 'classifier_unavailable_fallback' // P16B: 分类器不可用 + Iron Gate fail-open
  | 'safety_check_block' // P41: bypass-immune 安全检查阻止
  | 'requires_user_interaction_block' // P41: requiresUserInteraction bypass-immune
  | 'denial_limit_fallback' // P41: denial limits 强制回退到 prompting
  | 'headless_agent_deny' // P41: headless agent 自动 deny
  | 'swarm_worker_timeout_deny' // P48: swarm worker 权限超时 deny
  | 'swarm_worker_leader_approved' // P48: swarm worker Leader 批准
  | 'swarm_worker_leader_denied'; // P48: swarm worker Leader 拒绝

/**
 * 拒绝追踪状态 — 记录连续和总拒绝计数
 *
 * 参考 Claude Code 的 DenialTrackingState:
 *
 * - 连续拒绝达到 MAX_CONSECUTIVE_DENIALS → shouldFallbackToPrompting
 * - 总拒绝达到 MAX_TOTAL_DENIALS → shouldFallbackToPrompting
 *
 * 用于在用户反复拒绝时自动切换到更安全的交互模式。
 */
export interface DenialTrackingState {
  /** 连续拒绝计数（每次 allow 清零） */
  consecutiveDenials: number;
  /** 总拒绝计数（不清零） */
  totalDenials: number;
  /** 是否应该回退到提示模式 */
  shouldFallbackToPrompting: boolean;
}

/** 最大连续拒绝次数 — 达到此值触发回退 */
export const MAX_CONSECUTIVE_DENIALS = 3;

/** 最大总拒绝次数 — 达到此值触发回退 */
export const MAX_TOTAL_DENIALS = 20;

/** 默认拒绝追踪状态 */
export const DEFAULT_DENIAL_TRACKING: DenialTrackingState = {
  consecutiveDenials: 0,
  totalDenials: 0,
  shouldFallbackToPrompting: false
};

/**
 * 更新拒绝追踪状态 — 根据权限结果行为更新计数
 *
 * - deny → consecutive+1, total+1, 检查是否达到阈值
 * - allow → consecutive 清零
 * - ask/passthrough → 不改变计数
 *
 * @param state 当前追踪状态
 * @param behavior 权限结果的行为
 * @returns 新追踪状态
 */
export function updateDenialTracking(
  state: DenialTrackingState,
  behavior: PermissionResult['behavior']
): DenialTrackingState {
  if (behavior === 'deny') {
    const newConsecutive = state.consecutiveDenials + 1;
    const newTotal = state.totalDenials + 1;
    return {
      consecutiveDenials: newConsecutive,
      totalDenials: newTotal,
      shouldFallbackToPrompting:
        newConsecutive >= MAX_CONSECUTIVE_DENIALS || newTotal >= MAX_TOTAL_DENIALS
    };
  }

  if (behavior === 'allow') {
    return {
      ...state,
      consecutiveDenials: 0
    };
  }

  // ask / passthrough → 不改变计数
  return state;
}

/**
 * 用户确认函数 — 由宿主环境注入的交互式权限确认接口
 *
 * 当管线产生 behavior='ask' 时，调用此函数让用户决定是否允许执行。 宿主环境（如 CLI、IDE）实现此接口提供 UI 交互。
 *
 * @param toolName 工具名称
 * @param input 工具输入参数
 * @param reason 结构化决策原因
 * @param message 询问消息（可选）
 * @returns 用户是否允许执行
 */
export type CanUseToolFn = (
  toolName: string,
  input: unknown,
  reason: PermissionDecisionReason,
  message?: string
) => Promise<boolean>;

/**
 * 增强版用户确认函数 — 返回结构化 PermissionPromptResponse
 *
 * P16F: 扩展版 CanUseToolFn，返回完整的用户决策信息 （approve/deny + 持久化选项 + feedback），而非简单 boolean。
 *
 * 与 CanUseToolFn 向后兼容：宿主可逐步迁移。
 */
export type CanUseToolFnV2 = (
  toolName: string,
  input: unknown,
  reason: PermissionDecisionReason,
  message?: string
) => Promise<import('./permission-prompt').PermissionPromptResponse>;

/** 权限管线输入 — hasPermissionsToUseTool 的完整输入参数 */
export interface PermissionPipelineInput {
  /** 目标工具 */
  readonly tool: AnyBuiltTool;
  /** 工具输入参数 */
  readonly args: unknown;
  /** 工具使用上下文 */
  readonly context: ToolUseContext;
  /** 权限上下文容器 */
  readonly permCtx: ToolPermissionContext;
  /** PreToolUse Hook 决策（可选） */
  readonly hookDecision?: HookPermissionDecision;
  /** 用户确认函数（可选，宿主注入，向后兼容 boolean 版） */
  readonly canUseToolFn?: CanUseToolFn;
  /** P16F: 用户确认接口（可选，宿主注入，返回结构化响应） */
  readonly promptHandler?: import('./permission-prompt').PermissionPromptHandler;
  /** 拒绝追踪状态（可选） */
  readonly denialTracking?: DenialTrackingState;
  /** P41: 工具是否标记 requiresUserInteraction（bypass-immune） */
  readonly requiresUserInteraction?: boolean;
  /** P41: 是否为 headless agent（自动 deny ask） */
  readonly isHeadlessAgent?: boolean;
}

// ============================================================
// G15: 结构化决策原因辅助函数
// ============================================================

/**
 * 从扁平 PermissionDecisionReason 创建 StructuredDecisionReason
 *
 * 根据 reason 字符串自动推断 type 大类，包装为 discriminated union。
 */
export function toStructuredReason(
  reason: PermissionDecisionReason,
  classifier?: string
): StructuredDecisionReason {
  if (reason.startsWith('deny_rule_match') || reason.startsWith('ask_rule_match')) {
    return { type: 'rule', classifier, reason };
  }
  if (reason.startsWith('mode_')) {
    return { type: 'mode', classifier: 'mode_engine', reason };
  }
  if (reason.startsWith('hook_')) {
    return { type: 'hook', classifier, reason };
  }
  if (reason.startsWith('classifier_')) {
    return { type: 'classifier', classifier, reason };
  }
  if (
    reason === 'safety_check_block' ||
    reason === 'requires_user_interaction_block' ||
    reason === 'denial_limit_fallback'
  ) {
    return { type: 'safety', classifier: 'safety_check', reason };
  }
  if (reason === 'headless_agent_deny') {
    return { type: 'headless', classifier: 'headless_agent', reason };
  }
  if (reason.startsWith('swarm_worker_')) {
    return { type: 'swarm', classifier, reason };
  }
  if (reason === 'tool_check_permissions') {
    return { type: 'tool', classifier, reason };
  }
  // fallback — 不应到达，但安全兜底
  return { type: 'rule', classifier, reason };
}

/**
 * G16: 权限规则按源分组 — 检测 shadowed 规则
 *
 * 参考 Claude Code 的 ToolPermissionRulesBySource:
 *
 * 当多个来源（user/project/policy）对同一工具定义了不同行为的规则时， 高优先级来源的规则会 shadow（遮盖）低优先级来源的规则。 这个分组结构让宿主可以检测并提示冲突规则。
 *
 * 优先级: policy > project > local > user > session > flag > cliArg > command
 */
export interface ToolPermissionRulesBySource {
  /** 按来源分组的 allow 规则 */
  readonly allow: Record<PermissionRuleSource, readonly PermissionAllowRule[]>;
  /** 按来源分组的 deny 规则 */
  readonly deny: Record<PermissionRuleSource, readonly PermissionDenyRule[]>;
  /** 按来源分组的 ask 规则 */
  readonly ask: Record<PermissionRuleSource, readonly PermissionAskRule[]>;
}

/** G16: Shadowed 规则信息 — 被高优先级来源遮盖的规则 */
export interface ShadowedRuleInfo {
  /** 被遮盖的规则 */
  readonly shadowedRule: PermissionRule;
  /** 遮盖它的规则（高优先级来源） */
  readonly shadowingRule: PermissionRule;
  /** 遮盖来源 */
  readonly shadowingSource: PermissionRuleSource;
  /** 被遮盖来源 */
  readonly shadowedSource: PermissionRuleSource;
}

/** 规则来源优先级排序（高优先级在前） */
const SOURCE_PRIORITY: readonly PermissionRuleSource[] = [
  'policy',
  'project',
  'local',
  'user',
  'session',
  'flag',
  'cliArg',
  'command'
];

/**
 * G16: 将规则列表按来源分组
 *
 * @param rules 规则列表
 * @returns 按来源分组的规则结构
 */
export function groupRulesBySource(rules: readonly PermissionRule[]): ToolPermissionRulesBySource {
  const emptyAllow: Record<PermissionRuleSource, readonly PermissionAllowRule[]> = {
    user: [],
    project: [],
    local: [],
    policy: [],
    flag: [],
    cliArg: [],
    command: [],
    session: []
  };
  const emptyDeny: Record<PermissionRuleSource, readonly PermissionDenyRule[]> = {
    user: [],
    project: [],
    local: [],
    policy: [],
    flag: [],
    cliArg: [],
    command: [],
    session: []
  };
  const emptyAsk: Record<PermissionRuleSource, readonly PermissionAskRule[]> = {
    user: [],
    project: [],
    local: [],
    policy: [],
    flag: [],
    cliArg: [],
    command: [],
    session: []
  };

  const allow: Record<PermissionRuleSource, PermissionAllowRule[]> = { ...emptyAllow } as any;
  const deny: Record<PermissionRuleSource, PermissionDenyRule[]> = { ...emptyDeny } as any;
  const ask: Record<PermissionRuleSource, PermissionAskRule[]> = { ...emptyAsk } as any;

  for (const rule of rules) {
    switch (rule.behavior) {
      case 'allow':
        allow[rule.source] = [...(allow[rule.source] ?? []), rule];
        break;
      case 'deny':
        deny[rule.source] = [...(deny[rule.source] ?? []), rule];
        break;
      case 'ask':
        ask[rule.source] = [...(ask[rule.source] ?? []), rule];
        break;
      default:
        break;
    }
  }

  return { allow, deny, ask };
}

/**
 * G16: 检测 shadowed 规则
 *
 * 找出被高优先级来源遮盖的规则。 规则被遮盖的条件：同一 ruleValue 被不同来源的不同 behavior 规则覆盖。
 *
 * @param rulesBySource 按来源分组的规则
 * @returns shadowed 规则列表
 */
export function detectShadowedRules(
  rulesBySource: ToolPermissionRulesBySource
): ShadowedRuleInfo[] {
  const allRules = [
    ...Object.values(rulesBySource.allow).flat(),
    ...Object.values(rulesBySource.deny).flat(),
    ...Object.values(rulesBySource.ask).flat()
  ];

  const shadowed: ShadowedRuleInfo[] = [];

  // 按 ruleValue 分组
  const rulesByValue: Map<string, PermissionRule[]> = new Map();
  for (const rule of allRules) {
    const existing = rulesByValue.get(rule.ruleValue) ?? [];
    existing.push(rule);
    rulesByValue.set(rule.ruleValue, existing);
  }

  // 对每个 ruleValue，检查是否有不同来源的不同行为
  for (const [, rules] of rulesByValue) {
    if (rules.length <= 1) continue;

    // 按来源优先级排序
    const sorted = [...rules].sort((a, b) => {
      const aPriority = SOURCE_PRIORITY.indexOf(a.source);
      const bPriority = SOURCE_PRIORITY.indexOf(b.source);
      return aPriority - bPriority; // 高优先级在前
    });

    // 第一个（最高优先级）遮盖后面的低优先级同值规则
    for (let i = 1; i < sorted.length; i++) {
      // 只有行为不同才算 shadowed
      if (sorted[0].behavior !== sorted[i].behavior) {
        shadowed.push({
          shadowedRule: sorted[i],
          shadowingRule: sorted[0],
          shadowingSource: sorted[0].source,
          shadowedSource: sorted[i].source
        });
      }
    }
  }

  return shadowed;
}
