/** buildEffectiveToolRegistry P99 测试 — Delta ToolSearch 分离逻辑 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ToolRegistry, buildTool } from '@suga/ai-tool-core';
import {
  type ToolSearchRegistryResult,
  buildEffectiveToolRegistry
} from '../factory/buildEffectiveToolRegistry';
import type { RuntimeConfig } from '../types/config';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

const mockFsProvider = new MockFileSystemProvider();
const mockProvider = new MockLLMProvider();

/** 辅助：创建 alwaysLoad 工具 */
function createAlwaysLoadTool(name: string) {
  return buildTool({
    name: name.toLowerCase(),
    inputSchema: z.object({}),
    call: async () => ({ data: `${name} result` }),
    description: async () => `${name} tool`,
    alwaysLoad: true
  });
}

/** 辅助：创建 deferred 工具 */
function createDeferredTool(name: string) {
  return buildTool({
    name: name.toLowerCase(),
    inputSchema: z.object({}),
    call: async () => ({ data: `${name} result` }),
    description: async () => `${name} tool`,
    shouldDefer: true
  });
}

/** 辅助：创建 MCP deferred 工具 */
function createMcpTool(server: string, toolName: string) {
  const fullName = `mcp__${server}__${toolName}`;
  return buildTool({
    name: fullName,
    inputSchema: z.object({}),
    call: async () => ({ data: `${fullName} result` }),
    description: async () => `${fullName} tool`
    // mcp__ 前缀自动 deferred
  });
}

/** 辅助：创建最小配置 */
function createConfig(extra?: Partial<RuntimeConfig>): RuntimeConfig {
  return { provider: mockProvider, fsProvider: mockFsProvider, ...extra };
}

describe('buildEffectiveToolRegistry P99', () => {
  it('无 enableToolSearch → 起原逻辑（全注册）', () => {
    const registry = new ToolRegistry();
    registry.register(createAlwaysLoadTool('Read'));
    registry.register(createDeferredTool('deploy'));

    const result = buildEffectiveToolRegistry(createConfig({ toolRegistry: registry }));

    // 返回普通 ToolRegistry（不是 ToolSearchRegistryResult）
    expect(result).toBeDefined();
    expect('deferredTools' in result!).toBe(false);

    const allTools = (result as ToolRegistry).getAll();
    expect(allTools.length).toBe(2);
    expect(allTools.some(t => t.name === 'read')).toBe(true);
    expect(allTools.some(t => t.name === 'deploy')).toBe(true);
  });

  it('enableToolSearch="false" → standard 模式（全注册）', () => {
    const registry = new ToolRegistry();
    registry.register(createAlwaysLoadTool('Read'));
    registry.register(createDeferredTool('deploy'));

    const result = buildEffectiveToolRegistry(
      createConfig({
        toolRegistry: registry,
        enableToolSearch: 'false'
      })
    );

    expect(result).toBeDefined();
    expect('deferredTools' in result!).toBe(false);

    const allTools = (result as ToolRegistry).getAll();
    expect(allTools.length).toBe(2);
  });

  it('enableToolSearch="true" → ToolSearchRegistryResult（分离 alwaysLoad + deferred）', () => {
    const registry = new ToolRegistry();
    registry.register(createAlwaysLoadTool('Read'));
    registry.register(createAlwaysLoadTool('Edit'));
    registry.register(createDeferredTool('deploy'));
    registry.register(createMcpTool('slack', 'send'));

    const result = buildEffectiveToolRegistry(
      createConfig({
        toolRegistry: registry,
        enableToolSearch: 'true'
      })
    );

    expect(result).toBeDefined();
    expect('deferredTools' in result!).toBe(true);

    const tsResult = result as ToolSearchRegistryResult;

    // active registry 应包含 Read + Edit + tool-search（3个）
    const activeNames = tsResult.registry.getAll().map(t => t.name);
    expect(activeNames).toContain('read');
    expect(activeNames).toContain('edit');
    expect(activeNames).toContain('tool-search');
    expect(activeNames).not.toContain('deploy');
    expect(activeNames).not.toContain('mcp__slack__send');

    // deferred 池应包含 Deploy + mcp__slack__send（2个）
    expect(tsResult.deferredTools.length).toBe(2);
    expect(tsResult.deferredTools.some(t => t.name === 'deploy')).toBe(true);
    expect(tsResult.deferredTools.some(t => t.name === 'mcp__slack__send')).toBe(true);

    // searchMode 应为 'tst'
    expect(tsResult.searchMode).toBe('tst');
  });

  it('enableToolSearch="auto:10" → tst-auto 模式', () => {
    const registry = new ToolRegistry();
    registry.register(createAlwaysLoadTool('Read'));
    registry.register(createDeferredTool('deploy'));

    const result = buildEffectiveToolRegistry(
      createConfig({
        toolRegistry: registry,
        enableToolSearch: 'auto:10'
      })
    );

    expect(result).toBeDefined();
    expect('deferredTools' in result!).toBe(true);

    const tsResult = result as ToolSearchRegistryResult;
    expect(tsResult.searchMode).toBe('tst-auto');
  });

  it('无 toolRegistry → undefined（无论 enableToolSearch）', () => {
    const result = buildEffectiveToolRegistry(createConfig({ enableToolSearch: 'true' }));
    expect(result).toBeUndefined();
  });

  it('空 toolRegistry → ToolSearchRegistryResult 空 deferred 池', () => {
    const registry = new ToolRegistry();
    // 没有 deferred 工具

    const result = buildEffectiveToolRegistry(
      createConfig({
        toolRegistry: registry,
        enableToolSearch: 'true'
      })
    );

    expect(result).toBeDefined();
    expect('deferredTools' in result!).toBe(true);

    const tsResult = result as ToolSearchRegistryResult;
    // deferred 池为空
    expect(tsResult.deferredTools.length).toBe(0);
    // active registry 只有 tool-search
    expect(tsResult.registry.getAll().some(t => t.name === 'tool-search')).toBe(true);
  });

  it('deferred 工具不在 active registry 的 getAll() 结果中', () => {
    const registry = new ToolRegistry();
    registry.register(createDeferredTool('deploy'));
    registry.register(createAlwaysLoadTool('Read'));

    const result = buildEffectiveToolRegistry(
      createConfig({
        toolRegistry: registry,
        enableToolSearch: 'true'
      })
    );

    const tsResult = result as ToolSearchRegistryResult;
    const activeNames = tsResult.registry.getAll().map(t => t.name);

    // Deploy 不在 active registry 中
    expect(activeNames).not.toContain('deploy');
    // Read 在 active registry 中
    expect(activeNames).toContain('read');
    // tool-search 在 active registry 中
    expect(activeNames).toContain('tool-search');
  });
});
