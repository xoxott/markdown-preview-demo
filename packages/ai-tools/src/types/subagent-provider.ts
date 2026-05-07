/** Subagent Provider 接口 — 宿主注入实现（AgentTool使用） */

import type { SubagentDefinition, SubagentToolResult } from '@suga/ai-subagent';

/**
 * SubagentProvider — 宿主注入接口
 *
 * 封装了 SubagentRegistry.get() + Spawner.spawn() 两个操作， 宿主只需注入一个 Provider 即可让 AgentTool 工作。
 *
 * 真实宿主场景: SubagentProviderImpl 持有 SubagentRegistry + ForkSpawner 测试场景: InMemorySubagentProvider 返回
 * mock 结果
 */
export interface SubagentProvider {
  /** 查找子代理定义 */
  getDefinition(agentType: string): SubagentDefinition | undefined;
  /** 列出所有可用子代理类型 */
  listDefinitions(): readonly SubagentDefinition[];
  /** 执行子代理 */
  spawn(
    def: SubagentDefinition,
    task: string,
    contextDirective?: string
  ): Promise<SubagentToolResult>;
  /** G36: 恢复中断的子代理 — 从上次中断点继续执行 */
  resume?(
    def: SubagentDefinition,
    taskId: string,
    continuationDirective?: string
  ): Promise<SubagentToolResult>;
}
