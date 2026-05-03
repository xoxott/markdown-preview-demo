/** P66 测试 — Bash权限规则引擎(SAFE_ENV_VARS+containsUnquotedExpansion+matchBashPermissionRule) */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASH_PERMISSION_RULES,
  SAFE_ENV_VARS,
  containsUnquotedExpansion,
  hasUnsafeEnvVars,
  isSafeEnvVar,
  matchBashPermissionRule
} from '../tools/bash-permission-rules';
import type { BashPermissionRule } from '../tools/bash-permission-rules';

// ============================================================
// SAFE_ENV_VARS
// ============================================================

describe('SAFE_ENV_VARS', () => {
  it('PATH → safe', () => {
    expect(isSafeEnvVar('PATH')).toBe(true);
  });

  it('HOME → safe', () => {
    expect(isSafeEnvVar('HOME')).toBe(true);
  });

  it('NODE_OPTIONS → safe', () => {
    expect(isSafeEnvVar('NODE_OPTIONS')).toBe(true);
  });

  it('SECRET_KEY → unsafe', () => {
    expect(isSafeEnvVar('SECRET_KEY')).toBe(false);
  });

  it('API_TOKEN → unsafe', () => {
    expect(isSafeEnvVar('API_TOKEN')).toBe(false);
  });

  it('大小写不敏感 → path也safe', () => {
    expect(isSafeEnvVar('path')).toBe(true);
  });

  it('白名单长度 > 40', () => {
    expect(SAFE_ENV_VARS.length).toBeGreaterThan(40);
  });
});

describe('hasUnsafeEnvVars', () => {
  it('PATH=/usr/bin ls → false(PATH safe)', () => {
    expect(hasUnsafeEnvVars('PATH=/usr/bin ls')).toBe(false);
  });

  it('SECRET=abc curl → true(SECRET unsafe)', () => {
    expect(hasUnsafeEnvVars('SECRET=abc curl')).toBe(true);
  });

  it('PATH=/usr/bin HOME=/tmp ls → false(both safe)', () => {
    expect(hasUnsafeEnvVars('PATH=/usr/bin HOME=/tmp ls')).toBe(false);
  });

  it('PATH=/usr/bin API_KEY=xxx curl → true(mixed, unsafe)', () => {
    expect(hasUnsafeEnvVars('PATH=/usr/bin API_KEY=xxx curl')).toBe(true);
  });

  it('无环境变量 → false', () => {
    expect(hasUnsafeEnvVars('ls')).toBe(false);
  });

  it('只有VAR=value → 检查安全性', () => {
    expect(hasUnsafeEnvVars('SECRET=abc')).toBe(true);
    expect(hasUnsafeEnvVars('PATH=/usr/bin')).toBe(false);
  });
});

// ============================================================
// containsUnquotedExpansion
// ============================================================

describe('containsUnquotedExpansion — 变量展开', () => {
  it('$HOME → 变量展开', () => {
    const result = containsUnquotedExpansion('echo $HOME');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.type === 'variable_expansion')).toBe(true);
  });

  it('$() → 命令替换', () => {
    const result = containsUnquotedExpansion('echo $(whoami)');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.type === 'command_substitution')).toBe(true);
  });

  it('${} → 参数展开', () => {
    const result = containsUnquotedExpansion('echo ${HOME}');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.type === 'parameter_expansion')).toBe(true);
  });

  it('$[] → 算术展开', () => {
    const result = containsUnquotedExpansion('echo $[1+2]');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.type === 'arithmetic_expansion')).toBe(true);
  });
});

describe('containsUnquotedExpansion — 引号状态', () => {
  it('单引号内$VAR → 无展开', () => {
    const result = containsUnquotedExpansion("echo '$HOME'");
    expect(result.hasExpansion).toBe(false);
  });

  it('双引号内$VAR → 展开(变量展开)', () => {
    const result = containsUnquotedExpansion('echo "$HOME"');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.description.includes('双引号内'))).toBe(true);
  });

  it('双引号内* → 无glob展开', () => {
    const result = containsUnquotedExpansion('echo "*"');
    expect(result.expansions.some(e => e.type === 'glob')).toBe(false);
  });

  it('无引号* → glob展开', () => {
    const result = containsUnquotedExpansion('echo *.txt');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.type === 'glob')).toBe(true);
  });

  it('无展开 → hasExpansion=false', () => {
    const result = containsUnquotedExpansion('ls /home');
    expect(result.hasExpansion).toBe(false);
    expect(result.expansions.length).toBe(0);
  });

  it('混合引号 → 正确跟踪', () => {
    // echo 'literal' "$VAR" *.txt
    const result = containsUnquotedExpansion('echo \'literal\' "$VAR" *.txt');
    expect(result.hasExpansion).toBe(true);
    // $VAR in double quotes → expansion, *.txt → glob
    expect(result.expansions.length).toBe(2);
  });
});

describe('containsUnquotedExpansion — 花括号展开', () => {
  it('{,...} → brace expansion', () => {
    const result = containsUnquotedExpansion('echo {a,b,c}');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.type === 'brace_expansion')).toBe(true);
  });

  it('{..} → brace range expansion', () => {
    const result = containsUnquotedExpansion('echo {1..10}');
    expect(result.hasExpansion).toBe(true);
    expect(result.expansions.some(e => e.type === 'brace_expansion')).toBe(true);
  });
});

// ============================================================
// matchBashPermissionRule — 7层优先级
// ============================================================

describe('matchBashPermissionRule', () => {
  const rules: BashPermissionRule[] = [
    { pattern: 'rm -rf', patternType: 'prefix', behavior: 'deny', description: 'deny rm -rf' },
    {
      pattern: 'git push --force',
      patternType: 'prefix',
      behavior: 'ask',
      description: 'ask git push --force'
    },
    { pattern: 'ls', patternType: 'exact', behavior: 'allow', description: 'allow ls' },
    {
      pattern: 'npm install',
      patternType: 'prefix',
      behavior: 'ask',
      description: 'ask npm install'
    }
  ];

  it('rm -rf / → deny优先级最高', () => {
    const result = matchBashPermissionRule('rm -rf /', rules);
    expect(result.behavior).toBe('deny');
    expect(result.matchedRule?.pattern).toBe('rm -rf');
  });

  it('ls → allow（exact匹配）', () => {
    const result = matchBashPermissionRule('ls', rules);
    expect(result.behavior).toBe('allow');
    expect(result.matchedRule?.pattern).toBe('ls');
  });

  it('npm install → ask', () => {
    const result = matchBashPermissionRule('npm install react', rules);
    expect(result.behavior).toBe('ask');
  });

  it('未知命令 → ask（默认）', () => {
    const result = matchBashPermissionRule('custom_command', rules);
    expect(result.behavior).toBe('ask');
    expect(result.matchedRule).toBe(null);
  });

  it('deny > ask > allow优先级', () => {
    const conflictingRules: BashPermissionRule[] = [
      { pattern: 'git', patternType: 'prefix', behavior: 'allow', description: 'allow git' },
      {
        pattern: 'git push --force',
        patternType: 'prefix',
        behavior: 'ask',
        description: 'ask force push'
      }
    ];
    // git push --force匹配两条规则：allow(git prefix) 和 ask(force push prefix)
    // ask > allow → 最终ask
    const result = matchBashPermissionRule('git push --force', conflictingRules);
    expect(result.behavior).toBe('ask');
  });

  it('exact > prefix 同行为优先级', () => {
    const sameBehaviorRules: BashPermissionRule[] = [
      { pattern: 'ls', patternType: 'prefix', behavior: 'allow', description: 'allow ls prefix' },
      { pattern: 'ls', patternType: 'exact', behavior: 'allow', description: 'allow ls exact' }
    ];
    const result = matchBashPermissionRule('ls', sameBehaviorRules);
    expect(result.matchedRule?.patternType).toBe('exact');
  });

  it('wildcard匹配', () => {
    // 不直接测试wildcard，因为*:force不是标准glob
    // 用标准glob测试
    const standardWildcard: BashPermissionRule[] = [
      {
        pattern: '*.sh',
        patternType: 'wildcard',
        behavior: 'deny',
        description: 'deny .sh scripts'
      }
    ];
    const result = matchBashPermissionRule('script.sh', standardWildcard);
    expect(result.behavior).toBe('deny');
  });
});

describe('DEFAULT_BASH_PERMISSION_RULES', () => {
  it('默认规则长度 >= 6 (deny)', () => {
    const denyRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'deny');
    expect(denyRules.length).toBeGreaterThanOrEqual(6);
  });

  it('默认规则长度 >= 6 (ask)', () => {
    const askRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'ask');
    expect(askRules.length).toBeGreaterThanOrEqual(6);
  });

  it('rm -rf → deny（默认规则）', () => {
    const result = matchBashPermissionRule('rm -rf /home', DEFAULT_BASH_PERMISSION_RULES);
    expect(result.behavior).toBe('deny');
  });

  it('npm install → ask（默认规则）', () => {
    const result = matchBashPermissionRule('npm install react', DEFAULT_BASH_PERMISSION_RULES);
    expect(result.behavior).toBe('ask');
  });

  it('terraform destroy → deny（默认规则）', () => {
    const result = matchBashPermissionRule('terraform destroy', DEFAULT_BASH_PERMISSION_RULES);
    expect(result.behavior).toBe('deny');
  });
});
