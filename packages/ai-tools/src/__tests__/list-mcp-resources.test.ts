/** @suga/ai-tools — ListMcpResourcesTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ListMcpResourcesInput } from '../types/tool-inputs';
import { InMemoryMcpResourceProvider } from '../provider/InMemoryMcpResourceProvider';
import { listMcpResourcesTool } from '../tools/list-mcp-resources';

function createContext(provider?: InMemoryMcpResourceProvider): ExtendedToolUseContext {
  const mcpResourceProvider = provider ?? new InMemoryMcpResourceProvider();
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test',
    fsProvider: {} as any,
    mcpResourceProvider
  };
}

describe('ListMcpResourcesTool', () => {
  it('list(指定server) → 返回该server资源', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerResource('github', { uri: 'gh://repo', name: 'Repo', server: 'github' });
    provider.registerResource('fs', { uri: 'fs://dir', name: 'Dir', server: 'fs' });
    const result = await listMcpResourcesTool.call(
      { server: 'github' } as ListMcpResourcesInput,
      createContext(provider)
    );
    expect(result.data.length).toBe(1);
    expect(result.data[0].server).toBe('github');
  });

  it('list(无server) → 返回所有server资源', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerResource('github', { uri: 'gh://repo', name: 'Repo', server: 'github' });
    provider.registerResource('fs', { uri: 'fs://dir', name: 'Dir', server: 'fs' });
    const result = await listMcpResourcesTool.call(
      {} as ListMcpResourcesInput,
      createContext(provider)
    );
    expect(result.data.length).toBe(2);
  });

  it('list(空server) → 返回所有', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerResource('s1', { uri: 'r1', name: 'R1', server: 's1' });
    const result = await listMcpResourcesTool.call(
      { server: undefined } as ListMcpResourcesInput,
      createContext(provider)
    );
    expect(result.data.length).toBe(1);
  });

  it('list(无provider) → 返回空列表', async () => {
    const result = await listMcpResourcesTool.call(
      {} as ListMcpResourcesInput,
      {
        abortController: new AbortController(),
        tools: {} as ToolRegistry,
        sessionId: 'test',
        fsProvider: {} as any
      } as ExtendedToolUseContext
    );
    expect(result.data).toEqual([]);
  });

  it('list(不存在server) → 返回空列表', async () => {
    const provider = new InMemoryMcpResourceProvider();
    const result = await listMcpResourcesTool.call(
      { server: 'nonexistent' } as ListMcpResourcesInput,
      createContext(provider)
    );
    expect(result.data).toEqual([]);
  });

  it('isReadOnly → true', () => {
    expect(listMcpResourcesTool.isReadOnly!({} as ListMcpResourcesInput)).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    expect(listMcpResourcesTool.safetyLabel!({} as ListMcpResourcesInput)).toBe('readonly');
  });

  it('isDestructive → false', () => {
    expect(listMcpResourcesTool.isDestructive!({} as ListMcpResourcesInput)).toBe(false);
  });
});
