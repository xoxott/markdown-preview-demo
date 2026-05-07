/** InMemorySubagentProvider — 测试用 Mock 实现 */

import type { SubagentDefinition, SubagentToolResult } from '@suga/ai-subagent';
import type { SubagentProvider } from '../types/subagent-provider';

/** spawn 调用记录 */
interface SpawnCall {
  readonly agentType: string;
  readonly task: string;
  readonly contextDirective?: string;
}

/** InMemorySubagentProvider — 不真正 spawn AgentLoop，只记录调用参数 */
export class InMemorySubagentProvider implements SubagentProvider {
  private readonly definitions = new Map<string, SubagentDefinition>();
  private readonly spawnLog: SpawnCall[] = [];

  /** 注册子代理定义 */
  register(def: SubagentDefinition): void {
    this.definitions.set(def.agentType, def);
  }

  /** 注销子代理定义 */
  unregister(agentType: string): void {
    this.definitions.delete(agentType);
  }

  getDefinition(agentType: string): SubagentDefinition | undefined {
    return this.definitions.get(agentType);
  }

  listDefinitions(): readonly SubagentDefinition[] {
    return Array.from(this.definitions.values());
  }

  async spawn(
    def: SubagentDefinition,
    task: string,
    contextDirective?: string
  ): Promise<SubagentToolResult> {
    this.spawnLog.push({ agentType: def.agentType, task, contextDirective });
    return {
      subagentType: def.agentType,
      task,
      summary: `Mock: ${def.agentType} executed "${task.slice(0, 40)}"`,
      success: true
    };
  }

  /** spawn 调用记录 */
  get spawnCalls(): readonly SpawnCall[] {
    return this.spawnLog;
  }

  /** 注册定义数 */
  get size(): number {
    return this.definitions.size;
  }

  /** 清空所有定义和调用记录 */
  reset(): void {
    this.definitions.clear();
    this.spawnLog.length = 0;
  }

  /** G36: resume mock — 恢复中断的子代理 */
  async resume(
    def: SubagentDefinition,
    taskId: string,
    continuationDirective?: string
  ): Promise<SubagentToolResult> {
    return {
      subagentType: def.agentType,
      task: `Resumed task ${taskId}`,
      summary: `Mock: resumed ${def.agentType} task ${taskId}${continuationDirective ? ` with: ${continuationDirective.slice(0, 40)}` : ''}`,
      success: true
    };
  }
}
