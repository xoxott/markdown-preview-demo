/** /permissions SkillDefinition — 权限管理 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type {
  PermissionsGrantPromptInput,
  PermissionsListPromptInput,
  PermissionsRevokePromptInput
} from '../../types/command-result';
import { PermissionsArgsSchema } from '../../types/command-args';
import { memoryPositionalParser, parseCommandArgs } from '../../utils/args-parser';
import { PERMISSIONS_TITLE } from '../../constants';

/** 构建 permissions list prompt — 纯函数 */
export function buildPermissionsListPrompt(input: PermissionsListPromptInput): string {
  const lines: string[] = [PERMISSIONS_TITLE, ''];
  if (input.rules.length === 0) {
    lines.push('No permission rules configured.');
  } else {
    for (const rule of input.rules) {
      const scopeIcon = rule.scope === 'allow' ? '✓' : rule.scope === 'deny' ? '✗' : '?';
      lines.push(`- [${scopeIcon}] ${rule.scope}: ${rule.tool} ${rule.pattern} (id: ${rule.id})`);
    }
  }
  return lines.join('\n');
}

/** 构建 permissions grant prompt — 纯函数 */
export function buildPermissionsGrantPrompt(input: PermissionsGrantPromptInput): string {
  return `${PERMISSIONS_TITLE}\n\nGranted **${input.rule.scope}** permission for **${input.rule.tool}** matching "${input.rule.pattern}" (id: ${input.rule.id}).`;
}

/** 构建 permissions revoke prompt — 纯函数 */
export function buildPermissionsRevokePrompt(input: PermissionsRevokePromptInput): string {
  const result = input.success
    ? `Revoked permission rule **${input.ruleId}**.`
    : `Rule **${input.ruleId}** not found or could not be revoked.`;
  return `${PERMISSIONS_TITLE}\n\n${result}`;
}

/** /permissions positional parser */
const permissionsPositionalParser = memoryPositionalParser;

/** /permissions SkillDefinition */
export const permissionsSkill: SkillDefinition = {
  name: 'permissions',
  description: 'View and manage tool permission rules',
  aliases: ['perm'],
  argumentHint: '<list|grant|revoke>',
  whenToUse: 'Use when you want to check which tools are allowed/denied or modify permission rules',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const permissions = extContext.permissionsProvider;

    if (!permissions) {
      return {
        content:
          'Error: permissions requires PermissionsProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, PermissionsArgsSchema, permissionsPositionalParser);

    switch (parsed.subcommand) {
      case 'list': {
        const rules = await permissions.listRules();
        return { content: buildPermissionsListPrompt({ rules }) };
      }
      case 'grant': {
        if (!parsed.tool || !parsed.pattern) {
          return {
            content:
              'Error: grant requires tool and pattern arguments. Usage: /permissions grant <tool> <pattern>'
          };
        }
        const rule = await permissions.grant(parsed.tool, parsed.pattern);
        return { content: buildPermissionsGrantPrompt({ rule }) };
      }
      case 'revoke': {
        if (!parsed.ruleId) {
          return {
            content: 'Error: revoke requires ruleId argument. Usage: /permissions revoke <ruleId>'
          };
        }
        const success = await permissions.revoke(parsed.ruleId);
        return { content: buildPermissionsRevokePrompt({ ruleId: parsed.ruleId, success }) };
      }
      default: {
        return {
          content: `Error: unknown subcommand '${(parsed as { subcommand?: string }).subcommand ?? ''}'. Use list, grant, or revoke.`
        };
      }
    }
  }
};
