/** SkillExecutor — Skill 执行引擎 */

import type { HookDefinition, HookRegistry } from '@suga/ai-hooks';
import type {
  SkillDefinition,
  SkillExecutionContext,
  SkillHookConfig,
  SkillPromptResult
} from '../types/skill';
import type { SkillRegistry } from '../registry/SkillRegistry';

/**
 * Skill 执行引擎
 *
 * 执行流程:
 *
 * 1. findByNameOrAlias(skillName) 查找 skill
 * 2. isEnabled() 检查
 * 3. skill.getPromptForCommand(args, context) 生成 prompt
 * 4. 如果 skill 有 hooks → 注入到 context.hookRegistry
 * 5. 返回 SkillPromptResult
 */
export class SkillExecutor {
  constructor(private readonly registry: SkillRegistry) {}

  /**
   * 执行指定 Skill
   *
   * @throws 如果 skill 不存在或未启用
   */
  async execute(
    skillName: string,
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> {
    const skill = this.registry.findByNameOrAlias(skillName);

    if (skill === undefined) {
      throw new Error(`SkillExecutor: Skill "${skillName}" 未找到`);
    }

    // isEnabled 检查
    if (skill.isEnabled !== undefined && !skill.isEnabled()) {
      throw new Error(`SkillExecutor: Skill "${skillName}" 当前未启用`);
    }

    // 生成 prompt
    const result = await skill.getPromptForCommand(args, context);

    // 如果 skill 定义了 hooks → 注入到 HookRegistry（会话级临时注册）
    if (skill.hooks !== undefined && context.hookRegistry !== undefined) {
      this.injectSkillHooks(skill, context.hookRegistry);
    }

    // 如果 result.contextModifier 中有 hooks → 也注入
    if (result.contextModifier?.hooks !== undefined && context.hookRegistry !== undefined) {
      this.injectModifierHooks(result.contextModifier.hooks, skill.name, context.hookRegistry);
    }

    return result;
  }

  /**
   * 将 skill 的 hooks 注入到 HookRegistry
   *
   * 每个 SkillHookConfig 转换为 HookDefinition 并注册
   */
  private injectSkillHooks(skill: SkillDefinition, hookRegistry: HookRegistry): void {
    if (skill.hooks === undefined) {
      return;
    }

    for (const hookConfig of skill.hooks) {
      const definition: HookDefinition = {
        name: `skill_${skill.name}_${hookConfig.event}_${hookConfig.matcher ?? 'any'}`,
        event: hookConfig.event,
        matcher: hookConfig.matcher,
        handler: hookConfig.handler
      };

      hookRegistry.register(definition);
    }
  }

  /**
   * 将 contextModifier 的 hooks 注入到 HookRegistry
   *
   * 使用 result 上下文的 hooks（如 prompt 生成的动态 hook）
   */
  private injectModifierHooks(
    hooks: SkillHookConfig[],
    skillName: string,
    hookRegistry: HookRegistry
  ): void {
    for (const hookConfig of hooks) {
      const definition: HookDefinition = {
        name: `skill_modifier_${skillName}_${hookConfig.event}_${hookConfig.matcher ?? 'any'}`,
        event: hookConfig.event,
        matcher: hookConfig.matcher,
        handler: hookConfig.handler
      };

      hookRegistry.register(definition);
    }
  }
}
