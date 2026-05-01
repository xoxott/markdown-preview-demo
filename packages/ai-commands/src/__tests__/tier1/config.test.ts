/** /config 命令测试 — prompt builders + SkillDefinition + ConfigProvider */

import { describe, expect, it } from 'vitest';
import {
  buildConfigGetPrompt,
  buildConfigListPrompt,
  buildConfigResetPrompt,
  buildConfigSetPrompt,
  configSkill
} from '../../commands/tier1/config';
import { MockConfigProvider } from '../mocks/MockConfigProvider';

describe('buildConfigListPrompt — 纯函数', () => {
  it('配置节列表 → 格式化', () => {
    const prompt = buildConfigListPrompt({
      sections: [
        { key: 'model', value: 'sonnet', source: 'project' },
        { key: 'permissions.mode', value: 'default', source: 'default', description: 'Perm mode' }
      ]
    });
    expect(prompt).toContain('model');
    expect(prompt).toContain('sonnet');
    expect(prompt).toContain('[project]');
  });
});

describe('buildConfigGetPrompt — 纯函数', () => {
  it('存在的值 → 显示配置', () => {
    const prompt = buildConfigGetPrompt({
      key: 'model',
      value: { key: 'model', value: 'sonnet', source: 'user' }
    });
    expect(prompt).toContain('model');
    expect(prompt).toContain('sonnet');
  });

  it('不存在的值 → 提示未设置', () => {
    const prompt = buildConfigGetPrompt({ key: 'unknown', value: undefined });
    expect(prompt).toContain('not set');
  });
});

describe('buildConfigSetPrompt — 纯函数', () => {
  it('set 结果 → 确认设置', () => {
    const prompt = buildConfigSetPrompt({ key: 'model', value: 'haiku' });
    expect(prompt).toContain('model');
    expect(prompt).toContain('haiku');
  });
});

describe('buildConfigResetPrompt — 纯函数', () => {
  it('reset 结果 → 确认重置', () => {
    const prompt = buildConfigResetPrompt({ key: 'permissions.mode' });
    expect(prompt).toContain('permissions.mode');
    expect(prompt).toContain('reset');
  });
});

describe('configSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(configSkill.name).toBe('config');
    expect(configSkill.aliases).toContain('cfg');
  });

  it('无 configProvider → 返回错误', async () => {
    const result = await configSkill.getPromptForCommand('list', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('ConfigProvider');
  });

  it('list 子命令 → 列出配置', async () => {
    const configProvider = new MockConfigProvider();
    const result = await configSkill.getPromptForCommand('list', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      configProvider
    } as any);
    expect(result.content).toContain('Configuration');
  });

  it('get 子命令 → 获取配置值', async () => {
    const configProvider = new MockConfigProvider();
    const result = await configSkill.getPromptForCommand('get model', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      configProvider
    } as any);
    expect(result.content).toContain('model');
  });

  it('set 子命令 → 设置配置值', async () => {
    const configProvider = new MockConfigProvider();
    const result = await configSkill.getPromptForCommand('set permissions.mode auto', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      configProvider
    } as any);
    expect(result.content).toContain('permissions.mode');
    expect(result.content).toContain('auto');
  });

  it('reset 子命令 → 重置配置', async () => {
    const configProvider = new MockConfigProvider();
    const result = await configSkill.getPromptForCommand('reset permissions.mode', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      configProvider
    } as any);
    expect(result.content).toContain('reset');
  });
});
