/** SkillRegistry — Skill 注册和管理器 */

import type { SkillDefinition } from '../types/skill';
import { SKILL_NAME_PATTERN } from '../constants';

/**
 * Skill 注册和管理器
 *
 * 支持注册、移除、查询、按别名查找。 isEnabled/userInvocable 过滤由 getEnabled/getUserInvocable 提供。
 */
export class SkillRegistry {
  private readonly skills = new Map<string, SkillDefinition>();

  /** 注册 Skill 定义 */
  register(definition: SkillDefinition): void {
    if (!SKILL_NAME_PATTERN.test(definition.name)) {
      throw new Error(
        `SkillRegistry: 名称 "${definition.name}" 不合法，需匹配 ${SKILL_NAME_PATTERN.source}`
      );
    }

    if (this.skills.has(definition.name)) {
      throw new Error(`SkillRegistry: 名称 "${definition.name}" 已存在`);
    }

    this.skills.set(definition.name, definition);
  }

  /** 移除指定名称的 Skill */
  remove(name: string): void {
    this.skills.delete(name);
  }

  /** 获取指定名称的 Skill */
  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  /** 获取所有已注册的 Skill */
  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /** 获取所有启用的 Skill（isEnabled() 返回 true 或未定义） */
  getEnabled(): SkillDefinition[] {
    return this.getAll().filter(s => s.isEnabled === undefined || s.isEnabled());
  }

  /** 获取所有用户可调用的 Skill（userInvocable 不为 false） */
  getUserInvocable(): SkillDefinition[] {
    return this.getEnabled().filter(s => s.userInvocable !== false);
  }

  /** 按名称或别名查找 Skill */
  findByNameOrAlias(name: string): SkillDefinition | undefined {
    // 先查 name
    const byName = this.skills.get(name);
    if (byName !== undefined) {
      return byName;
    }

    // 再查 aliases
    for (const skill of this.skills.values()) {
      if (skill.aliases?.includes(name)) {
        return skill;
      }
    }

    return undefined;
  }

  /** 清除所有 Skill */
  clear(): void {
    this.skills.clear();
  }
}
