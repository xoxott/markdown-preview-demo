/**
 * PowerShell 安全评估 — 参考 Claude Code powershellSecurity / readOnlyValidation 的分层， 用纯 TypeScript
 * 启发式实现（无 PS AST）。用于 isReadOnly、safetyLabel、checkPermissions。
 */

export interface PowerShellSecurityAssessment {
  readonly safetyLevel: 'safe' | 'caution' | 'dangerous';
  readonly isReadOnly: boolean;
  readonly hasDestructive: boolean;
  readonly recommendation: string;
}

const DANGEROUS_SUBSTRINGS = [
  'format-volume',
  'initialize-disk',
  'clear-disk',
  'repair-volume',
  'clear-recyclebin',
  'stop-computer',
  'restart-computer',
  'disable-computerrestore',
  'enable-computerrestore',
  'remove-wmiobject',
  'bcdedit',
  'shutdown.exe'
];

function matchesRecursiveRemoval(script: string): boolean {
  return (
    /\b(remove-item|ri|rm|del|rmdir|erase)\b[^;\n`'|]*-recurse\b/i.test(script) ||
    /\b(remove-item|ri|rm)\b[^;\n]*-force\b[^;\n]*-recurse\b/i.test(script) ||
    /\b(remove-item|ri|rm)\b[^;\n]*-recurse\b[^;\n]*-force\b/i.test(script)
  );
}

const NETWORK_OR_FETCH = /\b(invoke-webrequest|iwr|invoke-restmethod|irm)\b|\bcurl\b|\bwget\b/i;

/** 不显式枚举 iex — 正则处理词边界 */

const SCRIPT_INJECTION_HINTS =
  /\binvoke-expression\b|\binvoke-command\b|[;&|]\s*iex\b|\biex\b\s|system\.net\.webclient|downloadstring|downloadfile|from-base64string|reflection\.assembly|\badd-type\b/i;

const NESTED_PWSH_LINE = /\b(pwsh|powershell)(\.exe)?\b\s+(?:-|[^\n])/i;

const WRITE_CMDLET =
  /\b(set-content|sc\b|add-content|ac\b|out-file|export-csv|export-clixml|new-item|copy-item|move-item|rename-item|clear-content|expand-archive|set-acl|icacls|takeown|start-process|ni\b|mkdir|md\b|cp\b|cpi\b|mv\b|ren\b)\b/i;

const GIT_SENSITIVE_UNDER_DOT_GIT =
  /\.git(\\|\/)(hooks|objects|refs|packed-refs|HEAD|config)([^a-z]|$)/i;

const READ_HEAD_CMD =
  /^\s*(get-(?:childitem|content|item|location|process|service|command|module|verb|alias|date|helpsystem)|test-path|select-string|measure-object|measure-command|compare-object|resolve-path|split-path|join-path|gal|pwd|gl|gc|cat|ls|dir|gci|gps|hostname|whoami)\b/i;

/** 允许的管道后继 cmdlet（小写前缀） */
const SAFE_PIPELINE_START = [
  'where-object',
  '? ',
  '?{',
  'sort-object',
  'sort ',
  'select-object',
  'select ',
  'measure-object',
  '% ',
  'foreach-object',
  'foreach ',
  '%{',
  'tee-object',
  'format-table',
  'ft ',
  'format-list',
  'fl '
];

function pipeTailIsSafe(segment: string): boolean {
  const t = segment.trim();
  const low = t.toLowerCase();
  return SAFE_PIPELINE_START.some(
    prefix => low === prefix.trimEnd() || low.startsWith(prefix) || low.startsWith('? ')
  );
}

/** 每条 `;` 分段只做「列举式读 + 可选安全管道」，无写/无抓取/无 iex */
function looksLikeNarrowReadOnlyScript(trimmed: string): boolean {
  const stmts = trimmed
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  if (SCRIPT_INJECTION_HINTS.test(trimmed)) return false;

  if (/-enc\d*\b|-encodedcommand\b/i.test(trimmed)) return false;

  for (const line of trimmed
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean)) {
    if (NESTED_PWSH_LINE.test(line)) return false;
  }

  for (const stmt of stmts) {
    if (NETWORK_OR_FETCH.test(stmt)) return false;
    if (WRITE_CMDLET.test(stmt)) return false;

    const parts = stmt.split('|').map(s => s.trim());
    const head = parts[0];
    if (!head || !READ_HEAD_CMD.test(head)) return false;

    for (let i = 1; i < parts.length; i++) {
      if (!pipeTailIsSafe(parts[i]!)) return false;
    }
  }

  return true;
}

function destructiveGitTargeting(script: string, lower: string): boolean {
  if (!GIT_SENSITIVE_UNDER_DOT_GIT.test(script)) return false;
  return WRITE_CMDLET.test(lower) || NETWORK_OR_FETCH.test(lower);
}

/**
 * 对「用户提交的 PowerShell 脚本」做静态评估（不经 Parser）。
 *
 * dangerous: 分区/格式化/关机/递归删等； safe: 短脚本 + 窄只读分段； caution: 写 cmdlet / 抓取 / iex / 归类失败。
 */
export function assessPowerShellCommandSecurity(script: string): PowerShellSecurityAssessment {
  const trimmed = script.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed.length) {
    return {
      safetyLevel: 'caution',
      isReadOnly: false,
      hasDestructive: false,
      recommendation: 'Empty script'
    };
  }

  if (destructiveGitTargeting(trimmed, lower)) {
    return {
      safetyLevel: 'dangerous',
      isReadOnly: false,
      hasDestructive: true,
      recommendation: 'Mutation targeting .git internals'
    };
  }

  for (const s of DANGEROUS_SUBSTRINGS) {
    if (lower.includes(s)) {
      return {
        safetyLevel: 'dangerous',
        isReadOnly: false,
        hasDestructive: true,
        recommendation: `Dangerous operation: ${s}`
      };
    }
  }

  if (matchesRecursiveRemoval(trimmed)) {
    return {
      safetyLevel: 'dangerous',
      isReadOnly: false,
      hasDestructive: true,
      recommendation: 'Forced or recursive deletion'
    };
  }

  if (SCRIPT_INJECTION_HINTS.test(lower)) {
    return {
      safetyLevel: 'caution',
      isReadOnly: false,
      hasDestructive: false,
      recommendation: 'Invocation / reflection / encoded payload hints'
    };
  }

  if (NETWORK_OR_FETCH.test(trimmed)) {
    return {
      safetyLevel: 'caution',
      isReadOnly: false,
      hasDestructive: false,
      recommendation: 'Network or web fetch cmdlet'
    };
  }

  if (WRITE_CMDLET.test(trimmed)) {
    return {
      safetyLevel: 'caution',
      isReadOnly: false,
      hasDestructive: false,
      recommendation: 'Write or process-spawn cmdlet'
    };
  }

  if (
    /^\s*git\s+(log|status|diff|show|branch|remote|rev-parse)\b/i.test(trimmed) &&
    trimmed.length <= 8000
  ) {
    return {
      safetyLevel: 'safe',
      isReadOnly: true,
      hasDestructive: false,
      recommendation: 'Git read-only'
    };
  }

  if (trimmed.length <= 8192 && looksLikeNarrowReadOnlyScript(trimmed)) {
    return {
      safetyLevel: 'safe',
      isReadOnly: true,
      hasDestructive: false,
      recommendation: 'Heuristic read-only'
    };
  }

  return {
    safetyLevel: 'caution',
    isReadOnly: false,
    hasDestructive: false,
    recommendation: 'Unclassified — confirm before execution'
  };
}
