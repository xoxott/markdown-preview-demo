/** 用户确认循环类型（Permission Prompt） 宿主注入UI交互接口+请求/响应结构+解析桥接 */

import type { DenialTrackingState, PermissionDecisionReason } from './permission-decision';
import type { PermissionMode } from './permission-mode';
import type { ClassifierResult } from './permission-classifier';
import { updateDenialTracking } from './permission-decision';
import type { PermissionUpdate } from './permission-context';
import type { PermissionAllowRule, PermissionRuleSource } from './permission-rule';

/**
 * 用户确认请求 — 发给宿主 UI 的完整信息
 *
 * 参考 Claude Code 的 PermissionRequest: 当管线到达需要用户交互确认的步骤时， 构造此请求发送给宿主的 UI 实现。
 *
 * 宿主 UI 根据此信息展示交互界面（如 CLI 的 yes/no/always 提示）。
 */
export interface PermissionPromptRequest {
  /** 请求唯一 ID */
  readonly requestId: string;
  /** 工具名称 */
  readonly toolName: string;
  /** 工具输入参数 */
  readonly toolInput: unknown;
  /** 请求原因（结构化，对应管线步骤） */
  readonly reason: PermissionDecisionReason;
  /** 询问消息（面向用户的人类可读文本） */
  readonly message: string;
  /** 当前权限模式 */
  readonly currentMode: PermissionMode;
  /** 分类器建议（可选，来自 Step 5 classifier） */
  readonly classifierSuggestion?: ClassifierResult;
  /** 连续拒绝计数 */
  readonly consecutiveDenials?: number;
  /** 总拒绝计数 */
  readonly totalDenials?: number;
}

/**
 * 用户确认响应 — 用户决策结果
 *
 * 参考 Claude Code 的 permission prompt response:
 *
 * - behavior: approve/deny 核心决策
 * - persistent: 是否持久化（"always allow" → persistent=true）
 * - persistentTarget: 持久化到哪个层（session/project/user）
 * - feedback: 用户反馈文本（可选，传回给 Agent）
 *
 * "一次性允许" → behavior='approve', persistent=false "永久允许" → behavior='approve', persistent=true,
 * persistentTarget='session' "拒绝" → behavior='deny'
 */
export interface PermissionPromptResponse {
  /** 决策行为 */
  readonly behavior: 'approve' | 'deny';
  /** 是否持久化（添加规则到 settings/session） */
  readonly persistent?: boolean;
  /** 持久化目标层 */
  readonly persistentTarget?: 'session' | 'project' | 'user';
  /** 用户反馈文本（可选） */
  readonly feedback?: string;
}

/**
 * 用户确认接口 — 宿主注入 UI 实现
 *
 * 与 PermissionClassifier、SettingsLayerReader 一致的宿主注入模式： 库定义接口，宿主环境实现具体的 UI 交互。
 *
 * CLI 实现示例：在终端显示 yes/no/always 提示 IDE 实现示例：弹出对话框或通知栏 Web 实现示例：模态框交互
 */
export interface PermissionPromptHandler {
  /**
   * 向用户展示权限请求并等待响应
   *
   * 此函数应阻塞直到用户做出决策。
   *
   * @param request 权限请求（包含工具名/原因/建议等完整信息）
   * @returns 用户决策响应
   */
  prompt(request: PermissionPromptRequest): Promise<PermissionPromptResponse>;
}

/**
 * 解析用户确认响应 → PermissionUpdate + DenialTracking 更新
 *
 * 纯函数，无副作用：
 *
 * - deny → DenialTracking +1 + 返回 deny（无 PermissionUpdate）
 * - approve + persistent → addRules PermissionUpdate + allow
 * - approve + non-persistent → null update + allow（一次性批准）
 *
 * @param response 用户确认响应
 * @param request 原始请求（用于构造规则）
 * @param currentDenialTracking 当前拒绝追踪状态
 * @returns 解析结果：update + denialTracking + finalBehavior
 */
export function resolvePermissionPrompt(
  response: PermissionPromptResponse,
  request: PermissionPromptRequest,
  currentDenialTracking: DenialTrackingState
): {
  /** 权限更新操作（undefined 表示一次性批准无更新） */
  readonly update: PermissionUpdate | undefined;
  /** 更新后的拒绝追踪状态 */
  readonly denialTracking: DenialTrackingState;
  /** 管线最终行为 */
  readonly finalBehavior: 'allow' | 'deny';
} {
  // deny → DenialTracking 更新
  if (response.behavior === 'deny') {
    const newTracking = updateDenialTracking(currentDenialTracking, 'deny');
    return {
      update: undefined,
      denialTracking: newTracking,
      finalBehavior: 'deny'
    };
  }

  // approve → DenialTracking consecutive 清零
  const newTracking = updateDenialTracking(currentDenialTracking, 'allow');

  // approve + persistent → addRules PermissionUpdate
  if (response.persistent) {
    const source = mapPersistentTargetToRuleSource(response.persistentTarget ?? 'session');
    const rule: PermissionAllowRule = {
      behavior: 'allow',
      ruleValue: request.toolName,
      source,
      reason: request.message
    };

    return {
      update: { type: 'addRules', rules: [rule] },
      denialTracking: newTracking,
      finalBehavior: 'allow'
    };
  }

  // approve + non-persistent → 一次性批准，无 PermissionUpdate
  return {
    update: undefined,
    denialTracking: newTracking,
    finalBehavior: 'allow'
  };
}

/** 持久化目标 → PermissionRuleSource 映射 */
function mapPersistentTargetToRuleSource(
  target: PermissionPromptResponse['persistentTarget']
): PermissionRuleSource {
  switch (target) {
    case 'session':
      return 'session';
    case 'project':
      return 'project';
    case 'user':
      return 'user';
    default:
      return 'session';
  }
}

/**
 * 桥接 CanUseToolFn(boolean) → PermissionPromptResponse
 *
 * 向后兼容：boolean true → approve(non-persistent), boolean false → deny
 *
 * @param approved CanUseToolFn 返回的 boolean 响应
 * @returns 等价的 PermissionPromptResponse
 */
export function bridgeCanUseToolFnResponse(approved: boolean): PermissionPromptResponse {
  if (approved) {
    return { behavior: 'approve' }; // 一次性批准，无持久化
  }
  return { behavior: 'deny' };
}

/**
 * 生成请求唯一 ID
 *
 * 格式: prompt_{timestamp}_{random}
 */
export function generatePromptRequestId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
