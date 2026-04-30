/** aggregateHookResults 测试 — 聚合优先级与字段合并 */

import { describe, expect, it } from 'vitest';
import { aggregateHookResults } from '../utils/aggregate';
import type { HookResult } from '../types/hooks';

describe('aggregateHookResults', () => {
  describe('空输入', () => {
    it('返回默认成功结果', () => {
      const result = aggregateHookResults([]);
      expect(result.outcome).toBe('success');
      expect(result.preventContinuation).toBe(false);
      expect(result.additionalContexts).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.permissionBehavior).toBeUndefined();
    });
  });

  describe('单结果', () => {
    it('success 结果透传', () => {
      const results: HookResult[] = [{ outcome: 'success', data: 'ok' }];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.outcome).toBe('success');
      expect(aggregated.preventContinuation).toBe(false);
    });

    it('blocking 结果', () => {
      const results: HookResult[] = [{ outcome: 'blocking', stopReason: 'denied' }];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.outcome).toBe('blocking');
      expect(aggregated.preventContinuation).toBe(true);
      expect(aggregated.stopReason).toBe('denied');
    });
  });

  describe('权限行为聚合 — deny > ask > allow > passthrough', () => {
    it('deny 覆盖 allow', () => {
      const results: HookResult[] = [
        { outcome: 'success', permissionBehavior: 'allow' },
        { outcome: 'success', permissionBehavior: 'deny', permissionDecisionReason: 'unsafe' }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.permissionBehavior).toBe('deny');
    });

    it('ask 覆盖 allow', () => {
      const results: HookResult[] = [
        { outcome: 'success', permissionBehavior: 'allow' },
        { outcome: 'success', permissionBehavior: 'ask' }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.permissionBehavior).toBe('ask');
    });

    it('deny 覆盖 ask', () => {
      const results: HookResult[] = [
        { outcome: 'success', permissionBehavior: 'ask' },
        { outcome: 'success', permissionBehavior: 'deny' }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.permissionBehavior).toBe('deny');
    });

    it('passthrough 不影响其他', () => {
      const results: HookResult[] = [
        { outcome: 'success', permissionBehavior: 'passthrough' },
        { outcome: 'success', permissionBehavior: 'allow' }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.permissionBehavior).toBe('allow');
    });
  });

  describe('updatedInput — 取最后一个', () => {
    it('多个 updatedInput 取最后一个', () => {
      const results: HookResult[] = [
        { outcome: 'success', updatedInput: { path: '/old' } },
        { outcome: 'success', updatedInput: { path: '/new' } }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.updatedInput).toEqual({ path: '/new' });
    });
  });

  describe('updatedOutput — 取最后一个', () => {
    it('多个 updatedOutput 取最后一个', () => {
      const results: HookResult[] = [
        { outcome: 'success', updatedOutput: 'old_output' },
        { outcome: 'success', updatedOutput: 'new_output' }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.updatedOutput).toBe('new_output');
    });
  });

  describe('additionalContexts — 汇集所有', () => {
    it('汇集所有 additionalContext', () => {
      const results: HookResult[] = [
        { outcome: 'success', additionalContext: 'context1' },
        { outcome: 'success', additionalContext: 'context2' }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.additionalContexts).toEqual(['context1', 'context2']);
    });
  });

  describe('preventContinuation — 任一为 true', () => {
    it('一个 blocking 就整体 preventContinuation', () => {
      const results: HookResult[] = [
        { outcome: 'success' },
        { outcome: 'blocking', preventContinuation: true }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.preventContinuation).toBe(true);
      expect(aggregated.outcome).toBe('mixed');
    });
  });

  describe('errors — 汇集非阻断错误', () => {
    it('汇集 non_blocking_error 的 error 信息', () => {
      const results: HookResult[] = [
        { outcome: 'non_blocking_error', error: 'timeout' },
        { outcome: 'success' },
        { outcome: 'non_blocking_error', error: 'connection failed' }
      ];
      const aggregated = aggregateHookResults(results);
      expect(aggregated.errors).toEqual(['timeout', 'connection failed']);
    });
  });
});