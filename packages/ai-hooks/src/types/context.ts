/** ToolUseContext interface merging — 扩展 P0 的 ToolUseContext */

import type { HookRegistry } from '../registry/HookRegistry';

/**
 * 通过 declare module 向 @suga/ai-tool-core 的 ToolUseContext 添加 hookRegistry 字段。
 *
 * P0 注释明确声明支持此扩展模式："下游包可通过 TypeScript interface merging 添加字段"。 P1 已通过此模式添加 agentId/turnCount，P4
 * 遵循相同模式添加 hookRegistry。
 */
declare module '@suga/ai-tool-core' {
  interface ToolUseContext {
    readonly hookRegistry?: HookRegistry;
  }
}
