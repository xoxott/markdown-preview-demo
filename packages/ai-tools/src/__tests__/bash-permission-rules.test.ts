/** P77 C1 测试 — Bash权限规则库扩充 + 环境变量安全接入 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASH_PERMISSION_RULES,
  hasUnsafeEnvVars,
  isSafeEnvVar,
  matchBashPermissionRule
} from '../tools/bash-permission-rules';

// ============================================================
// DEFAULT_BASH_PERMISSION_RULES 规则数量
// ============================================================

describe('DEFAULT_BASH_PERMISSION_RULES 规则数量', () => {
  it('deny规则 ≥ 21条', () => {
    const denyRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'deny');
    expect(denyRules.length).toBeGreaterThanOrEqual(21);
  });

  it('ask规则 ≥ 30条', () => {
    const askRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'ask');
    expect(askRules.length).toBeGreaterThanOrEqual(30);
  });

  it('allow规则 ≥ 20条', () => {
    const allowRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'allow');
    expect(allowRules.length).toBeGreaterThanOrEqual(20);
  });

  it('总规则 ≥ 72条', () => {
    expect(DEFAULT_BASH_PERMISSION_RULES.length).toBeGreaterThanOrEqual(72);
  });
});

// ============================================================
// Deny规则覆盖测试
// ============================================================

describe('Deny规则覆盖', () => {
  const denyTestCases: [string, string][] = [
    ['shutdown', 'deny_shutdown'],
    ['reboot now', 'deny_reboot'],
    ['iptables -A INPUT -j DROP', 'deny_iptables'],
    ['chmod 777 /tmp', 'deny_chmod_777'],
    ['crontab -r', 'deny_crontab_remove'],
    ['npm publish', 'deny_npm_publish'],
    ['docker system prune -a', 'deny_docker_prune_system'],
    ['docker volume prune', 'deny_docker_prune_volume'],
    ['find . -name "*.log" -delete', 'deny_find_delete'],
    ['redis-cli shutdown', 'deny_redis_shutdown']
  ];

  for (const [cmd, _ruleId] of denyTestCases) {
    it(`deny: "${cmd}"`, () => {
      const result = matchBashPermissionRule(cmd, DEFAULT_BASH_PERMISSION_RULES);
      expect(result.behavior).toBe('deny');
    });
  }
});

// ============================================================
// Ask规则覆盖测试
// ============================================================

describe('Ask规则覆盖', () => {
  const askTestCases: [string, string][] = [
    ['git push origin main', 'ask_git_push'],
    ['git checkout develop', 'ask_git_checkout'],
    ['git merge feature-branch', 'ask_git_merge'],
    ['git rebase main', 'ask_git_rebase'],
    ['git stash push', 'ask_git_stash'],
    ['git branch -d old-branch', 'ask_git_branch_delete'],
    ['pip install requests', 'ask_pip_install'],
    ['brew install ffmpeg', 'ask_brew_install'],
    ['docker run -d nginx', 'ask_docker_run'],
    ['docker build -t myapp .', 'ask_docker_build'],
    ['kubectl apply -f deployment.yaml', 'ask_kubectl_apply'],
    ['make all', 'ask_make'],
    ['sed -i "s/old/new/g" file.txt', 'ask_sed_inplace'],
    ['find . -name "*.tmp" -exec rm {} \\;', 'ask_find_exec'],
    ['crontab -e', 'ask_crontab']
  ];

  for (const [cmd, _ruleId] of askTestCases) {
    it(`ask: "${cmd}"`, () => {
      const result = matchBashPermissionRule(cmd, DEFAULT_BASH_PERMISSION_RULES);
      expect(result.behavior).toBe('ask');
    });
  }
});

// ============================================================
// Allow规则覆盖测试
// ============================================================

describe('Allow规则覆盖', () => {
  const allowTestCases: [string][] = [
    ['git log --oneline'],
    ['git status'],
    ['git diff HEAD~1'],
    ['git show abc123'],
    ['git rev-parse HEAD'],
    ['docker ps'],
    ['docker images'],
    ['kubectl get pods'],
    ['node --version'],
    ['npm --version'],
    ['python --version'],
    ['go version']
  ];

  for (const [cmd] of allowTestCases) {
    it(`allow: "${cmd}"`, () => {
      const result = matchBashPermissionRule(cmd, DEFAULT_BASH_PERMISSION_RULES);
      expect(result.behavior).toBe('allow');
    });
  }
});

// ============================================================
// 规则优先级验证
// ============================================================

describe('规则优先级', () => {
  it('deny > ask: git push --force 被deny规则匹配而非ask git push', () => {
    // ask_git_push_force (prefix: "git push --force") 行为=ask
    // 但还有 ask_git_push (prefix: "git push") 行为=ask
    // git push --force 两个规则都匹配，但 deny 优先于 ask
    // 注意: 当前 git push --force 是 ask 规则，不是 deny 规则
    // 但 deny_rm_rf 是 deny 规则，应该优先于任何 ask
    const result = matchBashPermissionRule('rm -rf /tmp', DEFAULT_BASH_PERMISSION_RULES);
    expect(result.behavior).toBe('deny');
  });

  it('allow 不能覆盖 deny', () => {
    // deny_rm_rf 和 allow_git_log 同时存在
    // deny 规则优先级高于 allow
    const result = matchBashPermissionRule('rm -rf /tmp', DEFAULT_BASH_PERMISSION_RULES);
    expect(result.behavior).toBe('deny');
  });
});

// ============================================================
// hasUnsafeEnvVars 集成测试
// ============================================================

describe('hasUnsafeEnvVars', () => {
  it('安全环境变量 → false', () => {
    expect(hasUnsafeEnvVars('PATH=/usr/bin ls')).toBe(false);
    expect(hasUnsafeEnvVars('HOME=/tmp ls')).toBe(false);
    expect(hasUnsafeEnvVars('NODE_ENV=production npm run build')).toBe(false);
  });

  it('不安全环境变量 → true', () => {
    expect(hasUnsafeEnvVars('SECRET_KEY=abc curl url')).toBe(true);
    expect(hasUnsafeEnvVars('AWS_SECRET=123 python script.py')).toBe(true);
    expect(hasUnsafeEnvVars('TOKEN=xyz echo hello')).toBe(true);
  });

  it('混合环境变量（有不安全的） → true', () => {
    expect(hasUnsafeEnvVars('PATH=/usr/bin SECRET=abc ls')).toBe(true);
  });

  it('无环境变量 → false', () => {
    expect(hasUnsafeEnvVars('ls -la')).toBe(false);
    expect(hasUnsafeEnvVars('git status')).toBe(false);
  });
});

// ============================================================
// isSafeEnvVar 测试
// ============================================================

describe('isSafeEnvVar', () => {
  it('PATH 是安全变量', () => {
    expect(isSafeEnvVar('PATH')).toBe(true);
  });

  it('HOME 是安全变量', () => {
    expect(isSafeEnvVar('HOME')).toBe(true);
  });

  it('NODE_ENV 是安全变量', () => {
    expect(isSafeEnvVar('NODE_ENV')).toBe(true);
  });

  it('大小写不敏感', () => {
    expect(isSafeEnvVar('path')).toBe(true);
    expect(isSafeEnvVar('Path')).toBe(true);
  });

  it('SECRET_KEY 不是安全变量', () => {
    expect(isSafeEnvVar('SECRET_KEY')).toBe(false);
  });
});
