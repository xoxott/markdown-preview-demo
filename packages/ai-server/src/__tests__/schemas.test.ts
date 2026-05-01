/** @suga/ai-server — Zod Schema校验测试 */

import { describe, expect, it } from 'vitest';
import { DaemonConfigSchema, ServerConnectResponseSchema } from '../types/server';

describe('ai-server — Zod Schema', () => {
  it('DaemonConfigSchema校验 — 完整配置', () => {
    const result = DaemonConfigSchema.safeParse({
      port: 8765,
      host: 'localhost',
      authToken: 'secret-token',
      idleTimeoutMs: 300000,
      maxSessions: 10,
      workspace: '/tmp/project'
    });
    expect(result.success).toBe(true);
  });

  it('DaemonConfigSchema校验 — 空配置', () => {
    const result = DaemonConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('DaemonConfigSchema校验 — 无效类型', () => {
    const result = DaemonConfigSchema.safeParse({
      port: 'invalid',
      maxSessions: 'not-a-number'
    });
    expect(result.success).toBe(false);
  });

  it('ServerConnectResponseSchema校验 — 正确结构', () => {
    const result = ServerConnectResponseSchema.safeParse({
      sessionId: 'sess_001',
      wsUrl: 'ws://localhost:8765',
      authToken: 'token-abc',
      workDir: '/tmp'
    });
    expect(result.success).toBe(true);
  });

  it('ServerConnectResponseSchema校验 — 缺少字段', () => {
    const result = ServerConnectResponseSchema.safeParse({
      sessionId: 'sess_001'
    });
    expect(result.success).toBe(false);
  });
});