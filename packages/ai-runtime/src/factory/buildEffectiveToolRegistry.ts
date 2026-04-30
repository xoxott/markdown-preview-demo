/** buildEffectiveToolRegistry — 构建 ToolRegistry（合并 SkillTool） */

import { ToolRegistry } from '@suga/ai-tool-core';
import { createSkillTool } from '@suga/ai-skill';
import type { RuntimeConfig } from '../types/config';

/**
 * 构建有效 ToolRegistry
 *
 * - 无 toolRegistry 且无 skillRegistry → undefined（无工具阶段）
 * - 有 toolRegistry → 创建新 registry，复制所有工具
 * - 有 skillRegistry → 调用 createSkillTool 注册到 registry
 * - 避免修改用户传入的原始 registry
 */
export function buildEffectiveToolRegistry(config: RuntimeConfig): ToolRegistry | undefined {
  // 无 toolRegistry 且无 skillRegistry → 无工具
  if (!config.toolRegistry && !config.skillRegistry) {
    return undefined;
  }

  const registry = new ToolRegistry();

  // 复制原有工具
  if (config.toolRegistry) {
    for (const tool of config.toolRegistry.getAll()) {
      registry.register(tool);
    }
  }

  // P5 SkillTool 桥接 — 注册到 registry
  if (config.skillRegistry) {
    const skillTool = createSkillTool(config.skillRegistry);
    registry.register(skillTool);
  }

  return registry;
}
