/** ToolUseContext 桥接 — 通过 interface merging 扩展 ai-tool-core 的 ToolUseContext */

import type { ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';

/**
 * 通过 TypeScript interface merging 扩展 ai-tool-core 的 ToolUseContext
 *
 * 这样在 ai-agent-loop 中定义的工具可以通过 context.agentId 和 context.turnCount 获取 Agent 会话信息。
 *
 * 使用 `declare module` 语法确保扩展字段在导入 ai-tool-core 时自动生效。
 */
declare module '@suga/ai-tool-core' {
  interface ToolUseContext {
    /** Agent 会话 ID（追踪工具调用所属的 agent 会话） */
    readonly agentId?: string;
    /** 当前轮次号 */
    readonly turnCount?: number;
  }
}

/** Agent Loop 的完整 ToolUseContext 类型（必填 agentId 和 turnCount） */
export type AgentToolUseContext = ToolUseContext & {
  readonly agentId: string;
  readonly turnCount: number;
};

/** 创建 Agent 专用的 ToolUseContext */
export function createAgentToolUseContext(
  agentId: string,
  turnCount: number,
  registry: ToolRegistry,
  abortController: AbortController,
  providers?: Record<string, unknown>
): AgentToolUseContext {
  return {
    abortController,
    tools: registry,
    sessionId: agentId,
    agentId,
    turnCount,
    ...providers
  };
}
