/** TokenBudgetTracker 测试 — Token 预算续写追踪器 */

import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { TokenBudgetTracker } from '../core/TokenBudgetTracker';

/** 辅助：获取消息文本内容 */
function getContent(msg: AgentMessage): string {
  if (msg.role === 'user') return typeof msg.content === 'string' ? msg.content : '';
  if (msg.role === 'assistant') return msg.content;
  return '';
}

/** 辅助：检查消息是否为 meta */
function isMetaMsg(msg: AgentMessage): boolean {
  if (msg.role === 'user') return msg.isMeta === true;
  return false;
}

describe('TokenBudgetTracker', () => {
  describe('shouldContinue', () => {
    it('预算使用比例低于阈值时应返回 true', () => {
      const tracker = new TokenBudgetTracker();

      // 使用 4500 / 10000 = 45% < 90% → 应续写
      expect(tracker.shouldContinue(4500, 10000)).toBe(true);
    });

    it('预算使用比例高于阈值时应返回 false', () => {
      const tracker = new TokenBudgetTracker();

      // 使用 9500 / 10000 = 95% > 90% → 不需要续写
      expect(tracker.shouldContinue(9500, 10000)).toBe(false);
    });

    it('达到最大续写次数时应返回 false', () => {
      const tracker = new TokenBudgetTracker({ maxContinuations: 2 });

      tracker.recordContinuation();
      tracker.recordContinuation();

      // 第3次续写 → 超过 maxContinuations=2
      expect(tracker.shouldContinue(4500, 10000)).toBe(false);
    });
  });

  describe('createNudgeMessage', () => {
    it('应包含百分比和使用量', () => {
      const tracker = new TokenBudgetTracker();

      const msg = tracker.createNudgeMessage(4500, 10000);

      expect(msg.role).toBe('user');
      expect(getContent(msg)).toContain('45%');
      expect(getContent(msg)).toContain('4500/10000');
      expect(getContent(msg)).toContain('Keep working');
      expect(isMetaMsg(msg)).toBe(true);
    });

    it('应生成唯一 ID', () => {
      const tracker = new TokenBudgetTracker();

      const msg1 = tracker.createNudgeMessage(3000, 10000);
      const msg2 = tracker.createNudgeMessage(5000, 10000);

      expect(msg1.id).not.toBe(msg2.id);
      expect(msg1.id).toMatch(/^nudge_/);
    });
  });

  describe('createContinuationTransition', () => {
    it('应创建 token_budget_continuation transition', () => {
      const tracker = new TokenBudgetTracker();

      const transition = tracker.createContinuationTransition(4500, 10000);

      expect(transition.type).toBe('token_budget_continuation');
      if (transition.type === 'token_budget_continuation') {
        expect(transition.budgetUsage).toBe(0.45);
        expect(transition.nudgeMessage.role).toBe('user');
        expect(isMetaMsg(transition.nudgeMessage)).toBe(true);
      }
    });
  });

  describe('isDiminishingReturns', () => {
    it('最近两轮增量低于阈值时应返回 true', () => {
      const tracker = new TokenBudgetTracker({ minDeltaTokens: 500 });

      tracker.recordContinuation(400);
      tracker.recordContinuation(300);

      expect(tracker.isDiminishingReturns(300, 400)).toBe(true);
    });

    it('增量高于阈值时应返回 false', () => {
      const tracker = new TokenBudgetTracker({ minDeltaTokens: 500 });

      tracker.recordContinuation(600);
      tracker.recordContinuation(700);

      expect(tracker.isDiminishingReturns(700, 600)).toBe(false);
    });
  });

  describe('状态管理', () => {
    it('recordContinuation 应正确跟踪次数和增量', () => {
      const tracker = new TokenBudgetTracker();

      tracker.recordContinuation(500);
      expect(tracker.currentContinuationCount).toBe(1);
      expect(tracker.lastDeltaTokens).toBe(500);

      tracker.recordContinuation(600);
      expect(tracker.currentContinuationCount).toBe(2);
      expect(tracker.lastDeltaTokens).toBe(600);
      expect(tracker.secondLastDeltaTokens).toBe(500);
    });

    it('reset 应重置所有状态', () => {
      const tracker = new TokenBudgetTracker();

      tracker.recordContinuation(500);
      tracker.recordContinuation(600);
      tracker.reset();

      expect(tracker.currentContinuationCount).toBe(0);
      expect(tracker.lastDeltaTokens).toBeUndefined();
      expect(tracker.secondLastDeltaTokens).toBeUndefined();
    });

    it('自定义配置应生效', () => {
      const tracker = new TokenBudgetTracker({
        budgetRatio: 0.8,
        maxContinuations: 5,
        minDeltaTokens: 300
      });

      // 80% threshold: 8500/10000 = 85% > 80% → false
      expect(tracker.shouldContinue(8500, 10000)).toBe(false);
      // 75% < 80% → true
      expect(tracker.shouldContinue(7500, 10000)).toBe(true);
    });
  });
});
