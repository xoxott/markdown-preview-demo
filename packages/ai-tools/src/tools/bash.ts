/** BashTool — Shell 命令执行工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { BashInput } from '../types/tool-inputs';
import type { BashOutput } from '../types/tool-outputs';
import { BashInputSchema } from '../types/tool-inputs';
import { truncateOutput } from '../utils/output-truncate';

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

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => false,

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

  checkPermissions: (input: BashInput): PermissionResult => {
    // 所有命令需要权限确认 — 安全完全委托宿主
    // 宿主的权限管线处理：
    // - 规则匹配: allowRules/denyRules for Bash patterns
    // - 模式决策: restricted denies, auto requires classifier
    // - 分类器评估: BashCommandClassifier（宿主注入）
    // - 用户确认: promptHandler/canUseToolFn
    return {
      behavior: 'ask',
      message: input.description ?? `Execute command: "${input.command}"`
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

  toAutoClassifierInput: (input: BashInput) => ({
    toolName: 'bash',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
