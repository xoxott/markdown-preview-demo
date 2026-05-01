/** @suga/ai-sdk — Zod Schema聚合验证 */

import { describe, expect, it } from 'vitest';
import {
  AgentDefinitionConfigSchema,
  BashInputSchema,
  ExitReasonSchema,
  GlobInputSchema,
  HookEventSchema,
  McpStdioServerConfigSchema,
  OutputFormatSchema,
  PermissionModeSchema,
  SDKAssistantMessageSchema,
  SDKResultMessageSchema,
  SDKSessionInfoSchema,
  SDKStatusMessageSchema,
  SDKSystemMessageSchema,
  SDKUserMessageSchema,
  SandboxSettingsSchema,
  ThinkingConfigSchema
} from '../index';

describe('@suga/ai-sdk — Zod Schema聚合', () => {
  it('MCP配置schema可用 + 校验', () => {
    const result = McpStdioServerConfigSchema.safeParse({
      command: 'node',
      args: ['server.js'],
      env: {}
    });
    expect(result.success).toBe(true);
  });

  it('GlobInputSchema可用 + 校验', () => {
    const result = GlobInputSchema.safeParse({
      pattern: '**/*.ts',
      path: '/tmp'
    });
    expect(result.success).toBe(true);
  });

  it('BashInputSchema可用 + 校验', () => {
    const result = BashInputSchema.safeParse({
      command: 'echo hello',
      timeout: 5000
    });
    expect(result.success).toBe(true);
  });

  it('HookEventSchema校验', () => {
    expect(HookEventSchema.safeParse('PreToolUse').success).toBe(true);
    expect(HookEventSchema.safeParse('InvalidEvent').success).toBe(false);
  });

  it('PermissionModeSchema校验', () => {
    expect(PermissionModeSchema.safeParse('default').success).toBe(true);
    expect(PermissionModeSchema.safeParse('bypassPermissions').success).toBe(true);
    expect(PermissionModeSchema.safeParse('invalid').success).toBe(false);
  });

  it('ExitReasonSchema校验', () => {
    expect(ExitReasonSchema.safeParse('complete').success).toBe(true);
    expect(ExitReasonSchema.safeParse('unknown').success).toBe(false);
  });

  it('SDKUserMessageSchema校验', () => {
    const result = SDKUserMessageSchema.safeParse({
      type: 'user',
      message: { role: 'user', content: 'hello' }
    });
    expect(result.success).toBe(true);
  });

  it('SDKAssistantMessageSchema校验', () => {
    const result = SDKAssistantMessageSchema.safeParse({
      type: 'assistant',
      message: { role: 'assistant', content: 'response' }
    });
    expect(result.success).toBe(true);
  });

  it('SDKResultMessageSchema — success', () => {
    const result = SDKResultMessageSchema.safeParse({
      type: 'result',
      subtype: 'success',
      result: 'done',
      duration_ms: 100,
      is_error: false,
      num_turns: 1
    });
    expect(result.success).toBe(true);
  });

  it('SDKResultMessageSchema — error', () => {
    const result = SDKResultMessageSchema.safeParse({
      type: 'result',
      subtype: 'error',
      error: 'something failed',
      duration_ms: 100,
      num_turns: 1
    });
    expect(result.success).toBe(true);
  });

  it('SDKSystemMessageSchema校验', () => {
    const result = SDKSystemMessageSchema.safeParse({
      type: 'system',
      subtype: 'init',
      cwd: '/home/user/project',
      tools: ['Read', 'Write'],
      model: 'claude-sonnet-4-6',
      permissionMode: 'default',
      slash_commands: [],
      mcp_servers: []
    });
    expect(result.success).toBe(true);
  });

  it('SDKStatusMessageSchema校验', () => {
    const result = SDKStatusMessageSchema.safeParse({
      type: 'status',
      status: 'running'
    });
    expect(result.success).toBe(true);
  });

  it('SDKSessionInfoSchema校验', () => {
    const result = SDKSessionInfoSchema.safeParse({
      sessionId: 'sess_001',
      lastModified: Date.now(),
      fileSize: 1024
    });
    expect(result.success).toBe(true);
  });

  it('AgentDefinitionConfigSchema校验', () => {
    const result = AgentDefinitionConfigSchema.safeParse({
      name: 'my-agent',
      description: 'A test agent',
      prompt: 'Do stuff'
    });
    expect(result.success).toBe(true);
  });

  it('SandboxSettingsSchema校验', () => {
    const result = SandboxSettingsSchema.safeParse({
      network: { deny: ['evil.com'] },
      filesystem: { allow: ['/tmp'] }
    });
    expect(result.success).toBe(true);
  });

  it('OutputFormatSchema校验', () => {
    expect(OutputFormatSchema.safeParse({ type: 'text' }).success).toBe(true);
    expect(OutputFormatSchema.safeParse({ type: 'json_schema', schema: { a: 1 } }).success).toBe(
      true
    );
  });

  it('ThinkingConfigSchema校验', () => {
    expect(ThinkingConfigSchema.safeParse({ type: 'enabled', budget_tokens: 5000 }).success).toBe(
      true
    );
    expect(ThinkingConfigSchema.safeParse({ type: 'disabled' }).success).toBe(true);
  });
});
