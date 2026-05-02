/** SkillProvider — 斜杠命令/skill宿主注入接口 */

/** Skill定义 */
export interface SkillDefinition {
  name: string;
  description: string;
  /** skill展开后的prompt文本 */
  prompt: string;
  allowedTools?: string[];
  model?: string;
  /** 执行上下文 — inline(当前会话) 或 fork(子代理) */
  context?: 'inline' | 'fork';
}

/**
 * SkillProvider — 斜杠命令宿主注入
 *
 * 工具通过此接口查找和调用skill定义。 ai-skill的SkillRegistry可作为真实宿主后端。
 */
export interface SkillProvider {
  /** 查找skill定义，null表示不存在 */
  findSkill(skillName: string): Promise<SkillDefinition | null>;
  /** 列出所有可用skill */
  listSkills(): Promise<SkillDefinition[]>;
}
