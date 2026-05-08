/** PowerShell 权限规则 — 结构与 bash BashPermissionRule 一致，匹配时 cmdlet 不分大小写。 */

import type { BashPermissionRule } from './bash-permission-rules';

/** 权限规则匹配结果（与 Bash 对齐） */
export interface PowerShellPermissionMatchResult {
  readonly matchedRule: BashPermissionRule | null;
  readonly allMatches: readonly BashPermissionRule[];
  readonly behavior: 'deny' | 'ask' | 'allow';
  readonly reason: string;
}

function wildcardMatch(pattern: string, str: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`, 'i').test(str);
}

function matchesRuleCaseInsensitive(trimmed: string, rule: BashPermissionRule): boolean {
  const c = trimmed;
  const p = rule.pattern;
  const lc = c.toLowerCase();
  const lp = p.toLowerCase();

  switch (rule.patternType) {
    case 'exact':
      return lc === lp;
    case 'prefix':
      return lc === lp || lc.startsWith(`${lp} `);
    case 'wildcard':
      return wildcardMatch(p, trimmed);
    case 'regex':
      try {
        return new RegExp(rule.pattern, 'i').test(trimmed);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

const behaviorPriority: Record<string, number> = { deny: 0, ask: 1, allow: 2 };
const typePriority: Record<string, number> = { exact: 0, prefix: 1, wildcard: 2, regex: 3 };

export function matchPowerShellPermissionRule(
  command: string,
  rules: readonly BashPermissionRule[]
): PowerShellPermissionMatchResult {
  const trimmed = command.trim();
  const matches: BashPermissionRule[] = [];

  for (const rule of rules) {
    if (matchesRuleCaseInsensitive(trimmed, rule)) matches.push(rule);
  }

  matches.sort((a, b) => {
    const behDiff = behaviorPriority[a.behavior] - behaviorPriority[b.behavior];
    if (behDiff !== 0) return behDiff;
    return typePriority[a.patternType] - typePriority[b.patternType];
  });

  if (matches.length === 0) {
    return {
      matchedRule: null,
      allMatches: [],
      behavior: 'ask',
      reason: 'No matching PowerShell permission rule → default ask'
    };
  }

  const top = matches[0];
  return {
    matchedRule: top,
    allMatches: matches,
    behavior: top.behavior,
    reason: top.description ?? `PowerShell rule ${top.pattern} (${top.patternType}/${top.behavior})`
  };
}

/** 默认规则（精简版）；宿主可通过 context.powershellPermissionRules 替换或扩展。 */
export const DEFAULT_POWERSHELL_PERMISSION_RULES: readonly BashPermissionRule[] = [
  {
    ruleId: 'ps_deny_volume',
    pattern: 'Format-Volume',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 格式化卷'
  },
  {
    ruleId: 'ps_deny_rm_recurse_star',
    pattern: '^Remove-Item\\b.*-Recurse.*\\*',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 递归通配删除'
  },
  {
    ruleId: 'ps_allow_git_status',
    pattern: 'git status',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git status'
  },
  {
    ruleId: 'ps_allow_git_log',
    pattern: 'git log',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git log'
  },
  {
    ruleId: 'ps_allow_git_diff',
    pattern: 'git diff',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git diff'
  }
];
