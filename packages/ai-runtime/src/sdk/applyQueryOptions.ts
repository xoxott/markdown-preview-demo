/** applyQueryOptions — QueryOptions → RuntimeConfig 合并辅助 */

import type { QueryOptions } from '@suga/ai-sdk';
import type { RuntimeConfig } from '../types/config';

/**
 * 将 SDK QueryOptions 合并到 RuntimeConfig
 *
 * P35新增：append_system_prompt → 合并到 RuntimeConfig.appendSystemPrompt
 */
export function applyQueryOptions(config: RuntimeConfig, options?: QueryOptions): RuntimeConfig {
  if (!options) return config;

  // P35: append_system_prompt 合并
  const appendSystemPrompt = options.append_system_prompt
    ? [config.appendSystemPrompt ?? '', options.append_system_prompt].filter(s => s).join('\n')
    : config.appendSystemPrompt;

  if (appendSystemPrompt !== config.appendSystemPrompt) {
    return { ...config, appendSystemPrompt };
  }

  return config;
}
