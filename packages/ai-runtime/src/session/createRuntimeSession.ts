/** createRuntimeSession — 便捷工厂，从 AnthropicAdapterConfig 创建 RuntimeSession */

import { AnthropicAdapter } from '@suga/ai-tool-adapter';
import type { AnthropicAdapterConfig } from '@suga/ai-tool-adapter';
import type { RuntimeConfig } from '../types/config';
import { RuntimeSession } from './RuntimeSession';

/**
 * 便捷工厂 — 从 AnthropicAdapterConfig 创建 RuntimeSession
 *
 * @param adapterConfig Anthropic 适配器配置
 * @param overrides RuntimeConfig 的其余字段覆盖
 */
export function createRuntimeSession(
  adapterConfig: AnthropicAdapterConfig,
  overrides?: Partial<Omit<RuntimeConfig, 'provider'>>
): RuntimeSession {
  const provider = new AnthropicAdapter(adapterConfig);

  const config: RuntimeConfig = {
    provider,
    ...overrides
  };

  return new RuntimeSession(config);
}
