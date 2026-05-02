/** createRuntimeSession — 便捷工厂，从 AnthropicAdapterConfig 创建 RuntimeSession */

import { AnthropicAdapter } from '@suga/ai-tool-adapter';
import type { AnthropicAdapterConfig } from '@suga/ai-tool-adapter';
import { NodeFileSystemProvider } from '@suga/ai-tools';
import type { RuntimeConfig } from '../types/config';
import { RuntimeSession } from './RuntimeSession';

/**
 * 便捷工厂 — 从 AnthropicAdapterConfig 创建 RuntimeSession
 *
 * 默认注入 NodeFileSystemProvider（bash/file 工具的硬性依赖）
 *
 * @param adapterConfig Anthropic 适配器配置
 * @param overrides RuntimeConfig 的其余字段覆盖（fsProvider 不提供时使用 NodeFileSystemProvider）
 */
export function createRuntimeSession(
  adapterConfig: AnthropicAdapterConfig,
  overrides?: Partial<Omit<RuntimeConfig, 'provider'>>
): RuntimeSession {
  const provider = new AnthropicAdapter(adapterConfig);
  const fsProvider = overrides?.fsProvider ?? new NodeFileSystemProvider();

  const config: RuntimeConfig = {
    provider,
    fsProvider,
    ...overrides
  };

  return new RuntimeSession(config);
}
