/** 工具注册表（Tool Registry） 工具注册、查找和过滤的核心容器 */

import type { AnyBuiltTool, ToolDenyRule, ToolRegistryOptions } from './types/registry';

/**
 * 工具注册表（支持注册、查找、别名、拒绝规则和合并）
 *
 * 设计要点：
 *
 * - 双映射结构：toolsByName（主名称查找）+ aliases（别名到主名称映射）
 * - 拒绝规则：基于通配符模式匹配，支持 "fs-*" 等模糊匹配
 * - 合并机制：支持合并多个注册表（内置 + MCP 等）
 * - 防覆盖保护：默认不允许同名注册，避免意外覆盖
 */
export class ToolRegistry {
  /** 工具名称映射（主名称 → 工具实例） */
  private readonly toolsByName: Map<string, AnyBuiltTool> = new Map();
  /** 工具别名映射（别名 → 主名称） */
  private readonly aliases: Map<string, string> = new Map();
  /** 拒绝规则列表 */
  private readonly denyRules: ToolDenyRule[];

  constructor(options?: ToolRegistryOptions) {
    this.denyRules = options?.denyRules ?? [];

    if (options?.tools) {
      for (const tool of options.tools) {
        this.register(tool, options.allowOverride ?? false);
      }
    }
  }

  /**
   * 注册工具
   *
   * @param tool 构建完成的工具
   * @param allowOverride 是否允许覆盖同名工具（默认 false）
   * @throws 工具名称已存在且不允许覆盖时抛出错误
   */
  register(tool: AnyBuiltTool, allowOverride = false): void {
    if (this.toolsByName.has(tool.name) && !allowOverride) {
      throw new Error(`工具 "${tool.name}" 已注册，不允许覆盖`);
    }

    this.toolsByName.set(tool.name, tool);

    // 注册别名
    for (const alias of tool.aliases) {
      if (this.aliases.has(alias) && this.aliases.get(alias) !== tool.name && !allowOverride) {
        throw new Error(`别名 "${alias}" 已被工具 "${this.aliases.get(alias)}" 使用，不允许覆盖`);
      }
      this.aliases.set(alias, tool.name);
    }
  }

  /** 注销工具（同时移除所有别名） */
  unregister(name: string): void {
    const tool = this.toolsByName.get(name);
    if (!tool) return;

    // 删除所有别名
    for (const alias of tool.aliases) {
      this.aliases.delete(alias);
    }

    this.toolsByName.delete(name);
  }

  /** 通过主名称查找工具 */
  getByName(name: string): AnyBuiltTool | undefined {
    return this.toolsByName.get(name);
  }

  /** 通过别名查找工具（先解析别名到主名称，再查找） */
  getByAlias(alias: string): AnyBuiltTool | undefined {
    const primaryName = this.aliases.get(alias);
    if (!primaryName) return undefined;
    return this.toolsByName.get(primaryName);
  }

  /** 通过名称或别名查找工具（先尝试主名称，再尝试别名） */
  get(nameOrAlias: string): AnyBuiltTool | undefined {
    return this.getByName(nameOrAlias) ?? this.getByAlias(nameOrAlias);
  }

  /** 获取所有已注册工具（按注册顺序） */
  getAll(): AnyBuiltTool[] {
    return Array.from(this.toolsByName.values());
  }

  /** 根据拒绝规则过滤工具（返回未被拒绝的工具列表） */
  filterByDenyRules(): AnyBuiltTool[] {
    return this.getAll().filter(tool => !this.isDenied(tool.name));
  }

  /** 检查工具是否被拒绝规则匹配 */
  isDenied(name: string): boolean {
    for (const rule of this.denyRules) {
      if (this.matchPattern(name, rule.pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 合并另一个注册表
   *
   * 将另一个注册表的所有工具和拒绝规则合并到当前注册表。 用于组合多个工具来源（内置工具 + MCP 工具 + 自定义工具）。
   *
   * @param other 要合并的注册表
   * @param allowOverride 是否允许覆盖同名工具（默认 false）
   */
  merge(other: ToolRegistry, allowOverride = false): void {
    // 合并工具
    for (const tool of other.getAll()) {
      this.register(tool, allowOverride);
    }

    // 合并拒绝规则（追加）
    this.denyRules.push(...other.denyRules);
  }

  /** 模式匹配（支持 * 通配符） "fs-_" 匹配 "fs-read", "fs-write" 等 "_" 匹配所有名称 */
  private matchPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/[?]/g, '.')}$`);
    return regex.test(name);
  }
}
