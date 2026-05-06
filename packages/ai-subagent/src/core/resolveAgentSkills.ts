/**
 * resolveAgentSkills — 从子代理定义的skills字段预加载skill定义
 *
 * 对齐 Claude Code: 子代理定义中有 skills 字段（字符串数组）， 在子代理启动时预加载这些 skills 的定义，注入到 agent 的 system prompt 中。
 */

import type { SubagentDefinition } from '../types/subagent';

/** Skill描述（宿主注入） */
export interface SkillDescriptor {
  readonly name: string;
  readonly description: string;
  readonly prompt?: string;
}

/** SkillResolver — 宿主注入skill查找实现 */
export interface SkillResolver {
  resolve(skillName: string): SkillDescriptor | undefined;
}

/**
 * resolveAgentSkills — 查找子代理定义中所有skills的描述
 *
 * @returns skill名称 → 描述映射
 */
export function resolveAgentSkills(
  def: SubagentDefinition,
  resolver: SkillResolver
): ReadonlyMap<string, SkillDescriptor> {
  const result = new Map<string, SkillDescriptor>();

  if (!def.skills || def.skills.length === 0) return result;

  for (const skillName of def.skills) {
    const descriptor = resolver.resolve(skillName);
    if (descriptor) {
      result.set(skillName, descriptor);
    }
  }

  return result;
}

/** buildSkillSystemPrompt — 将skill描述构建为system prompt片段 */
export function buildSkillSystemPrompt(skills: ReadonlyMap<string, SkillDescriptor>): string {
  if (skills.size === 0) return '';

  const lines: string[] = ['## Available Skills\n'];
  for (const [name, desc] of skills) {
    lines.push(`- **${name}**: ${desc.description}`);
    if (desc.prompt) lines.push(`  Prompt: ${desc.prompt}`);
  }
  lines.push('\nUse the /skill command to invoke any of these skills.');

  return lines.join('\n');
}
