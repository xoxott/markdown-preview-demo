/** @suga/ai-auth — OAuth通用类型测试 */

import { describe, expect, it } from 'vitest';
import { getTokenRemainingSeconds, isOAuthTokenExpired, parseScopes } from '../types/auth-types';

describe('parseScopes', () => {
  it('从scope字符串解析为数组', () => {
    expect(parseScopes('openid profile email')).toEqual(['openid', 'profile', 'email']);
  });

  it('空字符串 → 空数组', () => {
    expect(parseScopes('')).toEqual([]);
  });

  it('undefined → 空数组', () => {
    expect(parseScopes(undefined)).toEqual([]);
  });

  it('单个scope', () => {
    expect(parseScopes('openid')).toEqual(['openid']);
  });

  it('含空格分隔的多个空 → 过滤', () => {
    expect(parseScopes('openid  profile')).toEqual(['openid', 'profile']);
  });
});

describe('isOAuthTokenExpired', () => {
  it('过期 → true', () => {
    const past = Date.now() - 10 * 60 * 1000; // 10分钟前过期
    expect(isOAuthTokenExpired(past)).toBe(true);
  });

  it('5分钟内过期 → true（含buffer）', () => {
    const near = Date.now() + 4 * 60 * 1000; // 4分钟后过期（在5分钟buffer内）
    expect(isOAuthTokenExpired(near)).toBe(true);
  });

  it('未过期 → false', () => {
    const future = Date.now() + 10 * 60 * 1000; // 10分钟后过期
    expect(isOAuthTokenExpired(future)).toBe(false);
  });

  it('正好5分钟后 → false（刚好不在buffer内）', () => {
    const exact = Date.now() + 5 * 60 * 1000 + 1; // 5分钟1秒后
    expect(isOAuthTokenExpired(exact)).toBe(false);
  });
});

describe('getTokenRemainingSeconds', () => {
  it('未来过期 → 正数', () => {
    const future = Date.now() + 3600 * 1000; // 1小时后
    const remaining = getTokenRemainingSeconds(future);
    expect(remaining).toBeCloseTo(3600, -1); // 约3600秒，允许±1精度
  });

  it('已过期 → 负数', () => {
    const past = Date.now() - 1000;
    expect(getTokenRemainingSeconds(past)).toBeLessThan(0);
  });
});
