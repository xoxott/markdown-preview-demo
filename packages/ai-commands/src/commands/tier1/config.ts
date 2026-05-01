/** /config SkillDefinition — 配置管理命令 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type {
  ConfigGetPromptInput,
  ConfigListPromptInput,
  ConfigResetPromptInput,
  ConfigSetPromptInput
} from '../../types/command-result';
import { ConfigArgsSchema } from '../../types/command-args';
import { configPositionalParser, parseCommandArgs } from '../../utils/args-parser';
import { formatConfigSections, formatConfigValue } from '../../utils/format-helpers';
import { CONFIG_TITLE } from '../../constants';

/** 构建 config list prompt — 纯函数 */
export function buildConfigListPrompt(input: ConfigListPromptInput): string {
  return formatConfigSections(input.sections);
}

/** 构建 config get prompt — 纯函数 */
export function buildConfigGetPrompt(input: ConfigGetPromptInput): string {
  return formatConfigValue(input.key, input.value);
}

/** 构建 config set prompt — 纯函数 */
export function buildConfigSetPrompt(input: ConfigSetPromptInput): string {
  const lines: string[] = [];
  lines.push(CONFIG_TITLE);
  lines.push(`Key "${input.key}" has been set to: ${JSON.stringify(input.value)}`);
  return lines.join('\n');
}

/** 构建 config reset prompt — 纯函数 */
export function buildConfigResetPrompt(input: ConfigResetPromptInput): string {
  const lines: string[] = [];
  lines.push(CONFIG_TITLE);
  lines.push(`Key "${input.key}" has been reset to default value.`);
  return lines.join('\n');
}

/** /config SkillDefinition */
export const configSkill: SkillDefinition = {
  name: 'config',
  description: 'View and modify configuration settings',
  aliases: ['cfg'],
  argumentHint: '<subcommand> [key] [value]',
  whenToUse: 'Use when you need to check or change runtime configuration',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const configProvider = extContext.configProvider;

    if (!configProvider) {
      return {
        content:
          'Error: config requires ConfigProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, ConfigArgsSchema, configPositionalParser);

    switch (parsed.subcommand) {
      case 'list': {
        const sections = await configProvider.list();
        return { content: buildConfigListPrompt({ sections }) };
      }
      case 'get': {
        const value = await configProvider.get(parsed.key ?? '');
        return { content: buildConfigGetPrompt({ key: parsed.key ?? '', value }) };
      }
      case 'set': {
        await configProvider.set(parsed.key ?? '', parsed.value ?? '');
        return {
          content: buildConfigSetPrompt({ key: parsed.key ?? '', value: parsed.value ?? '' })
        };
      }
      case 'reset': {
        await configProvider.reset(parsed.key ?? '');
        return { content: buildConfigResetPrompt({ key: parsed.key ?? '' }) };
      }
      default: {
        return { content: `Unknown config subcommand: "${parsed.subcommand}"` };
      }
    }
  }
};
