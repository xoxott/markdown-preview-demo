/** @suga/ai-sdk — 控制协议类型验证 */

import { describe, expect, it } from 'vitest';
import {
  SDKControlInitializeRequestSchema,
  SDKControlInterruptRequestSchema,
  SDKControlPermissionRequestSchema,
  SDKControlRequestEnvelopeSchema,
  SDKControlRequestInnerSchema,
  StdinMessageSchema
} from '../index';

describe('@suga/ai-sdk — 控制协议Schema', () => {
  it('初始化请求schema校验', () => {
    const result = SDKControlInitializeRequestSchema.safeParse({
      subtype: 'initialize',
      append_system_prompt: 'Be helpful'
    });
    expect(result.success).toBe(true);
  });

  it('权限请求schema校验', () => {
    const result = SDKControlPermissionRequestSchema.safeParse({
      subtype: 'can_use_tool',
      tool_name: 'bash',
      input: { command: 'ls' },
      tool_use_id: 'toolu_001'
    });
    expect(result.success).toBe(true);
  });

  it('中断请求schema校验', () => {
    const result = SDKControlInterruptRequestSchema.safeParse({
      subtype: 'interrupt'
    });
    expect(result.success).toBe(true);
  });

  it('控制请求内部联合schema — discriminate', () => {
    const initResult = SDKControlRequestInnerSchema.safeParse({
      subtype: 'initialize'
    });
    expect(initResult.success).toBe(true);

    const permResult = SDKControlRequestInnerSchema.safeParse({
      subtype: 'can_use_tool',
      tool_name: 'bash',
      input: {},
      tool_use_id: '001'
    });
    expect(permResult.success).toBe(true);
  });

  it('控制请求信封schema校验', () => {
    const result = SDKControlRequestEnvelopeSchema.safeParse({
      type: 'control_request',
      request_id: 'req_001',
      request: { subtype: 'interrupt' }
    });
    expect(result.success).toBe(true);
  });

  it('stdin消息schema — update_env_vars', () => {
    const result = StdinMessageSchema.safeParse({
      type: 'update_env_vars',
      env_vars: { NODE_ENV: 'production' }
    });
    expect(result.success).toBe(true);
  });
});
