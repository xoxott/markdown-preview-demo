/** BashTool — Shell 命令执行工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ToolUseContext,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { BashInput } from '../types/tool-inputs';
import type { BashOutput } from '../types/tool-outputs';
import { BashInputSchema } from '../types/tool-inputs';
import { truncateOutput } from '../utils/output-truncate';
import { assessBashCommandSecurity } from './bash-security';
import { DEFAULT_BASH_PERMISSION_RULES, matchBashPermissionRule } from './bash-permission-rules';
import type { BashPermissionRule } from './bash-permission-rules';

/** 最大超时时间（10 分钟） */
const MAX_TIMEOUT_MS = 600_000;

/** BashTool 输出截断限制 */
const BASH_MAX_OUTPUT_CHARS = 100_000;

/**
 * BashTool — Shell 命令执行
 *
 * - isReadOnly: false — 命令可能有副作用
 * - isConcurrencySafe: false — 命令可能有副作用
 * - safetyLabel: 'system' — 最保守标签（可执行任意代码）
 * - isDestructive: false — 命令本身不一定是破坏性（取决于具体命令）
 * - checkPermissions: ask — 所有命令需要权限确认（安全完全委托宿主）
 * - validateInput: 命令非空 + 超时不超过 10 分钟
 */
export const bashTool = buildTool<BashInput, BashOutput>({
  name: 'bash',

  inputSchema: BashInputSchema,

  description: async input => {
    const desc = input.description ?? input.command.substring(0, 50);
    return `Execute command: ${desc}`;
  },

  isReadOnly: (input: BashInput) => {
    const assessment = assessBashCommandSecurity(input.command);
    return assessment.isReadOnly;
  },
  isConcurrencySafe: () => false,
  safetyLabel: (input: BashInput) => {
    const assessment = assessBashCommandSecurity(input.command);
    if (assessment.safetyLevel === 'safe') return 'readonly' as SafetyLabel;
    if (assessment.safetyLevel === 'dangerous') return 'destructive' as SafetyLabel;
    return 'system' as SafetyLabel;
  },
  isDestructive: (input: BashInput) => {
    const assessment = assessBashCommandSecurity(input.command);
    return assessment.hasDestructive;
  },

  validateInput: (input: BashInput): ValidationResult => {
    if (input.command === '') {
      return { behavior: 'deny', message: 'Command must not be empty', reason: 'empty_command' };
    }

    if (input.timeout !== undefined && input.timeout > MAX_TIMEOUT_MS) {
      return {
        behavior: 'deny',
        message: `Timeout must not exceed ${MAX_TIMEOUT_MS}ms (10 minutes)`,
        reason: 'timeout_exceeded'
      };
    }

    return { behavior: 'allow' };
  },

  checkPermissions: (input: BashInput, context: ToolUseContext): PermissionResult => {
    // Step 1: 规则引擎匹配（deny > ask > allow优先级）
    // 从context中获取自定义规则，或使用默认规则
    const customRules = (context as unknown as Record<string, unknown>)?.bashPermissionRules as
      | readonly BashPermissionRule[]
      | undefined;
    const rules = customRules ?? DEFAULT_BASH_PERMISSION_RULES;
    const ruleMatch = matchBashPermissionRule(input.command, rules);

    if (ruleMatch.behavior === 'deny') {
      return {
        behavior: 'deny',
        message: ruleMatch.reason
      };
    }

    if (ruleMatch.behavior === 'allow' && ruleMatch.matchedRule) {
      // 规则引擎allow → 还需检查安全评估（allow规则不能覆盖安全约束）
      const assessment = assessBashCommandSecurity(input.command);
      if (assessment.safetyLevel === 'dangerous') {
        // 规则allow但安全评估dangerous → deny（安全优先）
        return {
          behavior: 'deny',
          message: assessment.recommendation
        };
      }
      return {
        behavior: 'allow',
        decisionReason: ruleMatch.reason
      };
    }

    // Step 2: 安全评估（无规则匹配或ask规则）
    const assessment = assessBashCommandSecurity(input.command);
    // 安全级别映射:
    // - safe → allow（只读命令可自动允许）
    // - dangerous → deny（破坏性命令自动拒绝）
    // - caution → ask（需权限确认）
    if (assessment.safetyLevel === 'safe') {
      return {
        behavior: 'allow',
        decisionReason: assessment.recommendation
      };
    }
    if (assessment.safetyLevel === 'dangerous') {
      return {
        behavior: 'deny',
        message: assessment.recommendation
      };
    }
    // caution — 需权限确认，附带安全评估信息
    return {
      behavior: 'ask',
      message: input.description ?? `Execute command: "${input.command}"`,
      decisionReason: assessment.recommendation
    };
  },

  call: async (
    input: BashInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<BashOutput>> => {
    const timeout = input.timeout ?? 120_000;

    const result = await context.fsProvider.runCommand(input.command, {
      timeout,
      runInBackground: input.runInBackground
    });

    // 截断 stdout/stderr
    let stdout = result.stdout;
    let stderr = result.stderr;
    let truncated = false;

    if (stdout.length > BASH_MAX_OUTPUT_CHARS) {
      stdout = truncateOutput(stdout, BASH_MAX_OUTPUT_CHARS).content;
      truncated = true;
    }
    if (stderr.length > BASH_MAX_OUTPUT_CHARS) {
      stderr = truncateOutput(stderr, BASH_MAX_OUTPUT_CHARS).content;
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

  toAutoClassifierInput: (input: BashInput) => {
    const assessment = assessBashCommandSecurity(input.command);
    return {
      toolName: 'bash',
      input,
      safetyLabel:
        assessment.safetyLevel === 'safe'
          ? 'readonly'
          : assessment.safetyLevel === 'dangerous'
            ? 'destructive'
            : 'system',
      isReadOnly: assessment.isReadOnly,
      isDestructive: assessment.hasDestructive
    };
  },

  maxResultSizeChars: 100_000
});
