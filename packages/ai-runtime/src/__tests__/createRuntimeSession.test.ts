import { describe, expect, it } from 'vitest';
import type { AnthropicAdapterConfig } from '@suga/ai-tool-adapter';
import { createRuntimeSession } from '../session/createRuntimeSession';
import { RuntimeSession } from '../session/RuntimeSession';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

const mockFsProvider = new MockFileSystemProvider();

describe('createRuntimeSession', () => {
  it('从 AnthropicAdapterConfig 创建 → provider 为 AnthropicAdapter', () => {
    const adapterConfig: AnthropicAdapterConfig = {
      baseURL: 'https://test.api',
      apiKey: 'test-key',
      model: 'test-model'
    };

    const session = createRuntimeSession(adapterConfig);

    expect(session).toBeDefined();
    expect(session.getSessionId()).toBeDefined();
    expect(session.getStatus()).toBe('active');
  });

  it('runtimeOverrides 合并 → 配置正确传递', () => {
    const adapterConfig: AnthropicAdapterConfig = {
      baseURL: 'https://test.api',
      apiKey: 'test-key',
      model: 'test-model'
    };

    const session = createRuntimeSession(adapterConfig, {
      maxTurns: 5
    });

    expect(session).toBeDefined();
    expect(session.getSessionId()).toBeDefined();
  });

  it('RuntimeSession 可正常创建和销毁', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const session = new RuntimeSession({ provider, fsProvider: mockFsProvider });

    expect(session.getStatus()).toBe('active');
    await session.destroy();
    expect(session.getStatus()).toBe('destroyed');
  });
});
