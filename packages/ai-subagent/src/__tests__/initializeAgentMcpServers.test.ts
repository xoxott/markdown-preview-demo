/** G18: initializeAgentMcpServers + ScopedMcpResourceProvider 测试 */

import { describe, expect, it } from 'vitest';
import type {
  McpResourceContent,
  McpResourceEntry,
  McpResourceProvider
} from '@suga/ai-tools/types/mcp-resource-provider';
import {
  ScopedMcpResourceProvider,
  initializeAgentMcpServers
} from '../core/initializeAgentMcpServers';
import type { SubagentDefinition } from '../types/subagent';

/** Mock McpResourceProvider */
class MockMcpProvider implements McpResourceProvider {
  private entries: McpResourceEntry[] = [
    { server: 'github', name: 'repo-list', uri: 'github://repos', description: 'List repos' },
    {
      server: 'slack',
      name: 'channel-list',
      uri: 'slack://channels',
      description: 'List channels'
    },
    { server: 'filesystem', name: 'file-list', uri: 'fs://files', description: 'List files' }
  ];

  private contents: Map<string, McpResourceContent> = new Map([
    ['github://repos', { uri: 'github://repos', mimeType: 'text/plain', text: 'repo1, repo2' }],
    [
      'slack://channels',
      { uri: 'slack://channels', mimeType: 'text/plain', text: 'channel1, channel2' }
    ]
  ]);

  async listResources(server?: string): Promise<McpResourceEntry[]> {
    if (server) return this.entries.filter(e => e.server === server);
    return this.entries;
  }

  async readResource(_server: string, uri: string): Promise<McpResourceContent> {
    const content = this.contents.get(uri);
    if (!content) throw new Error(`Resource not found: ${uri}`);
    return content;
  }
}

describe('ScopedMcpResourceProvider', () => {
  it('listResources(无server) → 只返回允许的服务器', async () => {
    const inner = new MockMcpProvider();
    const scoped = new ScopedMcpResourceProvider(inner, ['github', 'slack']);
    const resources = await scoped.listResources();
    expect(resources.length).toBe(2);
    expect(resources.every(r => r.server === 'github' || r.server === 'slack')).toBe(true);
  });

  it('listResources(指定server) → 过滤', async () => {
    const inner = new MockMcpProvider();
    const scoped = new ScopedMcpResourceProvider(inner, ['github']);
    const resources = await scoped.listResources('github');
    expect(resources.length).toBe(1);
    expect(resources[0].server).toBe('github');
  });

  it('listResources(不允许的server) → 返回空', async () => {
    const inner = new MockMcpProvider();
    const scoped = new ScopedMcpResourceProvider(inner, ['github']);
    const resources = await scoped.listResources('slack');
    expect(resources.length).toBe(0);
  });

  it('readResource(允许的server) → 正常读取', async () => {
    const inner = new MockMcpProvider();
    const scoped = new ScopedMcpResourceProvider(inner, ['github']);
    const content = await scoped.readResource('github', 'github://repos');
    expect(content.text).toContain('repo1');
  });

  it('readResource(不允许的server) → throw Error', async () => {
    const inner = new MockMcpProvider();
    const scoped = new ScopedMcpResourceProvider(inner, ['github']);
    await expect(scoped.readResource('slack', 'slack://channels')).rejects.toThrow(
      'not accessible'
    );
  });
});

describe('initializeAgentMcpServers', () => {
  it('无 mcpServers → 继承全局 provider', () => {
    const inner = new MockMcpProvider();
    const def: SubagentDefinition = { agentType: 'explore' };
    const result = initializeAgentMcpServers(def, inner);
    expect(result.isScoped).toBe(false);
    expect(result.scopedProvider).toBe(inner); // 同一引用
    expect(result.accessibleServers.length).toBe(0);
  });

  it('空 mcpServers → 继承全局 provider', () => {
    const inner = new MockMcpProvider();
    const def: SubagentDefinition = { agentType: 'explore', mcpServers: [] };
    const result = initializeAgentMcpServers(def, inner);
    expect(result.isScoped).toBe(false);
  });

  it('有 mcpServers → 创建 scoped provider', () => {
    const inner = new MockMcpProvider();
    const def: SubagentDefinition = { agentType: 'explore', mcpServers: ['github'] };
    const result = initializeAgentMcpServers(def, inner);
    expect(result.isScoped).toBe(true);
    expect(result.accessibleServers).toEqual(['github']);
    expect(result.scopedProvider).toBeInstanceOf(ScopedMcpResourceProvider);
  });

  it('多个 mcpServers → scoped provider 过滤正确', async () => {
    const inner = new MockMcpProvider();
    const def: SubagentDefinition = { agentType: 'explore', mcpServers: ['github', 'slack'] };
    const result = initializeAgentMcpServers(def, inner);
    const resources = await result.scopedProvider.listResources();
    expect(resources.length).toBe(2);
    expect(resources.some(r => r.server === 'filesystem')).toBe(false);
  });
});
