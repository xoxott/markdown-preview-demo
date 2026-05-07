/** buildEffectiveToolRegistry — 构建 ToolRegistry（合并 SkillTool + P99 Delta ToolSearch 分离） */

import { ToolRegistry } from '@suga/ai-tool-core';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import { createSkillTool } from '@suga/ai-skill';
import { getToolSearchMode, isDeferredTool, toolSearchTool } from '@suga/ai-tools';
import type { ToolSearchMode } from '@suga/ai-tools';
import type { RuntimeConfig } from '../types/config';

/**
 * P99: ToolSearch 注册结果 — 携带 deferred 池信息
 *
 * 当 enableToolSearch 启用时，返回此结构以便下游（AgentLoop）访问 deferred 工具池。
 */
export interface ToolSearchRegistryResult {
  /** active 工具注册表（alwaysLoad + tool-search + SkillTool） */
  readonly registry: ToolRegistry;
  /** deferred 工具池（供 tool-search 搜索 + delta 计算） */
  readonly deferredTools: AnyBuiltTool[];
  /** 工具搜索模式 */
  readonly searchMode: ToolSearchMode;
}

/**
 * 构建有效 ToolRegistry
 *
 * P99 增强：当 enableToolSearch 启用时，将工具分为 alwaysLoad 和 deferred 两组：
 *
 * - alwaysLoad 工具 + tool-search 工具 + SkillTool → 注册到 active registry
 * - deferred 工具 → 收集到 deferredTools[]（供 delta 计算）
 * - 无 toolRegistry 且无 skillRegistry → undefined（无工具阶段）
 * - enableToolSearch='false' 或 mode='standard' → 起原逻辑（全注册）
 * - enableToolSearch truthy 且 mode≠standard → ToolSearchRegistryResult
 */
export function buildEffectiveToolRegistry(
  config: RuntimeConfig
): ToolRegistry | ToolSearchRegistryResult | undefined {
  // 无 toolRegistry 且无 skillRegistry → 无工具
  if (!config.toolRegistry && !config.skillRegistry) {
    return undefined;
  }

  // P99: 检查是否启用 ToolSearch
  const searchMode = getToolSearchMode(config.enableToolSearch);

  // standard 模式 或 无 enableToolSearch → 起原逻辑（全注册）
  if (searchMode === 'standard' || !config.enableToolSearch) {
    const registry = new ToolRegistry();

    // 复制原有工具
    if (config.toolRegistry) {
      for (const tool of config.toolRegistry.getAll()) {
        registry.register(tool);
      }
    }

    // P5 SkillTool 桥接
    if (config.skillRegistry) {
      const skillTool = createSkillTool(config.skillRegistry);
      registry.register(skillTool);
    }

    return registry;
  }

  // tst / tst-auto 模式 → 分离 alwaysLoad + deferred
  const allTools = config.toolRegistry ? config.toolRegistry.getAll() : [];
  const alwaysLoadTools = allTools.filter(t => !isDeferredTool(t));
  const deferredTools = allTools.filter(t => isDeferredTool(t));

  const registry = new ToolRegistry();

  // 注册 alwaysLoad 工具
  for (const tool of alwaysLoadTools) {
    registry.register(tool);
  }

  // 注册 tool-search 工具
  registry.register(toolSearchTool);

  // P5 SkillTool 桥接
  if (config.skillRegistry) {
    const skillTool = createSkillTool(config.skillRegistry);
    registry.register(skillTool);
  }

  return {
    registry,
    deferredTools,
    searchMode
  };
}
