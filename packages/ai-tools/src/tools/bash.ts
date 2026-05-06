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
import { persistLargeOutput, truncateOutputWithTail } from '../utils/output-truncate-end';
import { assessBashCommandSecurity } from './bash-security';
import {
  DEFAULT_BASH_PERMISSION_RULES,
  hasUnsafeEnvVars,
  matchBashPermissionRule
} from './bash-permission-rules';
import type { BashPermissionRule } from './bash-permission-rules';
import { parseSedEditCommand } from './sedEditParser';
import {
  checkSedConstraints,
  containsDangerousOperations,
  sedCommandIsAllowedByAllowlist
} from './sedValidation';
import { shouldUseSandbox } from './should-use-sandbox';
import { interpretCommandResult } from './bash-interpret';
import { detectSleepCommand } from './bash-sleep-detect';

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
    // G22: sleep检测重定向 — 检测纯sleep命令(N>=2)并建议后台/monitor替代
    const sleepDetect = detectSleepCommand(input.command);
    if (sleepDetect.isSleepCommand) {
      return {
        behavior: 'ask',
        message: sleepDetect.suggestion ?? 'sleep命令较长，建议使用后台运行',
        decisionReason: 'sleep_redirect_suggestion'
      };
    }

    // G7: sed -i 拦截 — 检测是否为可拦截的 sed -i 命令
    const sedInfo = parseSedEditCommand(input.command);
    if (sedInfo) {
      // sed 拦截路径: 安全验证 → ask（附带 sedEditInfo 供宿主展示 diff 预览）
      const constraints = checkSedConstraints(sedInfo);
      if (!constraints.allowed) {
        return {
          behavior: 'deny',
          message: constraints.reason
        };
      }

      const dangerous = containsDangerousOperations(input.command);
      if (dangerous.hasDangerous) {
        return {
          behavior: 'deny',
          message: `Dangerous sed operations detected: ${dangerous.reasons.join('; ')}`
        };
      }

      if (!sedCommandIsAllowedByAllowlist(sedInfo)) {
        return {
          behavior: 'deny',
          message: 'sed pattern too complex for safe interception'
        };
      }

      // 可拦截的简单 sed -i → ask（宿主可在权限流程中注入 _simulatedSedEdit）
      return {
        behavior: 'ask',
        message: input.description ?? `Edit file via sed -i: "${sedInfo.filePath}"`,
        decisionReason: 'sed_in_place_intercept',
        metadata: { sedEditInfo: sedInfo }
      };
    }

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

    // Step 2a: 环境变量安全检查
    // 有不安全的环境变量设置 → caution → ask
    const unsafeEnvResult = hasUnsafeEnvVars(input.command);
    if (unsafeEnvResult && assessment.safetyLevel === 'safe') {
      // 只读命令但有不安全环境变量 → 需审核
      return {
        behavior: 'ask',
        message: input.description ?? `Execute command: "${input.command}"`,
        decisionReason: '命令包含不安全的环境变量设置'
      };
    }

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
    // G7: sed -i 拦截 — 如果宿主注入了预计算结果，直接通过 fsProvider 写入
    if (input._simulatedSedEdit) {
      const { filePath, newContent } = input._simulatedSedEdit;
      try {
        await context.fsProvider.writeFile(filePath, newContent);
        return {
          data: {
            exitCode: 0,
            stdout: `sed edit simulated: ${filePath}`,
            stderr: '',
            timedOut: false
          }
        };
      } catch (err) {
        return {
          data: {
            exitCode: 1,
            stdout: '',
            stderr: `Failed to write ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
            timedOut: false
          },
          error: `sed simulation write failed: ${filePath}`
        };
      }
    }

    const timeout = input.timeout ?? 120_000;

    // G20: 沙箱集成 — 判断是否需在沙箱中执行
    const useSandbox = shouldUseSandbox({
      command: input.command,
      dangerouslyDisableSandbox: context.dangerouslyDisableSandbox,
      sandbox: context.sandboxSettings,
      isSandboxingEnabled: context.isSandboxingEnabled
    });

    // 选择 fsProvider: 沙箱命令 → sandboxFsProvider，否则 → 原始 fsProvider
    const provider =
      useSandbox && context.sandboxFsProvider ? context.sandboxFsProvider : context.fsProvider;

    const result = await provider.runCommand(input.command, {
      timeout,
      runInBackground: input.runInBackground
    });

    // 截断 stdout/stderr — G23: 大输出持久化
    let stdout = result.stdout;
    let stderr = result.stderr;
    let truncated = false;
    let persistedOutputPath: string | undefined;
    let persistedOutputSize: number | undefined;

    // G23: 大输出 → 持久化到文件+摘要
    const stdoutPersist = persistLargeOutput(stdout);
    if (stdoutPersist.persisted) {
      stdout = stdoutPersist.content;
      persistedOutputPath = stdoutPersist.filePath;
      persistedOutputSize = stdoutPersist.originalSize;
      truncated = true;
    } else if (stdout.length > BASH_MAX_OUTPUT_CHARS) {
      // 中等大小 → 双段截断（头部+尾部保留）
      const tailResult = truncateOutputWithTail(stdout, BASH_MAX_OUTPUT_CHARS);
      stdout = tailResult.content;
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
      metadata:
        truncated || persistedOutputPath
          ? {
              ...(truncated ? { truncated: true } : {}),
              ...(persistedOutputPath ? { persistedOutputPath, persistedOutputSize } : {})
            }
          : undefined,
      // G25: 命令语义解释 — 非0退出码时添加人类可读描述
      ...(result.exitCode !== 0
        ? {
            newMessages: [
              {
                role: 'assistant' as const,
                content: interpretCommandResult(result.exitCode, result.stderr, result.timedOut)
                  .description
              }
            ]
          }
        : {})
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
