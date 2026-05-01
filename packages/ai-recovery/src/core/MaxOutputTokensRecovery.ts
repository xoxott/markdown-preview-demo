/** MaxOutputTokensRecovery — 输出 token 耗尽恢复 escalation + recovery meta */

import type { AgentMessage, ContinueTransition } from '@suga/ai-agent-loop';
import type { MaxOutputTokensRecoveryConfig } from '../types/config';
import type { RecoveryResult } from '../types/recovery';

/** 默认 escalation 上限阶梯 */
const DEFAULT_ESCALATION_LIMITS = [8192, 16384, 65536] as const;

/** 默认最大 escalation 次数 */
const DEFAULT_MAX_ESCALATIONS = 3;

/**
 * 输出 token 耗尽恢复器
 *
 * 当 LLM 输出达到 max_output_tokens 限制时：
 *
 * 1. 前 maxEscalations 次 → escalation（提升输出 token 上限后重试）
 *
 *    - 使用 max_output_tokens_escalate transition
 *    - 本轮 assistant 部分有效，advanceState 保留截断的产出
 * 2. 超过 maxEscalations 次 → 注入 recovery meta message 后继续
 *
 *    - 使用 max_output_tokens_recovery transition
 *    - 注入一条 user 消息提示 LLM 继续之前的输出
 *
 * 参考 Claude Code query.ts 的 max_output_tokens handling:
 *
 * - 先尝试 escalation（提升 max_tokens）
 * - 3次后 → 注入 "[Recovery]" 消息让 LLM 继续
 */
export class MaxOutputTokensRecovery {
  private escalationCount = 0;
  private readonly maxEscalations: number;
  private readonly escalationLimits: readonly number[];

  constructor(config?: MaxOutputTokensRecoveryConfig) {
    this.maxEscalations = config?.maxEscalations ?? DEFAULT_MAX_ESCALATIONS;
    this.escalationLimits = config?.escalationLimits ?? DEFAULT_ESCALATION_LIMITS;
  }

  /**
   * 恢复输出 token 耗尽
   *
   * @returns 恢复结果
   */
  recover(): RecoveryResult {
    if (this.escalationCount < this.maxEscalations) {
      // 还有 escalation 次数 → 提升上限重试
      this.escalationCount++;
      const escalatedLimit =
        this.escalationLimits[Math.min(this.escalationCount - 1, this.escalationLimits.length - 1)];

      const transition: ContinueTransition = {
        type: 'max_output_tokens_escalate',
        escalatedLimit
      };

      return {
        transition,
        strategy: 'max_output_tokens_escalate',
        recovered: true
      };
    }

    // escalation 已耗尽 → 注入 recovery meta message
    const recoveryMessage: AgentMessage = {
      id: `recovery_${Date.now()}`,
      role: 'user',
      content: '[Recovery: 输出 token 达到上限，请继续之前的输出]',
      timestamp: Date.now()
    };

    const transition: ContinueTransition = {
      type: 'max_output_tokens_recovery',
      recoveryMessage
    };

    return {
      transition,
      strategy: 'max_output_tokens_recovery',
      recovered: true
    };
  }

  /** 当前 escalation 次数 */
  get currentEscalationCount(): number {
    return this.escalationCount;
  }

  /** 当前 escalation 上限 */
  get currentEscalatedLimit(): number | undefined {
    if (this.escalationCount === 0) return undefined;
    return this.escalationLimits[
      Math.min(this.escalationCount - 1, this.escalationLimits.length - 1)
    ];
  }

  /** 重置 escalation 计数（新会话时调用） */
  reset(): void {
    this.escalationCount = 0;
  }
}
