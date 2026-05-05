/** fetchSystemPrompt 测试 — system prompt 组装（含 Memory 注入） */

import { describe, expect, it } from 'vitest';
import { createSystemPrompt } from '@suga/ai-agent-loop';
import { MockMemoryStorageProvider } from '@suga/ai-memory';
import type { RuntimeConfig } from '../types/config';
import { fetchSystemPrompt } from '../sdk/fetchSystemPrompt';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

const mockFsProvider = new MockFileSystemProvider();

/** 创建最小测试配置 */
function createTestConfig(): RuntimeConfig {
  return {
    provider: {
      async *callModel() {},
      async callModelOnce() {
        return { content: '' };
      },
      formatToolDefinition: () => ({ name: 'test', description: 'mock', inputSchema: {} })
    },
    fsProvider: mockFsProvider
  };
}

describe('fetchSystemPrompt', () => {
  it('无配置 → 默认 system prompt', async () => {
    const config = createTestConfig();
    const prompt = await fetchSystemPrompt(config);

    expect(prompt.length).toBe(1);
    expect(prompt[0]).toBe('You are a helpful AI assistant.');
  });

  it('customSystemPrompt → 替代默认', async () => {
    const config: RuntimeConfig = {
      ...createTestConfig(),
      customSystemPrompt: 'Custom system prompt'
    };
    const prompt = await fetchSystemPrompt(config);

    expect(prompt.length).toBe(1);
    expect(prompt[0]).toBe('Custom system prompt');
  });

  it('appendSystemPrompt → 追加到末尾', async () => {
    const config: RuntimeConfig = {
      ...createTestConfig(),
      appendSystemPrompt: 'Additional instructions'
    };
    const prompt = await fetchSystemPrompt(config);

    expect(prompt.length).toBe(2);
    expect(prompt[0]).toBe('You are a helpful AI assistant.');
    expect(prompt[1]).toBe('Additional instructions');
  });

  it('customSystemPrompt + appendSystemPrompt → 2段', async () => {
    const config: RuntimeConfig = {
      ...createTestConfig(),
      customSystemPrompt: 'Custom prompt',
      appendSystemPrompt: 'Append prompt'
    };
    const prompt = await fetchSystemPrompt(config);

    expect(prompt.length).toBe(2);
    expect(prompt[0]).toBe('Custom prompt');
    expect(prompt[1]).toBe('Append prompt');
  });

  it('预计算 systemPrompt → 直接返回（跳过组装）', async () => {
    const precomputed = createSystemPrompt(['Pre-computed prompt']);
    const config: RuntimeConfig = {
      ...createTestConfig(),
      systemPrompt: precomputed,
      customSystemPrompt: 'This should be ignored'
    };
    const prompt = await fetchSystemPrompt(config);

    expect(prompt).toBe(precomputed);
    expect(prompt[0]).toBe('Pre-computed prompt');
  });

  it('memoryConfig 三件套 → 注入 memory 段落', async () => {
    const memoryProvider = new MockMemoryStorageProvider();
    memoryProvider.addFile('/test/memory/MEMORY.md', '# Memory\n\nKey insight about the project.');
    // buildMemoryPrompt 需要 autoMemPath 目录存在
    memoryProvider.addFile('/test/memory/.dir', '');

    const config: RuntimeConfig = {
      ...createTestConfig(),
      memoryConfig: { mode: 'individual' },
      memoryProvider,
      memoryPathConfig: {
        baseDir: '/test',
        projectRoot: '/test/project',
        sanitizedGitRoot: 'project'
      }
    };
    const prompt = await fetchSystemPrompt(config);

    expect(prompt.length).toBe(2);
    expect(prompt[0]).toBe('You are a helpful AI assistant.');
    // 第二段应包含 memory 提示段落（以 ## Memory 开头）
    expect(prompt[1]).toContain('## Memory');
  });

  it('memoryConfig 缺少 provider → 不注入 memory', async () => {
    const config: RuntimeConfig = {
      ...createTestConfig(),
      memoryConfig: { mode: 'individual' }
      // 缺少 memoryProvider 和 memoryPathConfig
    };
    const prompt = await fetchSystemPrompt(config);

    expect(prompt.length).toBe(1);
    expect(prompt[0]).toBe('You are a helpful AI assistant.');
  });

  it('custom + memory + append → 3段完整组装', async () => {
    const memoryProvider = new MockMemoryStorageProvider();
    memoryProvider.addFile('/test/memory/MEMORY.md', 'Remember: always use TypeScript');
    memoryProvider.addFile('/test/memory/.dir', '');

    const config: RuntimeConfig = {
      ...createTestConfig(),
      customSystemPrompt: 'You are an expert developer.',
      memoryConfig: { mode: 'individual' },
      memoryProvider,
      memoryPathConfig: {
        baseDir: '/test',
        projectRoot: '/test/project',
        sanitizedGitRoot: 'project'
      },
      appendSystemPrompt: 'Always respond in Chinese.'
    };
    const prompt = await fetchSystemPrompt(config);

    expect(prompt.length).toBe(3);
    expect(prompt[0]).toBe('You are an expert developer.');
    expect(prompt[1]).toContain('## Memory');
    expect(prompt[2]).toBe('Always respond in Chinese.');
  });
});
