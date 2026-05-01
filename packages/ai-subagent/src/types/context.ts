/** ToolUseContext 扩展 — 通过 declare module 添加子代理上下文 */

import type { SubagentRegistry } from '../registry/SubagentRegistry';

/**
 * 扩展 P0 ToolUseContext — 子代理注册表和父 meta 信息
 *
 * 设计原则：
 *
 * - 使用 TypeScript interface merging（P5 SkillTool 和 P1 AgentLoop 已验证此模式）
 * - P0 源码不需要任何修改
 * - 子代理执行时可从 context 获取注册表查找可用子代理
 */
declare module '@suga/ai-tool-core' {
  interface ToolUseContext {
    /** 子代理注册表（AgentTool 使用此查找 SubagentDefinition） */
    readonly subagentRegistry?: SubagentRegistry;
    /** 父 AgentLoop 的 meta 信息（冒泡权限时使用） */
    readonly parentMeta?: Record<string, unknown>;
  }
}
