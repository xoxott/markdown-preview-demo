/** buildProviderMap — 从 RuntimeConfig 提取 provider 字段，应用默认值 */

import { DefaultHttpProvider } from '@suga/ai-tools';
import type { RuntimeConfig } from '../types/config';

/**
 * 从 RuntimeConfig 构建 ProviderMap
 *
 * - fsProvider: 必填，直接取值
 * - httpProvider: 可选，默认 DefaultHttpProvider（使用全局 fetch + regex html→md）
 * - 其余 provider: 可选，无默认
 *
 * 返回的对象兼容 Record<string, unknown>（可 spread 到 ToolUseContext）
 */
export function buildProviderMap(config: RuntimeConfig): Record<string, unknown> {
  return {
    fsProvider: config.fsProvider,
    httpProvider: config.httpProvider ?? new DefaultHttpProvider(),
    searchProvider: config.searchProvider,
    taskStoreProvider: config.taskStoreProvider,
    teamProvider: config.teamProvider,
    mailboxProvider: config.mailboxProvider,
    userInteractionProvider: config.userInteractionProvider,
    skillProvider: config.skillProvider,
    configProvider: config.configProvider,
    mcpResourceProvider: config.mcpResourceProvider,
    planModeProvider: config.planModeProvider
  };
}
