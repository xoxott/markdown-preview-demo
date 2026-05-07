/** /help SkillDefinition — 列出所有可用命令 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { HelpPromptInput } from '../../types/command-result';
import { HelpArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { HELP_TITLE } from '../../constants';

/** 构建 help prompt — 纯函数 */
export function buildHelpPrompt(input: HelpPromptInput): string {
  const lines: string[] = [HELP_TITLE, ''];
  const cmds = input.filter
    ? input.commands.filter(
        c =>
          c.name.includes(input.filter!) ||
          c.description.toLowerCase().includes(input.filter!.toLowerCase()) ||
          (c.aliases?.some(a => a.includes(input.filter!)) ?? false)
      )
    : input.commands;

  if (cmds.length === 0) {
    lines.push(`No commands matching "${input.filter ?? ''}"`);
  } else {
    for (const cmd of cmds) {
      const aliasStr = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
      const hintStr = cmd.argumentHint ? ` ${cmd.argumentHint}` : '';
      lines.push(`- /${cmd.name}${hintStr}${aliasStr} — ${cmd.description}`);
    }
  }

  return lines.join('\n');
}

/** /help SkillDefinition */
export const helpSkill: SkillDefinition = {
  name: 'help',
  description: 'List all available slash commands with descriptions and aliases',
  aliases: ['h'],
  argumentHint: '[filter]',
  whenToUse: 'Use when you want to see available commands or search for a specific command',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    _context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const parsed = parseCommandArgs(args, HelpArgsSchema, tokens => ({
      filter: tokens[0]
    }));

    // 静态命令列表 — 宿主可通过 meta 注入动态列表
    const commands = [
      {
        name: 'commit',
        description: 'Generate a git commit message',
        aliases: ['ci'],
        argumentHint: '[instruction]'
      },
      {
        name: 'compact',
        description: 'Compress conversation context',
        aliases: [],
        argumentHint: '[instruction]'
      },
      {
        name: 'memory',
        description: 'Save, recall, forget, refresh memories',
        aliases: [],
        argumentHint: '<subcommand>'
      },
      {
        name: 'config',
        description: 'View and modify settings',
        aliases: [],
        argumentHint: '<subcommand>'
      },
      {
        name: 'doctor',
        description: 'Run diagnostic checks',
        aliases: [],
        argumentHint: '[filter]'
      },
      {
        name: 'add-dir',
        description: 'Add a working directory',
        aliases: [],
        argumentHint: '<path>'
      },
      {
        name: 'init',
        description: 'Initialize project configuration',
        aliases: [],
        argumentHint: '[template]'
      },
      {
        name: 'status',
        description: 'Show session status',
        aliases: ['st'],
        argumentHint: '[verbose]'
      },
      { name: 'diff', description: 'Show git diff', aliases: [], argumentHint: '[filter]' },
      { name: 'mcp', description: 'Manage MCP servers', aliases: [], argumentHint: '<subcommand>' },
      {
        name: 'help',
        description: 'List available commands',
        aliases: ['h'],
        argumentHint: '[filter]'
      },
      {
        name: 'clear',
        description: 'Clear conversation context',
        aliases: ['cl'],
        argumentHint: ''
      },
      {
        name: 'cost',
        description: 'Show session cost breakdown',
        aliases: [],
        argumentHint: '[detailed]'
      },
      {
        name: 'fast',
        description: 'Switch to a faster model',
        aliases: [],
        argumentHint: '[model]'
      },
      { name: 'model', description: 'Show or switch models', aliases: [], argumentHint: '[name]' },
      {
        name: 'permissions',
        description: 'View and manage tool permissions',
        aliases: ['perm'],
        argumentHint: '<subcommand>'
      },
      {
        name: 'vim',
        description: 'Toggle vim keybindings mode',
        aliases: [],
        argumentHint: '[on|off]'
      },
      {
        name: 'terminal-setup',
        description: 'Install terminal shell integration',
        aliases: [],
        argumentHint: '[--uninstall]'
      }
    ];

    const prompt = buildHelpPrompt({ commands, filter: parsed.filter });
    return { content: prompt };
  }
};
