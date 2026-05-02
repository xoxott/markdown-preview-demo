/** createRuntimeSession — 便捷工厂，从 AnthropicAdapterConfig 创建 RuntimeSession */

import { AnthropicAdapter } from '@suga/ai-tool-adapter';
import type { AnthropicAdapterConfig } from '@suga/ai-tool-adapter';
import { NodeFileSystemProvider } from '@suga/ai-tools';
import type { LLMClassifierConfig, RuntimeConfig } from '../types/config';
import { createCallModelFnFromProvider } from '../factory/createCallModelFnFromProvider';
import { RuntimeSession } from './RuntimeSession';

/**
 * 便捷工厂 — 从 AnthropicAdapterConfig 创建 RuntimeSession
 *
 * 默认注入:
 *
 * - NodeFileSystemProvider（bash/file 工具的硬性依赖）
 * - DefaultHttpProvider（WebFetch 工具的 fallback）
 * - LLMPermissionClassifier（auto 模式权限分类器，从 provider 桥接 callModel）
 * - AnthropicBetaFeatures promptCaching（默认激活缓存）
 *
 * @param adapterConfig Anthropic 适配器配置
 * @param overrides RuntimeConfig 的其余字段覆盖
 */
export function createRuntimeSession(
  adapterConfig: AnthropicAdapterConfig,
  overrides?: Partial<Omit<RuntimeConfig, 'provider'>>
): RuntimeSession {
  // 确保 betaFeatures promptCaching 默认激活
  const enhancedConfig: AnthropicAdapterConfig = {
    ...adapterConfig,
    betaFeatures: {
      promptCaching: adapterConfig.betaFeatures?.promptCaching ?? true,
      tokenBatching: adapterConfig.betaFeatures?.tokenBatching
    }
  };

  const provider = new AnthropicAdapter(enhancedConfig);
  const fsProvider = overrides?.fsProvider ?? new NodeFileSystemProvider();

  // 自动桥接: provider → callModelFn → LLMPermissionClassifier
  const classifierConfig: LLMClassifierConfig = overrides?.classifierConfig ?? {
    callModel: createCallModelFnFromProvider(provider, enhancedConfig.model)
  };

  const config: RuntimeConfig = {
    provider,
    fsProvider,
    classifierConfig,
    ...overrides
  };

  return new RuntimeSession(config);
}
