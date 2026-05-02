/** @suga/ai-tools — InMemoryConfigProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryConfigProvider } from '../provider/InMemoryConfigProvider';

describe('InMemoryConfigProvider', () => {
  it('getSetting(已设置) → 返回值', async () => {
    const provider = new InMemoryConfigProvider();
    provider.setSettingDirect('theme', 'dark');
    const value = await provider.getSetting('theme');
    expect(value).toBe('dark');
  });

  it('getSetting(未设置) → 返回null', async () => {
    const provider = new InMemoryConfigProvider();
    const value = await provider.getSetting('nonexistent');
    expect(value).toBe(null);
  });

  it('setSetting(新key) → previousValue=null', async () => {
    const provider = new InMemoryConfigProvider();
    const result = await provider.setSetting('model', 'claude-4');
    expect(result.success).toBe(true);
    expect(result.previousValue).toBe(null);
    expect(result.newValue).toBe('claude-4');
  });

  it('setSetting(更新key) → previousValue有值', async () => {
    const provider = new InMemoryConfigProvider();
    provider.setSettingDirect('model', 'claude-3');
    const result = await provider.setSetting('model', 'claude-4');
    expect(result.previousValue).toBe('claude-3');
    expect(result.newValue).toBe('claude-4');
  });

  it('listSettings → 返回所有配置', async () => {
    const provider = new InMemoryConfigProvider();
    provider.setSettingDirect('theme', 'dark');
    provider.setSettingDirect('model', 'claude-4');
    const entries = await provider.listSettings();
    expect(entries.length).toBe(2);
    expect(entries[0].source).toBe('project');
  });

  it('reset → 清空所有配置', async () => {
    const provider = new InMemoryConfigProvider();
    provider.setSettingDirect('theme', 'dark');
    provider.reset();
    const entries = await provider.listSettings();
    expect(entries).toEqual([]);
  });
});
