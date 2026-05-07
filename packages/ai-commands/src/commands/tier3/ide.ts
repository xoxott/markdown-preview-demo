/** /ide SkillDefinition — 列出/连接/断开 IDE */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { IdePromptInput } from '../../types/command-result';
import { IdeArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { IDE_TITLE } from '../../constants';

export function buildIdePrompt(input: IdePromptInput): string {
  const lines: string[] = [IDE_TITLE, ''];
  switch (input.action) {
    case 'list':
      if (!input.instances || input.instances.length === 0) {
        lines.push('No IDE instances detected.');
        return lines.join('\n');
      }
      for (const ide of input.instances) {
        const isConnected = ide.id === input.connectedId ? ' [connected]' : '';
        lines.push(
          `- [${ide.id}] ${ide.name}${isConnected}${ide.workspace ? ` · ${ide.workspace}` : ''}`
        );
      }
      return lines.join('\n');
    case 'status':
      lines.push(
        input.connectedId ? `Connected to IDE: ${input.connectedId}` : 'No IDE currently connected.'
      );
      return lines.join('\n');
    case 'connect':
      lines.push(
        input.success
          ? `Connected to IDE ${input.connectedId ?? '<unknown>'}.`
          : `Failed to connect to IDE: ${input.error ?? 'unknown error'}`
      );
      return lines.join('\n');
    case 'disconnect':
      lines.push('Disconnected from IDE.');
      return lines.join('\n');
    default:
      return lines.join('\n');
  }
}

export const ideSkill: SkillDefinition = {
  name: 'ide',
  description: 'List, connect to, or disconnect from an IDE',
  aliases: [],
  argumentHint: '[list|connect|disconnect|status] [id]',
  whenToUse: 'Use to bridge the CLI session to a running IDE',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.ideProvider;
    if (!provider) {
      return {
        content: 'Error: /ide requires IDEProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, IdeArgsSchema, tokens => {
      if (tokens.length === 0) return { subcommand: 'list' };
      return { subcommand: tokens[0], id: tokens[1] };
    });
    const action = parsed.subcommand ?? 'list';

    if (action === 'list') {
      const instances = await provider.list();
      const connectedId = await provider.getConnectedId();
      return { content: buildIdePrompt({ action, instances, connectedId }) };
    }
    if (action === 'status') {
      const connectedId = await provider.getConnectedId();
      return { content: buildIdePrompt({ action, connectedId }) };
    }
    if (action === 'disconnect') {
      await provider.disconnect();
      return { content: buildIdePrompt({ action, success: true }) };
    }
    if (action === 'connect') {
      if (!parsed.id) {
        return { content: `${IDE_TITLE}\n\nconnect requires an IDE id.` };
      }
      const result = await provider.connect(parsed.id);
      return {
        content: buildIdePrompt({
          action,
          connectedId: result.success ? parsed.id : null,
          success: result.success,
          error: result.error
        })
      };
    }
    return { content: `${IDE_TITLE}\n\nUnknown subcommand: ${String(action)}` };
  }
};
