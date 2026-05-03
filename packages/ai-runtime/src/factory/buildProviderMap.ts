/** buildProviderMap — 从 RuntimeConfig 提取 provider 字段，应用默认值 */

import {
  DefaultHttpProvider,
  NodeSettingsLayerReader,
  SandboxFileSystemProvider,
  SandboxHttpProvider,
  SandboxSearchProvider
} from '@suga/ai-tools';
import { DEFAULT_DENIAL_TRACKING } from '@suga/ai-tool-core';
import type { RuntimeConfig } from '../types/config';

/**
 * 从 RuntimeConfig 构建 ProviderMap
 *
 * - fsProvider: 必填，如果 config.sandbox 存在则用 SandboxFileSystemProvider 装饰
 * - httpProvider: 可选，默认 DefaultHttpProvider（使用全局 fetch + regex html→md）
 * - promptHandler: 可选，宿主注入权限确认交互接口
 * - canUseToolFn: 可选，宿主注入用户确认函数（向后兼容）
 * - denialTracking: 可选，默认 DEFAULT_DENIAL_TRACKING
 * - 其余 provider: 可选，无默认
 *
 * 返回的对象兼容 Record<string, unknown>（可 spread 到 ToolUseContext）
 */
export function buildProviderMap(config: RuntimeConfig): Record<string, unknown> {
  // P50+P53: sandbox 配置存在时，装饰 fsProvider + httpProvider + searchProvider
  const effectiveFsProvider = config.sandbox
    ? new SandboxFileSystemProvider({ inner: config.fsProvider, sandbox: config.sandbox })
    : config.fsProvider;

  const effectiveHttpProvider =
    config.sandbox?.network && config.httpProvider
      ? new SandboxHttpProvider({ inner: config.httpProvider, sandbox: config.sandbox })
      : (config.httpProvider ?? new DefaultHttpProvider());

  const effectiveSearchProvider =
    config.sandbox?.network && config.searchProvider
      ? new SandboxSearchProvider({ inner: config.searchProvider, sandbox: config.sandbox })
      : config.searchProvider;

  return {
    fsProvider: effectiveFsProvider,
    httpProvider: effectiveHttpProvider,
    searchProvider: effectiveSearchProvider,
    taskStoreProvider: config.taskStoreProvider,
    teamProvider: config.teamProvider,
    mailboxProvider: config.mailboxProvider,
    userInteractionProvider: config.userInteractionProvider,
    skillProvider: config.skillProvider,
    configProvider: config.configProvider,
    mcpResourceProvider: config.mcpResourceProvider,
    planModeProvider: config.planModeProvider,
    promptHandler: config.promptHandler,
    canUseToolFn: config.canUseToolFn,
    denialTracking: config.denialTracking ?? DEFAULT_DENIAL_TRACKING,
    isHeadlessAgent: config.isHeadlessAgent,
    // P52: 补全 — memory/compress/coordinator/subagent/sandbox
    memoryConfig: config.memoryConfig,
    memoryProvider: config.memoryProvider,
    memoryPathConfig: config.memoryPathConfig,
    compressConfig: config.compressConfig,
    compressDeps: config.compressDeps,
    hookRegistry: config.hookRegistry,
    toolRegistry: config.toolRegistry,
    coordinatorRegistry: config.coordinatorRegistry,
    coordinatorMailbox: config.coordinatorMailbox,
    spawnProvider: config.spawnProvider,
    subagentRegistry: config.subagentRegistry,
    subagentSpawner: config.subagentSpawner,
    classifierConfig: config.classifierConfig,
    sandbox: config.sandbox,
    usageTracker: config.usageTracker,
    tokenBudget: config.tokenBudget,
    costConfig: config.costConfig,
    // P47: Settings文件系统注入
    settingsLayerReader: config.settingsLayerReader ?? config.settingsLayerReaderConfig
      ? new NodeSettingsLayerReader(config.settingsLayerReaderConfig!)
      : undefined
  };
}
