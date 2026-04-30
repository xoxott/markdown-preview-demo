/** CoordinatorRegistry — 注册/查找 AgentDefinition */

import type { AgentDefinition } from '../types/agent';
import { AGENT_TYPE_PATTERN } from '../types/agent';

export class CoordinatorRegistry {
  private readonly definitions = new Map<string, AgentDefinition>();

  /** 注册 AgentDefinition */
  register(def: AgentDefinition): void {
    if (!AGENT_TYPE_PATTERN.test(def.agentType)) {
      throw new Error(
        `Agent type "${def.agentType}" 不合法，必须匹配 ${AGENT_TYPE_PATTERN.source}`
      );
    }
    if (this.definitions.has(def.agentType)) {
      throw new Error(`Agent type "${def.agentType}" 已注册`);
    }
    this.definitions.set(def.agentType, def);
  }

  /** 按 agentType 查找 */
  get(agentType: string): AgentDefinition | undefined {
    return this.definitions.get(agentType);
  }

  /** 按 whenToUse 关键词搜索 */
  findByWhenToUse(keyword: string): AgentDefinition[] {
    const results: AgentDefinition[] = [];
    for (const def of this.definitions.values()) {
      if (def.whenToUse.toLowerCase().includes(keyword.toLowerCase())) {
        results.push(def);
      }
    }
    return results;
  }

  /** 找支持指定工具的 AgentDefinition */
  filterByTools(requiredTools: readonly string[]): AgentDefinition[] {
    const results: AgentDefinition[] = [];
    for (const def of this.definitions.values()) {
      if (!def.tools) {
        // 无白名单 = 全部允许
        results.push(def);
        continue;
      }
      const hasAll = requiredTools.every(t => def.tools!.includes(t));
      if (hasAll) results.push(def);
    }
    return results;
  }

  /** 返回所有定义 */
  getAll(): AgentDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** 移除指定 agentType */
  remove(agentType: string): boolean {
    return this.definitions.delete(agentType);
  }

  /** 清空所有定义 */
  clear(): void {
    this.definitions.clear();
  }
}
