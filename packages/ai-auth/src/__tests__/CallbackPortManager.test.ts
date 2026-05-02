/** @suga/ai-auth — CallbackPortManager测试 */

import { describe, expect, it } from 'vitest';
import { buildRedirectUri } from '../listener/CallbackPortManager';

describe('buildRedirectUri', () => {
  it('默认 → localhost:3118/callback', () => {
    expect(buildRedirectUri()).toBe('http://localhost:3118/callback');
  });

  it('指定端口 → localhost:{port}/callback', () => {
    expect(buildRedirectUri(8765)).toBe('http://localhost:8765/callback');
  });

  it('指定端口+路径 → 自定义路径', () => {
    expect(buildRedirectUri(9000, '/auth/callback')).toBe('http://localhost:9000/auth/callback');
  });

  it('端口0 → localhost:0/callback', () => {
    expect(buildRedirectUri(0)).toBe('http://localhost:0/callback');
  });
});
