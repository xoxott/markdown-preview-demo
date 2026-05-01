/** SubagentRegistry — 子代理定义注册表（Map<agentType, SubagentDefinition>） */

import type { SubagentDefinition, SubagentSource } from '../types/subagent';

/**
 * 子代理注册表 — 管理所有可用的 SubagentDefinition
 *
 * 设计要点：
 *
 * - Map 存储：agentType → SubagentDefinition（唯一键）
 * - getBySource：按来源过滤（builtin/custom/plugin）
 * - filterByTools：按工具能力过滤（用于 Coordinator 分配）
 * - 与 P0 ToolRegistry 对齐的注册/注销模式
 */
export class SubagentRegistry {
  private readonly definitions: Map<string, SubagentDefinition> = new Map();

  /** 注册子代理定义 */
  register(def: SubagentDefinition): void {
    if (this.definitions.has(def.agentType)) {
      throw new Error(`子代理 "${def.agentType}" 已注册，不允许覆盖`);
    }
    this.definitions.set(def.agentType, def);
  }

  /** 通过 agentType 查找 */
  get(agentType: string): SubagentDefinition | undefined {
    return this.definitions.get(agentType);
  }

  /** 注销子代理定义 */
  unregister(agentType: string): void {
    this.definitions.delete(agentType);
  }

  /** 获取所有已注册定义 */
  getAll(): SubagentDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** 按来源过滤 */
  getBySource(source: SubagentSource): SubagentDefinition[] {
    return this.getAll().filter(def => (def.source ?? 'builtin') === source);
  }

  /** 按工具能力过滤（子代理工具白名单包含指定工具名） */
  filterByTools(toolNames: readonly string[]): SubagentDefinition[] {
    return this.getAll().filter(def => {
      if (def.tools === undefined) return true; // 无白名单 = 全部允许
      return toolNames.some(name => def.tools!.includes(name));
    });
  }

  /** 检查是否已注册 */
  has(agentType: string): boolean {
    return this.definitions.has(agentType);
  }

  /** 注册数量 */
  readonly size = (): number => this.definitions.size;
}
