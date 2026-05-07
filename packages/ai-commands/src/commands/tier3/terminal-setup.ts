/** /terminal-setup SkillDefinition — 终端 shell 集成安装 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { TerminalSetupPromptInput } from '../../types/command-result';
import { TerminalSetupArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { TERMINAL_SETUP_TITLE } from '../../constants';

/** 构建 terminal-setup prompt — 纯函数 */
export function buildTerminalSetupPrompt(input: TerminalSetupPromptInput): string {
  if (input.uninstall) {
    return `${TERMINAL_SETUP_TITLE}\n\nShell integration removed from **${input.rcPath}** (${input.shell}).`;
  }
  if (input.installed) {
    return `${TERMINAL_SETUP_TITLE}\n\nShell integration installed for **${input.shell}** → ${input.rcPath}.\nRestart your terminal or run \`source ${input.rcPath}\` to activate.`;
  }
  return `${TERMINAL_SETUP_TITLE}\n\nShell integration could not be installed. Check file permissions for ${input.rcPath}.`;
}

/** /terminal-setup SkillDefinition */
export const terminalSetupSkill: SkillDefinition = {
  name: 'terminal-setup',
  description: 'Install or uninstall terminal shell integration (prompt marks, hooks)',
  aliases: [],
  argumentHint: '[--uninstall]',
  whenToUse:
    'Use when you want to set up improved terminal integration with shell hooks and prompt marks',
  allowedTools: ['bash', 'file-read', 'file-write', 'file-edit'],
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const fs = extContext.fsProvider;

    if (!fs) {
      return {
        content:
          'Error: terminal-setup requires FileSystemProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, TerminalSetupArgsSchema, tokens => ({
      uninstall: tokens.includes('uninstall'),
      shell: tokens.find(t => !t.startsWith('-'))
    }));

    // 检测 shell
    const shell = parsed.shell ?? process.env.SHELL?.split('/').pop() ?? 'zsh';
    const rcFile = shell === 'bash' ? '.bashrc' : shell === 'zsh' ? '.zshrc' : `.${shell}rc`;
    const homeDir = process.env.HOME ?? '/tmp';
    const rcPath = `${homeDir}/${rcFile}`;

    if (parsed.uninstall) {
      // 宿主实现具体卸载逻辑，这里只返回提示
      const prompt = buildTerminalSetupPrompt({ shell, rcPath, installed: false, uninstall: true });
      return { content: prompt };
    }

    // 宿主实现具体安装逻辑，这里只返回提示
    const prompt = buildTerminalSetupPrompt({ shell, rcPath, installed: true });
    return { content: prompt };
  }
};
