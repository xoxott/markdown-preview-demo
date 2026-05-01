/** /mcp SkillDefinition — MCP 服务器管理 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type {
  McpAddPromptInput,
  McpListPromptInput,
  McpRemovePromptInput,
  McpRestartPromptInput
} from '../../types/command-result';
import { McpArgsSchema } from '../../types/command-args';
import { mcpPositionalParser, parseCommandArgs } from '../../utils/args-parser';
import { formatMcpServers } from '../../utils/format-helpers';
import { MCP_TITLE } from '../../constants';

/** 构建 mcp list prompt — 纯函数 */
export function buildMcpListPrompt(input: McpListPromptInput): string {
  return formatMcpServers(input.servers);
}

/** 构建 mcp add prompt — 纯函数 */
export function buildMcpAddPrompt(input: McpAddPromptInput): string {
  return `${MCP_TITLE}\nMCP server "${input.name}" (${input.configType}) has been added.`;
}

/** 构建 mcp remove prompt — 纯函数 */
export function buildMcpRemovePrompt(input: McpRemovePromptInput): string {
  return `${MCP_TITLE}\nMCP server "${input.name}" has been removed.`;
}

/** 构建 mcp restart prompt — 纯函数 */
export function buildMcpRestartPrompt(input: McpRestartPromptInput): string {
  return `${MCP_TITLE}\nMCP server "${input.name}" is being restarted.`;
}

/** /mcp SkillDefinition */
export const mcpSkill: SkillDefinition = {
  name: 'mcp',
  description: 'Manage MCP servers: list, add, remove, restart',
  aliases: [],
  argumentHint: '<subcommand> [name]',
  whenToUse: 'Use when you need to manage MCP server connections',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const mcpProvider = extContext.mcpProvider;

    if (!mcpProvider) {
      return {
        content:
          'Error: mcp requires McpCommandProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, McpArgsSchema, mcpPositionalParser);

    switch (parsed.subcommand) {
      case 'list': {
        const servers = await mcpProvider.listServers();
        return { content: buildMcpListPrompt({ servers }) };
      }
      case 'add': {
        const configType = parsed.configType ?? 'stdio';
        await mcpProvider.addServer(parsed.name ?? '', {
          type: configType,
          command: parsed.command
        });
        return { content: buildMcpAddPrompt({ name: parsed.name ?? '', configType }) };
      }
      case 'remove': {
        await mcpProvider.removeServer(parsed.name ?? '');
        return { content: buildMcpRemovePrompt({ name: parsed.name ?? '' }) };
      }
      case 'restart': {
        await mcpProvider.restartServer(parsed.name ?? '');
        return { content: buildMcpRestartPrompt({ name: parsed.name ?? '' }) };
      }
    }
  }
};
