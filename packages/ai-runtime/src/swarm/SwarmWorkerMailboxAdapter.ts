/**
 * SwarmWorkerMailboxAdapter — 将 ai-coordinator 的 PermissionBubbleHandler
 * 适配为 ai-tool-core 的 SwarmWorkerMailboxOps 接口
 *
 * ai-tool-core 不依赖 ai-coordinator（避免循环依赖），
 * 所以定义独立的 SwarmWorkerMailboxOps 接口。
 * ai-runtime 同时依赖两者，负责桥接适配。
 *
 * 映射关系（近乎 1:1）:
 * - sendRequest → sendPermissionBubble（SwarmPermissionRequest → PermissionBubbleRequest）
 * - pollResponse → pollPermissionBubbleResponse（PermissionBubbleResponse → SwarmPermissionResponse）
 */

import type { SwarmWorkerMailboxOps, SwarmPermissionRequest, SwarmPermissionResponse, SwarmPermissionRule } from '@suga/ai-tool-core';
import type { Mailbox } from '@suga/ai-coordinator';
import type { PermissionBubbleRequest, PermissionBubbleResponse, PermissionBubbleRule, PermissionBubbleSuggestion } from '@suga/ai-coordinator';
import { sendPermissionBubble, pollPermissionBubbleResponse } from '@suga/ai-coordinator';

/** SwarmWorkerMailboxAdapter 配置 */
export interface SwarmWorkerMailboxAdapterConfig {
  /** ai-coordinator 的 Mailbox 实例 */
  readonly mailbox: Mailbox;
  /** Leader 名称（权限请求的目标） */
  readonly leaderName: string;
  /** Worker ID（用于 pollResponse 中的 workerName 参数） */
  readonly workerId: string;
}

/**
 * SwarmWorkerMailboxAdapter — Worker 端 Mailbox 适配器
 *
 * 实现 SwarmWorkerMailboxOps 接口，将权限请求投递到
 * ai-coordinator 的 Mailbox 并轮询 Leader 响应。
 */
export class SwarmWorkerMailboxAdapter implements SwarmWorkerMailboxOps {
  private readonly mailbox: Mailbox;
  private readonly leaderName: string;
  private readonly workerId: string;

  constructor(config: SwarmWorkerMailboxAdapterConfig) {
    this.mailbox = config.mailbox;
    this.leaderName = config.leaderName;
    this.workerId = config.workerId;
  }

  async sendRequest(request: SwarmPermissionRequest): Promise<string> {
    const bubbleRequest: PermissionBubbleRequest = mapToBubbleRequest(request);
    return sendPermissionBubble(this.mailbox, bubbleRequest, this.leaderName);
  }

  async pollResponse(requestId: string, timeoutMs?: number): Promise<SwarmPermissionResponse | null> {
    const response = await pollPermissionBubbleResponse(
      this.mailbox,
      this.workerId,
      requestId,
      timeoutMs ?? 30000
    );
    return response ? mapToSwarmResponse(response) : null;
  }
}

// ============================================================
// 映射函数
// ============================================================

/** SwarmPermissionRequest → PermissionBubbleRequest */
function mapToBubbleRequest(request: SwarmPermissionRequest): PermissionBubbleRequest {
  return {
    type: 'permission_request',
    workerId: request.workerId,
    workerName: request.workerName,
    toolName: request.toolName,
    toolInput: request.toolInput,
    reason: request.reason,
    // classifierSuggestion → permissionSuggestions 映射
    permissionSuggestions: request.classifierSuggestion
      ? mapToBubbleSuggestions(request.classifierSuggestion)
      : undefined
  };
}

/** 单个 classifierSuggestion → PermissionBubbleSuggestion[] */
function mapToBubbleSuggestions(suggestion: SwarmPermissionRequest['classifierSuggestion']): PermissionBubbleSuggestion[] {
  if (!suggestion) return [];
  return [{
    decision: suggestion.decision as 'allow' | 'deny' | 'ask',
    reason: suggestion.reason,
    confidence: suggestion.confidence as 'high' | 'medium' | 'low' | undefined
  }];
}

/** PermissionBubbleResponse → SwarmPermissionResponse */
function mapToSwarmResponse(response: PermissionBubbleResponse): SwarmPermissionResponse {
  return {
    approved: response.approved,
    reason: response.reason,
    feedback: response.feedback,
    permissionUpdates: response.permissionUpdates
      ? mapToSwarmRules(response.permissionUpdates)
      : undefined
  };
}

/** PermissionBubbleRule[] → SwarmPermissionRule[] */
function mapToSwarmRules(rules: readonly PermissionBubbleRule[]): SwarmPermissionRule[] {
  return rules.map(rule => ({
    behavior: rule.behavior,
    ruleValue: rule.ruleValue
  }));
}