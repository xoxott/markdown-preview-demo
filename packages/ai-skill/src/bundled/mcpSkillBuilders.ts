/**
 * MCPSkillBuilders — MCP skill 构造器注册表（依赖图叶节点）
 *
 * 对齐 CC src/skills/mcpSkillBuilders.ts。这是一个 write-once registry，loadSkillsDir 在初始化时通过
 * registerMCPSkillBuilders 写入构造函数；mcpSkills.ts（从 MCP server 加载 skill 列表）通过 getMCPSkillBuilders
 * 读取，避免直接 import 造成循环依赖。
 */

import type { BundledSkillContentBlock, BundledSkillContext } from './BundledSkill';

/** 通用 Skill Command 形态 */
export interface SkillCommand {
  readonly name: string;
  readonly description: string;
  readonly aliases?: readonly string[];
  readonly whenToUse?: string;
  readonly argumentHint?: string;
  readonly allowedTools?: readonly string[];
  readonly model?: string;
  readonly disableModelInvocation?: boolean;
  readonly userInvocable?: boolean;
  readonly source?: 'mcp' | 'plugin' | 'user' | 'project' | 'local' | 'built-in';
  readonly getPromptForCommand: (
    args: string,
    context: BundledSkillContext
  ) => Promise<readonly BundledSkillContentBlock[]>;
}

/** Skill frontmatter 的字段子集 — 只包含可以从 MCP 端收到的字段 */
export interface SkillFrontmatterFields {
  readonly description: string;
  readonly aliases?: readonly string[];
  readonly whenToUse?: string;
  readonly argumentHint?: string;
  readonly allowedTools?: readonly string[];
  readonly model?: string;
  readonly disableModelInvocation?: boolean;
}

/**
 * loadSkillsDir 提供的两个 skill 构造函数（解析 frontmatter + 转 SkillCommand）
 *
 * 使用 write-once 注册模式避免 mcpSkills.ts ↔ loadSkillsDir.ts 循环依赖。
 */
export interface MCPSkillBuilders {
  /** 从 SKILL.md 内容 + frontmatter 创建 SkillCommand */
  readonly createSkillCommand: (args: {
    readonly name: string;
    readonly content: string;
    readonly frontmatter: SkillFrontmatterFields;
    readonly source: SkillCommand['source'];
    readonly serverName?: string;
  }) => SkillCommand;

  /** 解析 markdown frontmatter（key:value YAML 子集）-> 字段对象 */
  readonly parseSkillFrontmatterFields: (raw: Record<string, unknown>) => SkillFrontmatterFields;
}

let builders: MCPSkillBuilders | null = null;

/** 注册 MCPSkillBuilders（一次性，由 loadSkillsDir 模块初始化时调用） */
export function registerMCPSkillBuilders(b: MCPSkillBuilders): void {
  builders = b;
}

/**
 * 获取已注册的 MCPSkillBuilders
 *
 * @throws 如果尚未注册（loadSkillsDir.ts 还未求值）
 */
export function getMCPSkillBuilders(): MCPSkillBuilders {
  if (!builders) {
    throw new Error('MCP skill builders not registered — loadSkillsDir has not been evaluated yet');
  }
  return builders;
}

/** 重置（测试用） */
export function resetMCPSkillBuilders(): void {
  builders = null;
}
