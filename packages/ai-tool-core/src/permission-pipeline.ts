/** 权限决策管线（Permission Pipeline） 8+步权限决策函数 */

import type { HookPermissionDecision, PermissionResult } from './types/permission';
import type {
  PermissionDecisionReason,
  PermissionPipelineInput
} from './types/permission-decision';
import type { ClassifierResult } from './types/permission-classifier';
import type { PermissionPromptRequest, PermissionPromptResponse } from './types/permission-prompt';
import {
  bridgeCanUseToolFnResponse,
  generatePromptRequestId,
  resolvePermissionPrompt
} from './types/permission-prompt';
import { DEFAULT_DENIAL_TRACKING } from './types/permission-decision';
import {
  classifyPermissionMode,
  isAcceptEditsDeniedTool,
  isAcceptEditsFastPathTool,
  isClassifierSafeTool,
  isPlanModeAllowedTool,
  isSilentDenyMode,
  shouldAvoidPermissionPrompts
} from './types/permission-mode';
import { matchPermissionRuleValue } from './types/permission-rule';
import { isDangerousToolInput } from './types/safety-check';

/**
 * 内部辅助：统一处理 Step 3/5/6 的用户确认逻辑
 *
 * 优先级：
 *
 * 1. promptHandler → 构造 PermissionPromptRequest → 调用 → resolvePermissionPrompt
 * 2. canUseToolFn → 调用 → bridgeCanUseToolFnResponse → resolvePermissionPrompt
 * 3. 无两者 → 返回 behavior='ask'
 */
async function resolvePromptDecision(
  input: PermissionPipelineInput,
  reason: PermissionDecisionReason,
  message: string,
  classifierSuggestion?: ClassifierResult
): Promise<PermissionResult> {
  const { tool, args, permCtx, promptHandler, canUseToolFn, denialTracking } = input;
  const currentDenialTracking = denialTracking ?? DEFAULT_DENIAL_TRACKING;

  // 优先使用 promptHandler
  if (promptHandler) {
    const request: PermissionPromptRequest = {
      requestId: generatePromptRequestId(),
      toolName: tool.name,
      toolInput: args,
      reason,
      message,
      currentMode: permCtx.mode,
      classifierSuggestion,
      consecutiveDenials: currentDenialTracking.consecutiveDenials,
      totalDenials: currentDenialTracking.totalDenials
    };

    const response: PermissionPromptResponse = await promptHandler.prompt(request);
    const resolved = resolvePermissionPrompt(response, request, currentDenialTracking);

    if (resolved.finalBehavior === 'deny') {
      return {
        behavior: 'deny',
        message: `用户拒绝了 "${tool.name}" 的执行`,
        reason: 'user_denied',
        decisionSource: 'user',
        structuredReason: reason,
        feedback: response.feedback
      };
    }

    return {
      behavior: 'allow',
      decisionSource: 'user',
      structuredReason: reason,
      feedback: response.feedback,
      permissionUpdate: resolved.update
    };
  }

  // 回退到 canUseToolFn (boolean)
  if (canUseToolFn) {
    const approved = await canUseToolFn(tool.name, args, reason, message);
    const response = bridgeCanUseToolFnResponse(approved);
    const request: PermissionPromptRequest = {
      requestId: generatePromptRequestId(),
      toolName: tool.name,
      toolInput: args,
      reason,
      message,
      currentMode: permCtx.mode,
      classifierSuggestion,
      consecutiveDenials: currentDenialTracking.consecutiveDenials,
      totalDenials: currentDenialTracking.totalDenials
    };
    const resolved = resolvePermissionPrompt(response, request, currentDenialTracking);

    if (resolved.finalBehavior === 'deny') {
      return {
        behavior: 'deny',
        message: `用户拒绝了 "${tool.name}" 的执行`,
        reason: 'user_denied',
        decisionSource: 'user',
        structuredReason: reason
      };
    }

    return {
      behavior: 'allow',
      decisionSource: 'user',
      structuredReason: reason,
      permissionUpdate: resolved.update
    };
  }

  // 无 handler → 返回 ask，保持传入的 decisionSource
  return {
    behavior: 'ask',
    message,
    decisionSource: reason === 'classifier_ask' ? 'classifier' : 'rule',
    structuredReason: reason
  };
}

/**
 * 权限决策8+步管线 — hasPermissionsToUseTool
 *
 * 参考 Claude Code 的权限检查流程（permissions.ts hasPermissionsToUseTool）:
 *
 * Step 1: bypassPermissions 快速路径 → allow Step 1.5: bypass-immune 安全检查 → ask（即使 bypass 模式也不 allow
 * 危险文件/目录） Step 1.6: requiresUserInteraction → ask（bypass-immune，必须用户交互） Step 2: DenyRule 匹配 → deny
 * Step 3: AskRule 匹配 → ask/P16F promptHandler 桥接 Step 4: ModeOverride
 * (restricted/plan/acceptEdits/auto/dontAsk) → deny/allow Step 4.5: acceptEdits 快速路径白名单 → allow
 * Step 4.7: CLASSIFIER_SAFE_ALLOWLIST → allow Step 4.8: dontAsk 模式 → ask转为deny Step 4.9:
 * headless-agent → ask转为deny Step 5: PermissionClassifier → AI分类器评估 Step 5.5: Iron Gate →
 * 分类器不可用时的安全策略 Step 5.7: denial limits → 强制回退到 prompting Step 6: checkPermissions → 工具自定义 Step 7:
 * promptHandler/canUseToolFn → 用户交互确认（嵌入在 Step 3/5/6 中）
 *
 * @param input 管线输入
 * @returns 权限决策结果
 */
export async function hasPermissionsToUseTool(
  input: PermissionPipelineInput
): Promise<PermissionResult> {
  const { tool, args, context, permCtx, requiresUserInteraction, isHeadlessAgent } = input;

  // === Step 1: bypassPermissions 快速路径 ===
  if (permCtx.bypassPermissions) {
    // Step 1.5: bypass-immune 安全检查 — 即使 bypass 模式也不 allow 危险文件/目录
    const safetyResult = isDangerousToolInput(tool.name, args);
    if (safetyResult.isDangerous) {
      return resolvePromptDecision(
        input,
        'safety_check_block',
        `安全检查: ${safetyResult.reason ?? '涉及 bypass-immune 文件/目录'}`
      );
    }

    // Step 1.6: requiresUserInteraction — bypass-immune，必须用户交互
    if (requiresUserInteraction) {
      return resolvePromptDecision(
        input,
        'requires_user_interaction_block',
        `工具 "${tool.name}" 要求用户交互（bypass-immune）`
      );
    }

    return {
      behavior: 'allow',
      decisionSource: 'flag',
      structuredReason: 'mode_bypass'
    };
  }

  // === Step 2: DenyRule 匹配 ===
  for (const rule of permCtx.denyRules) {
    if (matchPermissionRuleValue(rule.ruleValue, tool.name, args)) {
      return {
        behavior: 'deny',
        message: `工具 "${tool.name}" 被拒绝规则禁止: ${rule.reason}`,
        reason: rule.reason,
        decisionSource: 'rule',
        structuredReason: 'deny_rule_match'
      };
    }
  }

  // === Step 3: AskRule 匹配 → P16F promptHandler/canUseToolFn 桥接 ===
  for (const rule of permCtx.askRules) {
    if (matchPermissionRuleValue(rule.ruleValue, tool.name, args)) {
      return resolvePromptDecision(
        input,
        'ask_rule_match',
        `工具 "${tool.name}" 需要确认: ${rule.reason ?? rule.ruleValue}`
      );
    }
  }

  // === Step 4: ModeOverride 模式决策 ===
  const category = classifyPermissionMode(permCtx.mode);

  // restricted 模式: 拒绝所有非只读工具
  if (category === 'restricted' && !tool.isReadOnly(args)) {
    return {
      behavior: 'deny',
      message: `受限模式下不允许执行非只读工具 "${tool.name}"`,
      reason: 'restricted_mode_non_readonly',
      decisionSource: 'mode',
      structuredReason: 'mode_restricted_non_readonly'
    };
  }

  // plan 模式: 仅允许白名单工具
  if (permCtx.mode === 'plan' && !isPlanModeAllowedTool(tool.name)) {
    return {
      behavior: 'deny',
      message: `计划模式下不允许执行工具 "${tool.name}"`,
      reason: 'plan_mode_disallowed',
      decisionSource: 'mode',
      structuredReason: 'mode_plan_disallowed'
    };
  }

  // acceptEdits 模式: 禁止危险命令工具
  if (permCtx.mode === 'acceptEdits' && isAcceptEditsDeniedTool(tool.name)) {
    return {
      behavior: 'deny',
      message: `接受编辑模式下不允许执行命令工具 "${tool.name}"`,
      reason: 'accept_edits_mode_disallowed',
      decisionSource: 'mode',
      structuredReason: 'mode_accept_edits_disallowed'
    };
  }

  // auto 模式: 只读工具自动允许
  if (category === 'autoapprove' && tool.isReadOnly(args)) {
    return {
      behavior: 'allow',
      decisionSource: 'mode',
      structuredReason: 'mode_auto_approve_readonly'
    };
  }

  // === Step 4.5: acceptEdits 快速路径白名单 ===
  if (permCtx.mode === 'acceptEdits' && isAcceptEditsFastPathTool(tool.name)) {
    const fastPathResult = tool.checkPermissions(args, context);
    if (fastPathResult.behavior === 'allow') {
      return {
        behavior: 'allow',
        decisionSource: 'mode',
        structuredReason: 'mode_auto_approve_readonly'
      };
    }
  }

  // === Step 4.7: CLASSIFIER_SAFE_ALLOWLIST ===
  if (category === 'autoapprove' && isClassifierSafeTool(tool.name)) {
    return {
      behavior: 'allow',
      decisionSource: 'mode',
      structuredReason: 'mode_auto_approve_readonly'
    };
  }

  // === Step 4.8: dontAsk 模式 — 将所有 ask 转为 deny ===
  if (isSilentDenyMode(permCtx.mode)) {
    return {
      behavior: 'deny',
      message: `dontAsk 模式下不允许执行 "${tool.name}"`,
      reason: 'dont_ask_converted_deny',
      decisionSource: 'mode',
      structuredReason: 'mode_dont_ask_converted_deny'
    };
  }

  // === Step 4.9: headless-agent — 自动 deny（先跑 hooks 后仍 deny） ===
  if (isHeadlessAgent && shouldAvoidPermissionPrompts(permCtx.mode)) {
    return {
      behavior: 'deny',
      message: `headless agent 自动拒绝 "${tool.name}" 的执行`,
      reason: 'headless_agent_deny',
      decisionSource: 'flag',
      structuredReason: 'headless_agent_deny'
    };
  }

  // === Step 5: PermissionClassifier ===
  if (category === 'autoapprove' && !tool.isReadOnly(args) && permCtx.classifierFn) {
    const classifierInput = tool.toAutoClassifierInput(args);
    const classifierResult: ClassifierResult = await permCtx.classifierFn.classify(classifierInput);

    // Step 5.5: Iron Gate — 分类器不可用时的安全策略
    if (classifierResult.unavailable) {
      const ironGate = permCtx.ironGate;
      if (ironGate?.failClosed) {
        return {
          behavior: 'deny',
          message: `分类器不可用，Iron Gate fail-closed 拒绝 "${tool.name}" 的执行`,
          reason: classifierResult.reason,
          decisionSource: 'classifier',
          structuredReason: 'classifier_unavailable_deny'
        };
      }
      // fail-open: 继续后续步骤
    } else if (classifierResult.transcriptTooLong) {
      // 继续后续步骤
    } else {
      // 分类器正常返回
      if (classifierResult.behavior === 'allow') {
        return {
          behavior: 'allow',
          decisionSource: 'classifier',
          structuredReason: 'classifier_allow'
        };
      }

      if (classifierResult.behavior === 'deny') {
        return {
          behavior: 'deny',
          message: `分类器拒绝了 "${tool.name}" 的执行: ${classifierResult.reason}`,
          reason: classifierResult.reason,
          decisionSource: 'classifier',
          structuredReason: 'classifier_deny'
        };
      }

      if (classifierResult.behavior === 'ask') {
        // Step 5.7: denial limits — 连续拒绝达到阈值时强制回退到 prompting
        const currentDenialTracking = input.denialTracking ?? DEFAULT_DENIAL_TRACKING;
        if (currentDenialTracking.shouldFallbackToPrompting) {
          return resolvePromptDecision(
            input,
            'denial_limit_fallback',
            `多次拒绝后强制交互确认 "${tool.name}" 的执行: ${classifierResult.reason}`,
            classifierResult
          );
        }

        // P16F: 分类器建议用户确认 → promptHandler/canUseToolFn 桥接
        return resolvePromptDecision(
          input,
          'classifier_ask',
          `分类器建议确认 "${tool.name}" 的执行: ${classifierResult.reason}`,
          classifierResult
        );
      }
    }
  }

  // === Step 6: checkPermissions 工具自定义权限 ===
  const customResult = tool.checkPermissions(args, context);

  // P16F: 工具返回 ask → promptHandler/canUseToolFn 桥接
  if (customResult.behavior === 'ask') {
    return resolvePromptDecision(
      input,
      'tool_check_permissions',
      customResult.message ?? `工具 "${tool.name}" 需要确认`
    );
  }

  // 为自定义结果增加 structuredReason（如果未提供）
  // P16F: ask 已在上方通过 resolvePromptDecision 处理，此处只有 allow/deny/passthrough
  if (customResult.behavior === 'allow' && !customResult.structuredReason) {
    return { ...customResult, structuredReason: 'tool_check_permissions' };
  }
  if (customResult.behavior === 'deny' && !customResult.structuredReason) {
    return { ...customResult, structuredReason: 'tool_check_permissions' };
  }

  return customResult;
}

/**
 * 合并 Hook 决策 + 管线结果 — 扩展版 resolveHookPermission
 *
 * 优先级规则（与 Claude Code 一致）:
 *
 * - hook deny → 绝对覆盖
 * - hook allow → 不覆盖 deny/ask
 * - hook ask → 强制用户确认
 * - hook passthrough → 交由管线
 * - 无 hook → 纯管线结果
 *
 * @param hookDecision Hook 决策（可选）
 * @param pipelineResult 管线结果
 * @returns 合并后的权限结果
 */
export function resolveHookPermissionWithPipeline(
  hookDecision: HookPermissionDecision | undefined,
  pipelineResult: PermissionResult
): PermissionResult {
  if (!hookDecision || hookDecision.permissionBehavior === undefined) {
    return pipelineResult;
  }

  const { permissionBehavior } = hookDecision;

  // hook deny → 绝对覆盖
  if (permissionBehavior === 'deny') {
    return {
      behavior: 'deny',
      message: hookDecision.stopReason ?? 'Hook 阻止了执行',
      decisionSource: 'hook',
      structuredReason: 'hook_deny'
    };
  }

  // hook allow → 规则 deny/ask 可覆盖
  if (permissionBehavior === 'allow') {
    if (pipelineResult.behavior === 'deny') return pipelineResult;
    if (pipelineResult.behavior === 'ask') return pipelineResult;
    return {
      behavior: 'allow',
      updatedInput: hookDecision.updatedInput,
      decisionSource: 'hook',
      structuredReason: 'hook_allow'
    };
  }

  // hook ask → 强制用户确认
  if (permissionBehavior === 'ask') {
    return {
      behavior: 'ask',
      message: hookDecision.stopReason ?? 'Hook 要求用户确认',
      decisionSource: 'hook',
      structuredReason: 'hook_ask'
    };
  }

  // hook passthrough → 交由管线
  return pipelineResult;
}
