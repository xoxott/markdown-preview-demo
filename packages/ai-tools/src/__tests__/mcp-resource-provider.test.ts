/** @suga/ai-tools — InMemoryMcpResourceProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryMcpResourceProvider } from '../provider/InMemoryMcpResourceProvider';

describe('InMemoryMcpResourceProvider', () => {
  it('listResources(指定server) → 返回该server资源', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerResource('github', { uri: 'gh://repo', name: 'Repo', mimeType: 'text/plain', server: 'github' });
    const resources = await provider.listResources('github');
    expect(resources.length).toBe(1);
    expect(resources[0].name).toBe('Repo');
  });

  it('listResources(无server) → 返回所有', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerResource('s1', { uri: 'r1', name: 'R1', server: 's1' });
    provider.registerResource('s2', { uri: 'r2', name: 'R2', server: 's2' });
    const resources = await provider.listResources();
    expect(resources.length).toBe(2);
  });

  it('readResource(存在) → 返回内容', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerContent('fs', 'fs://dir', { contents: [{ uri: 'fs://dir', text: 'Hello' }] });
    const content = await provider.readResource('fs', 'fs://dir');
    expect(content.contents[0].text).toBe('Hello');
  });

  it('readResource(不存在) → 返回空内容', async () => {
    const provider = new InMemoryMcpResourceProvider();
    const content = await provider.readResource('fs', 'nonexistent');
    expect(content.contents).toEqual([]);
  });

  it('reset → 清空所有', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerResource('s1', { uri: 'r1', name: 'R1', server: 's1' });
    provider.reset();
    const resources = await provider.listResources();
    expect(resources).toEqual([]);
  });

  it('多次注册同一server → 合并', async () => {
    const provider = new InMemoryMcpResourceProvider();
    provider.registerResource('s1', { uri: 'r1', name: 'R1', server: 's1' });
    provider.registerResource('s1', { uri: 'r2', name: 'R2', server: 's1' });
    const resources = await provider.listResources('s1');
    expect(resources.length).toBe(2);
  });
});