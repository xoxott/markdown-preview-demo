/** @suga/ai-tools — ConfigTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ConfigInput } from '../types/tool-inputs';
import { InMemoryConfigProvider } from '../provider/InMemoryConfigProvider';
import { configTool } from '../tools/config';

function createContext(provider?: InMemoryConfigProvider): ExtendedToolUseContext {
  const configProvider = provider ?? new InMemoryConfigProvider();
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test',
    fsProvider: {} as any,
    configProvider
  };
}

describe('ConfigTool', () => {
  it('GET(已有设置) → 返回值', async () => {
    const provider = new InMemoryConfigProvider();
    provider.setSettingDirect('theme', 'dark');
    const result = await configTool.call(
      { setting: 'theme' } as ConfigInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.operation).toBe('get');
    expect(result.data.value).toBe('dark');
  });

  it('GET(不存在设置) → 返回null', async () => {
    const provider = new InMemoryConfigProvider();
    const result = await configTool.call(
      { setting: 'nonexistent' } as ConfigInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.operation).toBe('get');
    expect(result.data.value).toBe(null);
  });

  it('SET(新设置) → 创建+返回previousValue=null', async () => {
    const provider = new InMemoryConfigProvider();
    const result = await configTool.call(
      { setting: 'model', value: 'claude-4' } as ConfigInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.operation).toBe('set');
    expect(result.data.previousValue).toBe(null);
    expect(result.data.newValue).toBe('claude-4');
  });

  it('SET(更新设置) → 返回previousValue+newValue', async () => {
    const provider = new InMemoryConfigProvider();
    provider.setSettingDirect('model', 'claude-3');
    const result = await configTool.call(
      { setting: 'model', value: 'claude-4' } as ConfigInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.previousValue).toBe('claude-3');
    expect(result.data.newValue).toBe('claude-4');
  });

  it('SET(boolean值) → 正确处理', async () => {
    const provider = new InMemoryConfigProvider();
    const result = await configTool.call(
      { setting: 'verbose', value: true } as ConfigInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.newValue).toBe(true);
  });

  it('config(无provider) → 返回错误', async () => {
    const result = await configTool.call(
      { setting: 'theme' } as ConfigInput,
      {
        abortController: new AbortController(),
        tools: {} as ToolRegistry,
        sessionId: 'test',
        fsProvider: {} as any
      } as ExtendedToolUseContext
    );
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('not available');
  });

  it('isReadOnly(GET) → true', () => {
    expect(configTool.isReadOnly!({ setting: 'theme' } as ConfigInput)).toBe(true);
  });

  it('isReadOnly(SET) → false', () => {
    expect(configTool.isReadOnly!({ setting: 'theme', value: 'dark' } as ConfigInput)).toBe(false);
  });

  it('safetyLabel(GET) → readonly', () => {
    expect(configTool.safetyLabel!({ setting: 'theme' } as ConfigInput)).toBe('readonly');
  });

  it('safetyLabel(SET) → system', () => {
    expect(configTool.safetyLabel!({ setting: 'theme', value: 'dark' } as ConfigInput)).toBe(
      'system'
    );
  });

  it('checkPermissions(GET) → allow', () => {
    const ctx = createContext();
    const result = configTool.checkPermissions!({ setting: 'theme' } as ConfigInput, ctx);
    expect(result.behavior).toBe('allow');
  });

  it('checkPermissions(SET) → ask', () => {
    const ctx = createContext();
    const result = configTool.checkPermissions!(
      { setting: 'theme', value: 'dark' } as ConfigInput,
      ctx
    );
    expect(result.behavior).toBe('ask');
  });
});
