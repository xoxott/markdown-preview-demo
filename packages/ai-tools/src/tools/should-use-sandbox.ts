/**
 * shouldUseSandbox — Bash命令沙箱判定
 *
 * 对齐 Claude Code BashTool/shouldUseSandbox.ts:
 *
 * 判定bash命令是否应在沙箱中执行:
 *
 * 1. sandboxing 未启用 → 不使用沙箱
 * 2. dangerouslyDisableSandbox=true → 不使用沙箱
 * 3. 命令在 excludedCommands 中 → 不使用沙箱
 * 4. 其他 → 使用沙箱
 *
 * 注: excludedCommands 是便利功能而非安全边界， 实际安全控制由权限系统（prompt + classify）保障。
 */

import type { SandboxSettings } from '@suga/ai-sdk';

// ============================================================
// 类型定义
// ============================================================

/** shouldUseSandbox 输入 */
export interface ShouldUseSandboxInput {
  /** bash命令 */
  readonly command?: string;
  /** 是否显式禁用沙箱 */
  readonly dangerouslyDisableSandbox?: boolean;
  /** 沙箱设置 */
  readonly sandbox?: SandboxSettings;
  /** 是否启用沙箱（默认true，由宿主决定） */
  readonly isSandboxingEnabled?: boolean;
}

// ============================================================
// 命令解析工具
// ============================================================

/**
 * splitSubcommands — 将复合命令拆分为子命令
 *
 * 支持 && 和 ; 分隔符:
 *
 * - "ls && cat file.txt" → ["ls", "cat file.txt"]
 * - "echo a; echo b" → ["echo a", "echo b"]
 */
export function splitSubcommands(command: string): string[] {
  // 按 && 和 ; 分隔
  const parts = command
    .split(/&&|;/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return parts;
}

/**
 * stripEnvVars — 去除命令前缀的环境变量设置
 *
 * "FOO=bar bazel run" → "bazel run" "A=1 B=2 echo hi" → "echo hi"
 */
export function stripEnvVars(command: string): string {
  // 匹配连续的 VAR=value 前缀（必须后面有空格，说明还有命令）
  const envPattern = /^[A-Za-z_][A-Za-z0-9_]*=\S+\s+/;
  let stripped = command.trim();
  while (envPattern.test(stripped)) {
    stripped = stripped.replace(envPattern, '');
  }
  // 如果只剩下 VAR=value（没有后续命令），返回空字符串
  if (/^[A-Za-z_][A-Za-z0-9_]*=\S*$/.test(stripped) && !stripped.includes(' ')) {
    return '';
  }
  return stripped.trim();
}

/**
 * stripSafeWrappers — 去除安全包装命令
 *
 * "timeout 30 bazel run" → "bazel run" "nice -n 19 python script" → "python script"
 */
export function stripSafeWrappers(command: string): string {
  const wrappers = ['timeout', 'time', 'nice', 'ionice', 'env', 'nohup', 'stdbuf', 'unbuffer'];
  let stripped = command.trim();

  for (const wrapper of wrappers) {
    // 只strip wrapper 和它的一个参数（如 timeout 30, nice -n）
    // 匹配 "wrapper <one_arg> <rest>"
    const pattern = new RegExp(`^${wrapper}\\s+\\S+\\s+`);
    if (pattern.test(stripped)) {
      stripped = stripped.replace(pattern, '');
    }
    // 也处理无参数的 wrapper（如 "env command"）
    const patternNoArg = new RegExp(`^${wrapper}\\s+`);
    if (patternNoArg.test(stripped) && !pattern.test(stripped)) {
      stripped = stripped.replace(patternNoArg, '');
    }
  }

  return stripped.trim();
}

// ============================================================
// excludedCommands 匹配
// ============================================================

/** 排除命令规则类型 */
interface ExcludedRule {
  readonly type: 'prefix' | 'exact' | 'wildcard';
  readonly pattern: string;
}

/**
 * parseExcludedRule — 解析排除命令规则
 *
 * - "bazel:*" → prefix 规则（匹配 bazel 和 bazel run 等）
 * - "ls" → exact 规则（只匹配 ls）
 * - "*.py" → wildcard 规则
 */
export function parseExcludedRule(pattern: string): ExcludedRule {
  if (pattern.endsWith(':*')) {
    return { type: 'prefix', pattern: pattern.slice(0, -2) };
  }
  if (pattern.includes('*') || pattern.includes('?')) {
    return { type: 'wildcard', pattern };
  }
  return { type: 'exact', pattern };
}

/** matchExcludedRule — 检查命令是否匹配排除规则 */
export function matchExcludedRule(command: string, rule: ExcludedRule): boolean {
  const cmd = command.trim();

  switch (rule.type) {
    case 'prefix':
      return cmd === rule.pattern || cmd.startsWith(`${rule.pattern} `);
    case 'exact':
      return cmd === rule.pattern;
    case 'wildcard':
      return matchWildcardPattern(rule.pattern, cmd);
    default:
      return false;
  }
}

/**
 * matchWildcardPattern — 通配符模式匹配
 *
 * 支持 * (匹配任意字符序列) 和 ? (匹配单个字符)
 */
export function matchWildcardPattern(pattern: string, str: string): boolean {
  // 将通配符模式转换为正则
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    .replace(/\*/g, '.*') // * → .*
    .replace(/\?/g, '.'); // ? → .
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(str);
}

/**
 * containsExcludedCommand — 检查命令是否包含排除命令
 *
 * 将复合命令拆分为子命令，对每个子命令:
 *
 * 1. 直接匹配
 * 2. 去除环境变量后匹配
 * 3. 去除安全包装后匹配
 */
export function containsExcludedCommand(
  command: string,
  excludedCommands?: readonly string[]
): boolean {
  if (!excludedCommands || excludedCommands.length === 0) return false;

  const subcommands = splitSubcommands(command);

  for (const subcommand of subcommands) {
    // 生成候选命令列表（原始 + 去env + 倒wrapper）
    const candidates = [subcommand.trim()];
    const envStripped = stripEnvVars(subcommand);
    if (envStripped !== candidates[0]) candidates.push(envStripped);
    const wrapperStripped = stripSafeWrappers(subcommand);
    if (wrapperStripped !== candidates[0] && wrapperStripped !== envStripped) {
      candidates.push(wrapperStripped);
    }

    for (const pattern of excludedCommands) {
      const rule = parseExcludedRule(pattern);
      for (const cand of candidates) {
        if (matchExcludedRule(cand, rule)) return true;
      }
    }
  }

  return false;
}

// ============================================================
// shouldUseSandbox
// ============================================================

/**
 * shouldUseSandbox — 判定bash命令是否应在沙箱中执行
 *
 * 逻辑顺序:
 *
 * 1. sandboxing 未启用 → false
 * 2. dangerouslyDisableSandbox=true → false
 * 3. 无命令 → false
 * 4. 命令在 excludedCommands 中 → false
 * 5. 其他 → true
 */
export function shouldUseSandbox(input: ShouldUseSandboxInput): boolean {
  // 1. sandboxing 未启用
  if (input.isSandboxingEnabled === false) return false;

  // 2. dangerouslyDisableSandbox=true
  if (input.dangerouslyDisableSandbox) return false;

  // 3. 无命令
  if (!input.command) return false;

  // 4. excludedCommands 匹配
  const excludedCommands = input.sandbox?.excludedCommands ?? [];
  if (containsExcludedCommand(input.command, excludedCommands)) return false;

  // 5. 默认使用沙箱
  return true;
}
