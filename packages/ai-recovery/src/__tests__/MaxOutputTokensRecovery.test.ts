/** MaxOutputTokensRecovery 测试 — 输出 token 耗尽恢复 */

import { describe, expect, it } from 'vitest';
import { MaxOutputTokensRecovery } from '../core/MaxOutputTokensRecovery';

describe('MaxOutputTokensRecovery', () => {
  describe('escalation', () => {
    it('首次恢复应返回 escalation + 默认上限', () => {
      const recovery = new MaxOutputTokensRecovery();

      const result = recovery.recover();

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('max_output_tokens_escalate');
      expect(result.transition.type).toBe('max_output_tokens_escalate');
      if (result.transition.type === 'max_output_tokens_escalate') {
        expect(result.transition.escalatedLimit).toBe(8192);
      }
    });

    it('第二次 escalation 应使用第二阶梯上限', () => {
      const recovery = new MaxOutputTokensRecovery();

      recovery.recover(); // 第一次 → 8192
      const result = recovery.recover(); // 第二次 → 16384

      expect(result.transition.type).toBe('max_output_tokens_escalate');
      if (result.transition.type === 'max_output_tokens_escalate') {
        expect(result.transition.escalatedLimit).toBe(16384);
      }
    });

    it('第三次 escalation 应使用第三阶梯上限', () => {
      const recovery = new MaxOutputTokensRecovery();

      recovery.recover(); // 8192
      recovery.recover(); // 16384
      const result = recovery.recover(); // 65536

      if (result.transition.type === 'max_output_tokens_escalate') {
        expect(result.transition.escalatedLimit).toBe(65536);
      }
    });
  });

  describe('recovery', () => {
    it('超过 maxEscalations 后应切换到 recovery meta message', () => {
      const recovery = new MaxOutputTokensRecovery({ maxEscalations: 2 });

      recovery.recover(); // 第1次 escalation
      recovery.recover(); // 第2次 escalation
      const result = recovery.recover(); // 第3次 → recovery

      expect(result.strategy).toBe('max_output_tokens_recovery');
      expect(result.transition.type).toBe('max_output_tokens_recovery');
      if (result.transition.type === 'max_output_tokens_recovery') {
        expect(result.transition.recoveryMessage.role).toBe('user');
        if (result.transition.recoveryMessage.role === 'user') {
          expect(result.transition.recoveryMessage.content).toContain('Recovery');
        }
      }
    });

    it('recoveryMessage 应包含唯一 ID', () => {
      const recovery = new MaxOutputTokensRecovery({ maxEscalations: 1 });

      recovery.recover(); // 1次 escalation
      const result = recovery.recover(); // recovery

      if (result.transition.type === 'max_output_tokens_recovery') {
        expect(result.transition.recoveryMessage.id).toMatch(/^recovery_\d+/);
      }
    });

    it('recovery 后继续调用应始终返回 recovery', () => {
      const recovery = new MaxOutputTokensRecovery({ maxEscalations: 1 });

      recovery.recover(); // escalation
      const result1 = recovery.recover(); // recovery
      const result2 = recovery.recover(); // recovery

      expect(result1.transition.type).toBe('max_output_tokens_recovery');
      expect(result2.transition.type).toBe('max_output_tokens_recovery');
    });
  });

  describe('自定义配置', () => {
    it('自定义 escalationLimits 应按序使用', () => {
      const recovery = new MaxOutputTokensRecovery({
        escalationLimits: [4096, 8192]
      });

      const result1 = recovery.recover();
      if (result1.transition.type === 'max_output_tokens_escalate') {
        expect(result1.transition.escalatedLimit).toBe(4096);
      }

      const result2 = recovery.recover();
      if (result2.transition.type === 'max_output_tokens_escalate') {
        expect(result2.transition.escalatedLimit).toBe(8192);
      }
    });

    it('escalationLimits 少于 maxEscalations 时应使用最后一个上限', () => {
      const recovery = new MaxOutputTokensRecovery({
        maxEscalations: 3,
        escalationLimits: [4096]
      });

      recovery.recover(); // 4096
      const result2 = recovery.recover(); // 仍然是 4096（使用最后一个上限）
      if (result2.transition.type === 'max_output_tokens_escalate') {
        expect(result2.transition.escalatedLimit).toBe(4096);
      }

      const result3 = recovery.recover(); // 4096
      if (result3.transition.type === 'max_output_tokens_escalate') {
        expect(result3.transition.escalatedLimit).toBe(4096);
      }
    });
  });

  describe('状态管理', () => {
    it('currentEscalationCount 应正确跟踪', () => {
      const recovery = new MaxOutputTokensRecovery();

      expect(recovery.currentEscalationCount).toBe(0);
      recovery.recover();
      expect(recovery.currentEscalationCount).toBe(1);
      recovery.recover();
      expect(recovery.currentEscalationCount).toBe(2);
    });

    it('currentEscalatedLimit 应返回当前上限', () => {
      const recovery = new MaxOutputTokensRecovery();

      expect(recovery.currentEscalatedLimit).toBe(undefined);
      recovery.recover();
      expect(recovery.currentEscalatedLimit).toBe(8192);
    });

    it('reset 应重置 escalation 计数', () => {
      const recovery = new MaxOutputTokensRecovery();

      recovery.recover();
      recovery.recover();
      expect(recovery.currentEscalationCount).toBe(2);

      recovery.reset();
      expect(recovery.currentEscalationCount).toBe(0);
      expect(recovery.currentEscalatedLimit).toBe(undefined);

      // 重置后应重新 escalation
      const result = recovery.recover();
      expect(result.transition.type).toBe('max_output_tokens_escalate');
    });
  });
});
