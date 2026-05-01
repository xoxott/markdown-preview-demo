/** Settings 三层缓存 + 回环保护测试 */

import { describe, expect, it } from 'vitest';
import {
  createEmptySettingsCache,
  invalidateSettingsCache,
  invalidateSettingsParseCache,
  invalidateSettingsSourceCache,
  isInternalWriteProtection
} from '../types/settings-cache';

describe('createEmptySettingsCache', () => {
  it('创建空缓存 → mergedCache=null, perSourceCache空, parseFileCache空', () => {
    const cache = createEmptySettingsCache();
    expect(cache.mergedCache).toBeNull();
    expect(cache.perSourceCache.size).toBe(0);
    expect(cache.parseFileCache.size).toBe(0);
  });
});

describe('invalidateSettingsCache', () => {
  it('全量失效 → 返回空缓存', () => {
    const cache = createEmptySettingsCache();
    const result = invalidateSettingsCache(cache);
    expect(result.mergedCache).toBeNull();
    expect(result.perSourceCache.size).toBe(0);
  });
});

describe('invalidateSettingsSourceCache', () => {
  it('单层失效 → 清除该层 + mergedCache=null', () => {
    const cache = createEmptySettingsCache();
    // 添加一个 mock 源
    const newPerSource = new Map(cache.perSourceCache);
    newPerSource.set('project', {
      metadata: { layer: 'project', path: '/project/settings.json', exists: true },
      content: { permissions: { allow: ['Read'] } }
    });
    const populated = { ...cache, perSourceCache: newPerSource, mergedCache: {} as any };
    const result = invalidateSettingsSourceCache(populated, 'project');
    expect(result.perSourceCache.has('project')).toBe(false);
    expect(result.mergedCache).toBeNull();
    expect(result.parseFileCache.size).toBe(0); // parseFileCache 保留
  });
});

describe('invalidateSettingsParseCache', () => {
  it('文件解析缓存失效 → 清除指定路径', () => {
    const cache = createEmptySettingsCache();
    const newParseFile = new Map(cache.parseFileCache);
    newParseFile.set('/project/settings.json', { content: {}, timestamp: Date.now() });
    const populated = { ...cache, parseFileCache: newParseFile, mergedCache: {} as any };
    const result = invalidateSettingsParseCache(populated, '/project/settings.json');
    expect(result.parseFileCache.has('/project/settings.json')).toBe(false);
    expect(result.mergedCache).toBeNull();
  });
});

describe('isInternalWriteProtection', () => {
  it('5s内写入 → 保护生效', () => {
    const now = Date.now();
    expect(isInternalWriteProtection(now - 3000, now)).toBe(true); // 3s前
  });

  it('超过5s → 保护失效', () => {
    const now = Date.now();
    expect(isInternalWriteProtection(now - 6000, now)).toBe(false); // 6s前
  });

  it('自定义保护窗口', () => {
    const now = Date.now();
    expect(isInternalWriteProtection(now - 3000, now, 10000)).toBe(true); // 10s窗口
    expect(isInternalWriteProtection(now - 12000, now, 10000)).toBe(false); // 超出10s
  });
});
