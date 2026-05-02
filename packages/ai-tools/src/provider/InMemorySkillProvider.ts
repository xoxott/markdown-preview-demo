/** InMemorySkillProvider — 内存Skill实现（测试+轻量宿主） */

import type { SkillDefinition, SkillProvider } from '../types/skill-provider';

export class InMemorySkillProvider implements SkillProvider {
  private skills = new Map<string, SkillDefinition>();

  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
  }

  removeSkill(name: string): void {
    this.skills.delete(name);
  }

  async findSkill(skillName: string): Promise<SkillDefinition | null> {
    return this.skills.get(skillName) ?? null;
  }

  async listSkills(): Promise<SkillDefinition[]> {
    return Array.from(this.skills.values());
  }

  reset(): void {
    this.skills.clear();
  }
}
