/** /mcp 命令测试 */

import { describe, expect, it } from 'vitest';
import {
  buildMcpAddPrompt,
  buildMcpListPrompt,
  buildMcpRemovePrompt,
  buildMcpRestartPrompt,
  mcpSkill
} from '../../commands/tier2/mcp';
import { MockMcpProvider } from '../mocks/MockMcpProvider';

describe('buildMcpListPrompt — 纯函数', () => {
  it('服务器列表 → 格式化', () => {
    const prompt = buildMcpListPrompt({
      servers: [{ name: 'filesystem', state: 'connected', configType: 'stdio' }]
    });
    expect(prompt).toContain('filesystem');
    expect(prompt).toContain('●');
  });

  it('空列表 → 提示无服务器', () => {
    const prompt = buildMcpListPrompt({ servers: [] });
    expect(prompt).toContain('No MCP servers');
  });
});

describe('buildMcpAddPrompt — 纯函数', () => {
  it('添加确认 → 包含名称和类型', () => {
    const prompt = buildMcpAddPrompt({ name: 'github', configType: 'stdio' });
    expect(prompt).toContain('github');
    expect(prompt).toContain('stdio');
  });
});

describe('buildMcpRemovePrompt — 纯函数', () => {
  it('删除确认 → 包含名称', () => {
    const prompt = buildMcpRemovePrompt({ name: 'postgres' });
    expect(prompt).toContain('postgres');
  });
});

describe('buildMcpRestartPrompt — 纯函数', () => {
  it('重启确认 → 包含名称', () => {
    const prompt = buildMcpRestartPrompt({ name: 'filesystem' });
    expect(prompt).toContain('filesystem');
  });
});

describe('mcpSkill — SkillDefinition', () => {
  it('name', () => {
    expect(mcpSkill.name).toBe('mcp');
  });

  it('无 mcpProvider → 返回错误', async () => {
    const result = await mcpSkill.getPromptForCommand('list', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('McpCommandProvider');
  });

  it('list 子命令 → 列出服务器', async () => {
    const mcpProvider = new MockMcpProvider();
    const result = await mcpSkill.getPromptForCommand('list', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      mcpProvider
    } as any);
    expect(result.content).toContain('MCP Servers');
  });

  it('add 子命令 → 添加服务器', async () => {
    const mcpProvider = new MockMcpProvider();
    const result = await mcpSkill.getPromptForCommand('add github stdio gh mcp', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      mcpProvider
    } as any);
    expect(result.content).toContain('github');
    expect(result.content).toContain('stdio');
  });

  it('remove 子命令 → 删除服务器', async () => {
    const mcpProvider = new MockMcpProvider();
    const result = await mcpSkill.getPromptForCommand('remove postgres', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      mcpProvider
    } as any);
    expect(result.content).toContain('postgres');
    expect(result.content).toContain('removed');
  });

  it('restart 子命令 → 重启服务器', async () => {
    const mcpProvider = new MockMcpProvider();
    const result = await mcpSkill.getPromptForCommand('restart filesystem', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      mcpProvider
    } as any);
    expect(result.content).toContain('filesystem');
    expect(result.content).toContain('restarted');
  });
});
