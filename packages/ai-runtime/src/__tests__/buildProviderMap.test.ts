/** buildProviderMap 测试 — 从 RuntimeConfig 提取 provider 字段 */

import { describe, expect, it } from 'vitest';
import { DefaultHttpProvider } from '@suga/ai-tools';
import type { RuntimeConfig } from '../types/config';
import { buildProviderMap } from '../factory/buildProviderMap';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 辅助：创建最小配置 */
function createMinimalConfig(): RuntimeConfig {
  return { provider: new MockLLMProvider(), fsProvider: new MockFileSystemProvider() };
}

describe('buildProviderMap', () => {
  it('最小配置 → fsProvider必填 + httpProvider默认DefaultHttpProvider', () => {
    const config = createMinimalConfig();
    const map = buildProviderMap(config);

    expect(map.fsProvider).toBe(config.fsProvider);
    expect(map.httpProvider).toBeInstanceOf(DefaultHttpProvider);
    expect(map.searchProvider).toBeUndefined();
    expect(map.taskStoreProvider).toBeUndefined();
  });

  it('传入httpProvider → 不使用默认DefaultHttpProvider', () => {
    const customHttp = new DefaultHttpProvider();
    const config: RuntimeConfig = {
      ...createMinimalConfig(),
      httpProvider: customHttp
    };
    const map = buildProviderMap(config);

    expect(map.httpProvider).toBe(customHttp);
  });

  it('传入全部可选provider → 全部存在于map', () => {
    const config: RuntimeConfig = {
      ...createMinimalConfig(),
      searchProvider: {
        search: async () => ({ results: [], durationSeconds: 0 }),
        isEnabled: () => true
      }
    };
    const map = buildProviderMap(config);

    expect(map.searchProvider).toBe(config.searchProvider);
  });
});
