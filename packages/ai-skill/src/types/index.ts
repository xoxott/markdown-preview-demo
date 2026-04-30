/** P5 类型统一导出 */

export type {
  SkillDefinition,
  SkillPromptResult,
  SkillContextModifier,
  SkillExecutionContext,
  SkillHookConfig,
  HooksSettings
} from './skill';

export { SKILL_NAME_PATTERN } from './skill';

// context.ts 含 declare module 扩展，需作为副作用导入以确保类型合并生效
export {} from './context';
