/**
 * PowerShell 执行 — Windows powershell.exe，Unix pwsh；-EncodedCommand 传脚本。
 *
 * 安全与权限分层参考 Claude Code：规则引擎（大小写不敏感） + 静态安全评估， 无 PS AST 解析器（与 upstream 的差异见 powershell-security.ts
 * 头注释）。
 */

import { Buffer } from 'node:buffer';
import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  ToolResult,
  ToolUseContext,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { PowerShellInput } from '../types/tool-inputs';
import type { BashOutput } from '../types/tool-outputs';
import { PowerShellInputSchema } from '../types/tool-inputs';
import { truncateOutput } from '../utils/output-truncate';
import { persistLargeOutput, truncateOutputWithTail } from '../utils/output-truncate-end';
import type { BashPermissionRule } from './bash-permission-rules';
import {
  DEFAULT_POWERSHELL_PERMISSION_RULES,
  matchPowerShellPermissionRule
} from './powershell-permission-rules';
import { assessPowerShellCommandSecurity } from './powershell-security';

const MAX_TIMEOUT_MS = 600_000;
const MAX_OUT = 100_000;

function wrapPowerShellForFsProvider(script: string): string {
  const payload = Buffer.from(script, 'utf16le').toString('base64');
  if (process.platform === 'win32') {
    return `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${payload}`;
  }
  return `pwsh -NoProfile -NonInteractive -EncodedCommand ${payload}`;
}

function resolvePowerShellRules(context: ExtendedToolUseContext): readonly BashPermissionRule[] {
  const list = context.powershellPermissionRules;
  if (Array.isArray(list) && list.length > 0) return list;
  return DEFAULT_POWERSHELL_PERMISSION_RULES;
}

export const powershellTool = buildTool<PowerShellInput, BashOutput>({
  name: 'powershell',

  inputSchema: PowerShellInputSchema,

  description: async input => {
    const desc = input.description ?? input.command.substring(0, 50);
    return `PowerShell: ${desc}`;
  },

  isReadOnly: (input: PowerShellInput) =>
    assessPowerShellCommandSecurity(input.command.trim()).isReadOnly,

  isConcurrencySafe: () => false,

  safetyLabel: (input: PowerShellInput) => {
    const a = assessPowerShellCommandSecurity(input.command.trim());
    if (a.safetyLevel === 'safe') return 'readonly';
    if (a.safetyLevel === 'dangerous') return 'destructive';
    return 'system';
  },

  isDestructive: (input: PowerShellInput) =>
    assessPowerShellCommandSecurity(input.command.trim()).hasDestructive,

  validateInput: (input: PowerShellInput): ValidationResult => {
    if (!input.command.trim()) {
      return { behavior: 'deny', message: 'command must not be empty', reason: 'empty_command' };
    }
    if (input.timeout !== undefined && input.timeout > MAX_TIMEOUT_MS) {
      return {
        behavior: 'deny',
        message: `Timeout must not exceed ${MAX_TIMEOUT_MS}ms`,
        reason: 'timeout_exceeded'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (input: PowerShellInput, context: ToolUseContext): PermissionResult => {
    const cmd = input.command.trim();
    const assessment = assessPowerShellCommandSecurity(cmd);
    const ext = context as ExtendedToolUseContext;
    const rules = resolvePowerShellRules(ext);

    const ruleMatch = matchPowerShellPermissionRule(cmd, rules);

    if (ruleMatch.behavior === 'deny') {
      return {
        behavior: 'deny',
        message: ruleMatch.reason,
        decisionReason: 'powershell_permission_rule_deny'
      };
    }

    if (assessment.safetyLevel === 'dangerous') {
      return {
        behavior: 'deny',
        message: assessment.recommendation,
        decisionReason: 'powershell_security_dangerous'
      };
    }

    if (
      ruleMatch.behavior === 'allow' &&
      ruleMatch.matchedRule &&
      assessment.safetyLevel !== 'dangerous'
    ) {
      return {
        behavior: 'allow',
        decisionReason: ruleMatch.reason
      };
    }

    if (assessment.safetyLevel === 'safe') {
      return {
        behavior: 'allow',
        decisionReason: assessment.recommendation
      };
    }

    return {
      behavior: 'ask',
      message: input.description ?? assessment.recommendation,
      decisionReason: assessment.recommendation
    };
  },

  call: async (
    input: PowerShellInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<BashOutput>> => {
    const timeout = input.timeout ?? 120_000;
    const wrapped = wrapPowerShellForFsProvider(input.command);
    const result = await context.fsProvider.runCommand(wrapped, {
      timeout,
      runInBackground: input.runInBackground
    });

    let stdout = result.stdout;
    let stderr = result.stderr;
    let truncated = false;

    const persist = persistLargeOutput(stdout);
    if (persist.persisted) {
      stdout = persist.content;
      truncated = true;
    } else if (stdout.length > MAX_OUT) {
      stdout = truncateOutputWithTail(stdout, MAX_OUT).content;
      truncated = true;
    }
    if (stderr.length > MAX_OUT) {
      stderr = truncateOutput(stderr, MAX_OUT).content;
      truncated = true;
    }

    return {
      data: {
        exitCode: result.exitCode,
        stdout,
        stderr,
        timedOut: result.timedOut,
        cwd: result.cwd
      },
      metadata: truncated ? { truncated: true } : undefined
    };
  },

  toAutoClassifierInput: (input: PowerShellInput) => {
    const a = assessPowerShellCommandSecurity(input.command.trim());
    let safetyLabel: 'readonly' | 'destructive' | 'system' = 'system';
    if (a.safetyLevel === 'safe') safetyLabel = 'readonly';
    else if (a.safetyLevel === 'dangerous') safetyLabel = 'destructive';
    return {
      toolName: 'powershell',
      input,
      safetyLabel,
      isReadOnly: a.isReadOnly,
      isDestructive: a.hasDestructive
    };
  },

  maxResultSizeChars: MAX_OUT
});
