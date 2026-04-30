/** ToolUseContext interface merging — 扩展 P0 的 ToolUseContext 添加 skillRegistry */

import type { SkillRegistry } from '../registry/SkillRegistry';

/**
 * 通过 declare module 向 @suga/ai-tool-core 的 ToolUseContext 添加 skillRegistry 字段。
 *
 * P0 注释明确声明支持此扩展模式："下游包可通过 TypeScript interface merging 添加字段"。 P4 已通过此模式添加 hookRegistry，P5 遵循相同模式添加
 * skillRegistry。
 */
declare module '@suga/ai-tool-core' {
  interface ToolUseContext {
    readonly skillRegistry?: SkillRegistry;
  }
}
