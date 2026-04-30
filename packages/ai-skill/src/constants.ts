/** P5 常量定义 */

/** Skill 执行默认超时（ms） */
export const DEFAULT_SKILL_TIMEOUT = 30_000;

/** SkillTool 注册名（P0 TOOL_NAME_PATTERN 要求小写） */
export const SKILL_TOOL_NAME = 'skill';

/** Skill 名称合法正则（从 types/skill.ts 导出以避免循环） */
export { SKILL_NAME_PATTERN } from './types/skill';
