/** P56 测试 — ToolSearch Delta增量通知模式 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { buildTool } from '@suga/ai-tool-core';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { AgentMessage } from '@suga/ai-agent-loop';
import {
  buildDeferredToolsSystemReminder,
  checkAutoThreshold,
  getDeferredToolsDelta,
  getToolSearchMode,
  isModelSupportToolReference,
  isToolSearchEnabled,
  isToolSearchEnabledOptimistic
} from '../tools/tool-search-delta';

// ============================================================
// ToolSearch Mode 判定
// ============================================================

describe('getToolSearchMode', () => {
  it('未设置 → tst（默认）', () => {
    expect(getToolSearchMode(undefined)).toBe('tst');
    expect(getToolSearchMode('')).toBe('tst');
  });

  it('false → standard（禁用）', () => {
    expect(getToolSearchMode('false')).toBe('standard');
  });

  it('true → tst（始终延迟）', () => {
    expect(getToolSearchMode('true')).toBe('tst');
  });

  it('auto → tst-auto', () => {
    expect(getToolSearchMode('auto')).toBe('tst-auto');
  });

  it('auto:0 → tst', () => {
    expect(getToolSearchMode('auto:0')).toBe('tst');
  });

  it('auto:10 → tst-auto', () => {
    expect(getToolSearchMode('auto:10')).toBe('tst-auto');
  });
});

// ============================================================
// 模型支持判定
// ============================================================

describe('isModelSupportToolReference', () => {
  it('haiku 不支持', () => {
    expect(isModelSupportToolReference('claude-3-haiku')).toBe(false);
    expect(isModelSupportToolReference('claude-haiku-4-5')).toBe(false);
  });

  it('sonnet/opus 支持', () => {
    expect(isModelSupportToolReference('claude-sonnet-4-6')).toBe(true);
    expect(isModelSupportToolReference('claude-opus-4-6')).toBe(true);
  });

  it('未知模型默认支持', () => {
    expect(isModelSupportToolReference('unknown-model')).toBe(true);
  });
});

// ============================================================
// ToolSearch 启用判定
// ============================================================

describe('isToolSearchEnabledOptimistic', () => {
  it('standard模式 → false', () => {
    expect(isToolSearchEnabledOptimistic('standard')).toBe(false);
  });

  it('tst模式 + 明确配置 → true', () => {
    expect(isToolSearchEnabledOptimistic('tst', 'true')).toBe(true);
  });

  it('tst模式 + 未配置 + 第一方 → true', () => {
    expect(isToolSearchEnabledOptimistic('tst', undefined, true)).toBe(true);
  });

  it('tst模式 + 未配置 + 非第一方 → false', () => {
    expect(isToolSearchEnabledOptimistic('tst', undefined, false)).toBe(false);
  });
});

describe('isToolSearchEnabled', () => {
  it('standard → false', () => {
    expect(isToolSearchEnabled('standard', 'claude-sonnet-4-6')).toBe(false);
  });

  it('haiku模型 → false', () => {
    expect(isToolSearchEnabled('tst', 'claude-haiku')).toBe(false);
  });

  it('tst + sonnet + 明确配置 → true', () => {
    expect(isToolSearchEnabled('tst', 'claude-sonnet-4-6', 'true')).toBe(true);
  });
});

// ============================================================
// 自动阈值检查
// ============================================================

describe('checkAutoThreshold', () => {
  const tools: AnyBuiltTool[] = [
    buildTool({
      name: 'bash',
      inputSchema: z.object({ command: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Execute bash',
      alwaysLoad: true
    }),
    buildTool({
      name: 'mcp__slack__send_message',
      inputSchema: z.object({ channel: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Send Slack message',
      searchHint: 'slack messaging communication'
    }),
    buildTool({
      name: 'mcp__github__create_issue',
      inputSchema: z.object({ title: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Create GitHub issue'
    })
  ];

  it('无延迟工具 → false', () => {
    const alwaysLoadTools = [tools[0]]; // bash only (alwaysLoad)
    expect(checkAutoThreshold(alwaysLoadTools, 200_000)).toBe(false);
  });

  it('小上下文窗口 + 少延迟工具 → 可能不超过阈值', () => {
    // 10% threshold = 20_000 tokens = 50_000 chars
    expect(checkAutoThreshold(tools, 200_000)).toBe(false);
  });

  it('小上下文窗口 + 低百分比 → 超过阈值', () => {
    expect(checkAutoThreshold(tools, 100, 1)).toBe(true);
  });
});

// ============================================================
// getDeferredToolsDelta
// ============================================================

describe('getDeferredToolsDelta', () => {
  const bashTool = buildTool({
    name: 'bash',
    inputSchema: z.object({ command: z.string() }),
    call: async () => ({ data: '' }),
    description: async () => 'Execute bash',
    alwaysLoad: true
  });

  const mcpSlackTool = buildTool({
    name: 'mcp__slack__send_message',
    inputSchema: z.object({ channel: z.string() }),
    call: async () => ({ data: '' }),
    description: async () => 'Send Slack message'
  });

  const mcpGithubTool = buildTool({
    name: 'mcp__github__create_issue',
    inputSchema: z.object({ title: z.string() }),
    call: async () => ({ data: '' }),
    description: async () => 'Create GitHub issue'
  });

  it('首次调用 → 全部延迟工具为 added', () => {
    const tools = [bashTool, mcpSlackTool, mcpGithubTool];
    const messages: any[] = [];

    const delta = getDeferredToolsDelta(tools, messages);
    expect(delta).not.toBeNull();
    expect(delta!.addedNames).toEqual(['mcp__github__create_issue', 'mcp__slack__send_message']);
    expect(delta!.removedNames).toEqual([]);
  });

  it('无延迟工具 → null', () => {
    const tools = [bashTool]; // alwaysLoad=true, 不延迟
    const messages: any[] = [];

    const delta = getDeferredToolsDelta(tools, messages);
    expect(delta).toBeNull();
  });

  it('已有通知 → 新延迟工具仅为 added', () => {
    const tools = [bashTool, mcpSlackTool, mcpGithubTool];
    // P12: 使用 AssistantMessage.toolReferences 代替旧的 metadata 伪实现
    const messages: AgentMessage[] = [
      {
        role: 'assistant',
        content: '',
        toolUses: [],
        toolReferences: [{ toolUseId: 'ref_1', name: 'mcp__slack__send_message', input: {} }]
      }
    ];

    const delta = getDeferredToolsDelta(tools, messages);
    expect(delta).not.toBeNull();
    expect(delta!.addedNames).toEqual(['mcp__github__create_issue']);
    expect(delta!.removedNames).toEqual([]);
  });

  it('延迟工具被解除 → 不报告为 removed（静默）', () => {
    // slack 工具之前延迟但现在 alwaysLoad → 不再延迟
    const slackNowLoaded = buildTool({
      name: 'mcp__slack__send_message',
      inputSchema: z.object({ channel: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Send Slack message',
      alwaysLoad: true // 已解除延迟
    });

    const tools = [bashTool, slackNowLoaded];
    // P12: 使用 AssistantMessage.toolReferences 代替旧的 metadata 伪实现
    const messages: AgentMessage[] = [
      {
        role: 'assistant',
        content: '',
        toolUses: [],
        toolReferences: [{ toolUseId: 'ref_1', name: 'mcp__slack__send_message', input: {} }]
      }
    ];

    const delta = getDeferredToolsDelta(tools, messages);
    // slack 不再延迟但在工具池中 → 静默（不报告为 removed）
    expect(delta).toBeNull();
  });

  it('工具完全不在池中 → 报告为 removed', () => {
    const tools = [bashTool]; // 没有 slack/github
    // P12: 使用 AssistantMessage.toolReferences 代替旧的 metadata 伪实现
    const messages: AgentMessage[] = [
      {
        role: 'assistant',
        content: '',
        toolUses: [],
        toolReferences: [{ toolUseId: 'ref_1', name: 'mcp__slack__send_message', input: {} }]
      }
    ];

    const delta = getDeferredToolsDelta(tools, messages);
    expect(delta).not.toBeNull();
    expect(delta!.addedNames).toEqual([]);
    expect(delta!.removedNames).toEqual(['mcp__slack__send_message']);
  });
});

// ============================================================
// buildDeferredToolsSystemReminder
// ============================================================

describe('buildDeferredToolsSystemReminder', () => {
  const mcpSlackTool = buildTool({
    name: 'mcp__slack__send_message',
    inputSchema: z.object({ channel: z.string() }),
    call: async () => ({ data: '' }),
    description: async () => 'Send Slack message'
  });

  const mcpGithubTool = buildTool({
    name: 'mcp__github__create_issue',
    inputSchema: z.object({ title: z.string() }),
    call: async () => ({ data: '' }),
    description: async () => 'Create GitHub issue'
  });

  it('delta模式 + null → null', () => {
    expect(buildDeferredToolsSystemReminder(null, [mcpSlackTool], 'delta')).toBeNull();
  });

  it('delta模式 + 有added → 生成新增通知', () => {
    const delta = {
      addedNames: ['mcp__github__create_issue'],
      addedLines: ['mcp__github__create_issue'],
      removedNames: []
    };
    const result = buildDeferredToolsSystemReminder(delta, [mcpSlackTool], 'delta');
    expect(result).toContain('New deferred tools available');
    expect(result).toContain('mcp__github__create_issue');
  });

  it('delta模式 + 有removed → 生成移除通知', () => {
    const delta = {
      addedNames: [],
      addedLines: [],
      removedNames: ['mcp__slack__send_message']
    };
    const result = buildDeferredToolsSystemReminder(delta, [mcpGithubTool], 'delta');
    expect(result).toContain('Previously deferred tools no longer available');
    expect(result).toContain('mcp__slack__send_message');
  });

  it('standard模式 + 无延迟工具 → null', () => {
    const bashTool = buildTool({
      name: 'bash',
      inputSchema: z.object({ command: z.string() }),
      call: async () => ({ data: '' }),
      description: async () => 'Execute bash',
      alwaysLoad: true
    });
    expect(buildDeferredToolsSystemReminder(null, [bashTool], 'standard')).toBeNull();
  });

  it('standard模式 + 有延迟工具 → 全量列表', () => {
    const result = buildDeferredToolsSystemReminder(
      null,
      [mcpSlackTool, mcpGithubTool],
      'standard'
    );
    expect(result).toContain('Available deferred tools');
    expect(result).toContain('mcp__slack__send_message');
    expect(result).toContain('mcp__github__create_issue');
  });
});
