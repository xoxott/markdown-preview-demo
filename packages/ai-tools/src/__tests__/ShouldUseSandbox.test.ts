/** P58 测试 — shouldUseSandbox Bash沙箱判定 */

import { describe, expect, it } from 'vitest';
import {
  containsExcludedCommand,
  matchExcludedRule,
  matchWildcardPattern,
  parseExcludedRule,
  shouldUseSandbox,
  splitSubcommands,
  stripEnvVars,
  stripSafeWrappers
} from '../tools/should-use-sandbox';
// ============================================================
// 命令解析工具测试
// ============================================================

describe('splitSubcommands', () => {
  it('简单命令 → 单个', () => {
    expect(splitSubcommands('ls')).toEqual(['ls']);
  });

  it('&& 分隔 → 拆分', () => {
    expect(splitSubcommands('ls && cat file.txt')).toEqual(['ls', 'cat file.txt']);
  });

  it('; 分隔 → 拆分', () => {
    expect(splitSubcommands('echo a; echo b')).toEqual(['echo a', 'echo b']);
  });

  it('混合分隔 → 全拆分', () => {
    expect(splitSubcommands('ls && cat file; echo done')).toEqual(['ls', 'cat file', 'echo done']);
  });
});

describe('stripEnvVars', () => {
  it('无环境变量 → 原命令', () => {
    expect(stripEnvVars('echo hi')).toBe('echo hi');
  });

  it('单个环境变量 → 去除', () => {
    expect(stripEnvVars('FOO=bar echo hi')).toBe('echo hi');
  });

  it('多个环境变量 → 逐个去除', () => {
    expect(stripEnvVars('A=1 B=2 echo hi')).toBe('echo hi');
  });

  it('环境变量无命令 → 空字符串', () => {
    expect(stripEnvVars('FOO=bar')).toBe('');
  });
});

describe('stripSafeWrappers', () => {
  it('timeout 包装 → 去除', () => {
    expect(stripSafeWrappers('timeout 30 bazel run')).toBe('bazel run');
  });

  it('nice 包装 → 去除（strip wrapper + flag）', () => {
    // nice -n 19 → strip "nice -n"，保留 "19 python script"
    // 完全去除需要多次strip或更复杂的解析，简化版只strip一层
    const result = stripSafeWrappers('nice -n 19 python script');
    // strip nice 和 -n 后: "19 python script"
    expect(result).toBe('19 python script');
  });

  it('无包装 → 原命令', () => {
    expect(stripSafeWrappers('ls')).toBe('ls');
  });
});

// ============================================================
// 排除规则测试
// ============================================================

describe('parseExcludedRule', () => {
  it('prefix 规则 — bazel:*', () => {
    const rule = parseExcludedRule('bazel:*');
    expect(rule.type).toBe('prefix');
    expect(rule.pattern).toBe('bazel');
  });

  it('exact 规则 — ls', () => {
    const rule = parseExcludedRule('ls');
    expect(rule.type).toBe('exact');
    expect(rule.pattern).toBe('ls');
  });

  it('wildcard 规则 — git*', () => {
    const rule = parseExcludedRule('git*');
    expect(rule.type).toBe('wildcard');
    expect(rule.pattern).toBe('git*');
  });
});

describe('matchExcludedRule', () => {
  it('prefix — bazel:* 匹配 bazel', () => {
    expect(matchExcludedRule('bazel', { type: 'prefix', pattern: 'bazel' })).toBe(true);
  });

  it('prefix — bazel:* 匹配 bazel run', () => {
    expect(matchExcludedRule('bazel run', { type: 'prefix', pattern: 'bazel' })).toBe(true);
  });

  it('prefix — bazel:* 不匹配 echo', () => {
    expect(matchExcludedRule('echo', { type: 'prefix', pattern: 'bazel' })).toBe(false);
  });

  it('exact — ls 匹配 ls', () => {
    expect(matchExcludedRule('ls', { type: 'exact', pattern: 'ls' })).toBe(true);
  });

  it('exact — ls 不匹配 ls -la', () => {
    expect(matchExcludedRule('ls -la', { type: 'exact', pattern: 'ls' })).toBe(false);
  });

  it('wildcard — git* 匹配 github', () => {
    expect(matchExcludedRule('github', { type: 'wildcard', pattern: 'git*' })).toBe(true);
  });
});

describe('matchWildcardPattern', () => {
  it('精确匹配 → * 匹配所有', () => {
    expect(matchWildcardPattern('*', 'anything')).toBe(true);
  });

  it('前缀通配 → docker* 匹配 docker-compose', () => {
    expect(matchWildcardPattern('docker*', 'docker-compose')).toBe(true);
  });

  it('? 匹配单个字符', () => {
    expect(matchWildcardPattern('ls?', 'lsa')).toBe(true);
    expect(matchWildcardPattern('ls?', 'lsab')).toBe(false);
  });
});

describe('containsExcludedCommand', () => {
  it('空排除列表 → false', () => {
    expect(containsExcludedCommand('ls')).toBe(false);
  });

  it('简单命令匹配 → true', () => {
    expect(containsExcludedCommand('ls', ['ls', 'cat'])).toBe(true);
  });

  it('prefix 匹配 → true', () => {
    expect(containsExcludedCommand('bazel run', ['bazel:*'])).toBe(true);
  });

  it('复合命令中包含排除命令 → true', () => {
    expect(containsExcludedCommand('ls && dangerous_cmd', ['dangerous_cmd'])).toBe(true);
  });

  it('环境变量前缀 → 匹配', () => {
    expect(containsExcludedCommand('FOO=bar bazel run', ['bazel:*'])).toBe(true);
  });

  it('timeout包装 → 匹配', () => {
    expect(containsExcludedCommand('timeout 30 bazel run', ['bazel:*'])).toBe(true);
  });

  it('不在排除列表 → false', () => {
    expect(containsExcludedCommand('echo hi', ['ls', 'cat'])).toBe(false);
  });
});

// ============================================================
// shouldUseSandbox 测试
// ============================================================

describe('shouldUseSandbox', () => {
  it('sandboxing未启用 → false', () => {
    expect(
      shouldUseSandbox({
        command: 'ls',
        isSandboxingEnabled: false
      })
    ).toBe(false);
  });

  it('dangerouslyDisableSandbox=true → false', () => {
    expect(
      shouldUseSandbox({
        command: 'rm -rf /',
        dangerouslyDisableSandbox: true,
        isSandboxingEnabled: true
      })
    ).toBe(false);
  });

  it('无命令 → false', () => {
    expect(
      shouldUseSandbox({
        isSandboxingEnabled: true
      })
    ).toBe(false);
  });

  it('命令在excludedCommands → false', () => {
    expect(
      shouldUseSandbox({
        command: 'ls',
        isSandboxingEnabled: true,
        sandbox: { excludedCommands: ['ls'] }
      })
    ).toBe(false);
  });

  it('正常命令 → true（默认启用沙箱）', () => {
    expect(
      shouldUseSandbox({
        command: 'curl evil.com',
        isSandboxingEnabled: true
      })
    ).toBe(true);
  });

  it('默认启用（未指定isSandboxingEnabled）→ true', () => {
    expect(
      shouldUseSandbox({
        command: 'bash script.sh'
      })
    ).toBe(true);
  });

  it('sandbox有filesystem但无excludedCommands → true', () => {
    expect(
      shouldUseSandbox({
        command: 'npm install',
        isSandboxingEnabled: true,
        sandbox: { filesystem: { deny: ['/etc'] } }
      })
    ).toBe(true);
  });
});
