/** @suga/ai-tools — ReadMcpResourceTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ReadMcpResourceInput } from '../types/tool-inputs';
import type { McpResourceContent } from '../types/mcp-resource-provider';
import { InMemoryMcpResourceProvider } from '../provider/InMemoryMcpResourceProvider';
import { readMcpResourceTool } from '../tools/read-mcp-resource';

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

describe('ReadMcpResourceTool', () => {
  it('read(存在资源) → 返回内容', async () => {
    const provider = new InMemoryMcpResourceProvider();
    const content: McpResourceContent = {
      contents: [{ uri: 'fs://dir', mimeType: 'text/plain', text: 'Hello' }]
    };
    provider.registerContent('fs', 'fs://dir', content);
    const result = await readMcpResourceTool.call(
      { server: 'fs', uri: 'fs://dir' } as ReadMcpResourceInput,
      createContext(provider)
    );
    expect(result.data.contents.length).toBe(1);
    expect(result.data.contents[0].text).toBe('Hello');
  });

  it('read(不存在资源) → 返回空内容', async () => {
    const provider = new InMemoryMcpResourceProvider();
    const result = await readMcpResourceTool.call(
      { server: 'fs', uri: 'nonexistent' } as ReadMcpResourceInput,
      createContext(provider)
    );
    expect(result.data.contents).toEqual([]);
  });

  it('read(无provider) → 返回空内容', async () => {
    const result = await readMcpResourceTool.call(
      { server: 'fs', uri: 'fs://dir' } as ReadMcpResourceInput,
      { abortController: new AbortController(), tools: {} as ToolRegistry, sessionId: 'test', fsProvider: {} as any } as ExtendedToolUseContext
    );
    expect(result.data.contents).toEqual([]);
  });

  it('validateInput(空server) → deny', () => {
    const ctx = createContext();
    const result = readMcpResourceTool.validateInput!({ server: '', uri: 'x' } as ReadMcpResourceInput, ctx);
    expect(result.behavior).toBe('deny');
  });

  it('validateInput(空uri) → deny', () => {
    const ctx = createContext();
    const result = readMcpResourceTool.validateInput!({ server: 'fs', uri: '' } as ReadMcpResourceInput, ctx);
    expect(result.behavior).toBe('deny');
  });

  it('isReadOnly → true', () => {
    expect(readMcpResourceTool.isReadOnly!({ server: 'fs', uri: 'x' } as ReadMcpResourceInput)).toBe(true);
  });

  it('safetyLabel → network', () => {
    expect(readMcpResourceTool.safetyLabel!({ server: 'fs', uri: 'x' } as ReadMcpResourceInput)).toBe('network');
  });

  it('isDestructive → false', () => {
    expect(readMcpResourceTool.isDestructive!({ server: 'fs', uri: 'x' } as ReadMcpResourceInput)).toBe(false);
  });
});