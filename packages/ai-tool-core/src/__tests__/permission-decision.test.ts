/** PermissionDecisionReason + DenialTracking 测试 */

import { describe, expect, it } from 'vitest';
import type { DenialTrackingState, PermissionDecisionReason } from '../types/permission-decision';
import {
  DEFAULT_DENIAL_TRACKING,
  MAX_CONSECUTIVE_DENIALS,
  MAX_TOTAL_DENIALS,
  updateDenialTracking
} from '../types/permission-decision';

describe('PermissionDecisionReason', () => {
  it('应有11种决策原因', () => {
    const reasons: PermissionDecisionReason[] = [
      'deny_rule_match',
      'ask_rule_match',
      'mode_restricted_non_readonly',
      'mode_plan_disallowed',
      'mode_accept_edits_disallowed',
      'mode_auto_approve_readonly',
      'mode_bypass',
      'tool_check_permissions',
      'hook_deny',
      'hook_allow',
      'hook_ask'
    ];
    expect(reasons.length).toBe(11);
  });
});

describe('DenialTrackingState', () => {
  it('默认值应为零', () => {
    expect(DEFAULT_DENIAL_TRACKING.consecutiveDenials).toBe(0);
    expect(DEFAULT_DENIAL_TRACKING.totalDenials).toBe(0);
    expect(DEFAULT_DENIAL_TRACKING.shouldFallbackToPrompting).toBe(false);
  });

  it('阈值常量', () => {
    expect(MAX_CONSECUTIVE_DENIALS).toBe(3);
    expect(MAX_TOTAL_DENIALS).toBe(20);
  });
});

describe('updateDenialTracking', () => {
  it('deny → consecutive+1, total+1', () => {
    const result = updateDenialTracking(DEFAULT_DENIAL_TRACKING, 'deny');
    expect(result.consecutiveDenials).toBe(1);
    expect(result.totalDenials).toBe(1);
    expect(result.shouldFallbackToPrompting).toBe(false);
  });

  it('allow → consecutive 清零, total 不变', () => {
    const state: DenialTrackingState = {
      consecutiveDenials: 2,
      totalDenials: 5,
      shouldFallbackToPrompting: false
    };
    const result = updateDenialTracking(state, 'allow');
    expect(result.consecutiveDenials).toBe(0);
    expect(result.totalDenials).toBe(5);
  });

  it('连续拒绝达到 MAX_CONSECUTIVE_DENIALS → shouldFallback', () => {
    let state = DEFAULT_DENIAL_TRACKING;
    for (let i = 0; i < MAX_CONSECUTIVE_DENIALS; i++) {
      state = updateDenialTracking(state, 'deny');
    }
    expect(state.shouldFallbackToPrompting).toBe(true);
  });

  it('总拒绝达到 MAX_TOTAL_DENIALS → shouldFallback', () => {
    let state: DenialTrackingState = {
      consecutiveDenials: 0,
      totalDenials: MAX_TOTAL_DENIALS - 1,
      shouldFallbackToPrompting: false
    };
    state = updateDenialTracking(state, 'deny');
    expect(state.shouldFallbackToPrompting).toBe(true);
  });

  it('ask → 不改变计数', () => {
    const state: DenialTrackingState = {
      consecutiveDenials: 2,
      totalDenials: 5,
      shouldFallbackToPrompting: false
    };
    const result = updateDenialTracking(state, 'ask');
    expect(result.consecutiveDenials).toBe(2);
    expect(result.totalDenials).toBe(5);
  });

  it('passthrough → 不改变计数', () => {
    const state: DenialTrackingState = {
      consecutiveDenials: 2,
      totalDenials: 5,
      shouldFallbackToPrompting: false
    };
    const result = updateDenialTracking(state, 'passthrough');
    expect(result).toEqual(state);
  });
});
