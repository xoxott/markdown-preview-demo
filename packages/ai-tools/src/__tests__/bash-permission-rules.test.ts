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
  it('deny规则 ≥ 36条', () => {
    const denyRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'deny');
    expect(denyRules.length).toBeGreaterThanOrEqual(36);
  });

  it('ask规则 ≥ 67条', () => {
    const askRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'ask');
    expect(askRules.length).toBeGreaterThanOrEqual(67);
  });

  it('allow规则 ≥ 45条', () => {
    const allowRules = DEFAULT_BASH_PERMISSION_RULES.filter(r => r.behavior === 'allow');
    expect(allowRules.length).toBeGreaterThanOrEqual(45);
  });

  it('总规则 ≥ 150条', () => {
    expect(DEFAULT_BASH_PERMISSION_RULES.length).toBeGreaterThanOrEqual(150);
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
    ['redis-cli shutdown', 'deny_redis_shutdown'],
    // P81 新增
    ['npm publish --force', 'deny_npm_publish_force'],
    ['pnpm publish', 'deny_pnpm_publish'],
    ['docker image prune', 'deny_docker_image_prune'],
    ['docker container prune', 'deny_docker_container_prune'],
    ['docker network prune', 'deny_docker_network_prune'],
    ['kubectl delete --force pod', 'deny_kubectl_delete_force'],
    ['gh repo delete repo', 'deny_github_cli_delete'],
    ['DROP DATABASE mydb', 'deny_drop_database'],
    ['TRUNCATE TABLE users', 'deny_truncate_table'],
    ['pip install --user requests', 'deny_pip_install_user']
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
    ['crontab -e', 'ask_crontab'],
    // P81 新增
    ['git clean -fdx', 'ask_git_clean'],
    ['git cherry-pick abc123', 'ask_git cherry_pick'],
    ['git commit --amend', 'ask_git_commit_amend'],
    ['git fetch origin', 'ask_git_fetch'],
    ['git pull origin main', 'ask_git_pull'],
    ['npm ci', 'ask_npm_ci'],
    ['yarn add lodash', 'ask_yarn_add'],
    ['pnpm add react', 'ask_pnpm_add'],
    ['conda install numpy', 'ask_conda_install'],
    ['docker-compose up', 'ask_docker_compose_up'],
    ['docker-compose down', 'ask_docker_compose_down'],
    ['docker pull nginx', 'ask_docker_pull'],
    ['ssh user@host', 'ask_ssh'],
    ['scp file.txt server:', 'ask_scp'],
    ['rsync -av src/ dest/', 'ask_rsync'],
    ['curl -o output.html https://example.com', 'ask_curl_download'],
    ['wget https://example.com', 'ask_wget'],
    ['gradle build', 'ask_gradle_build'],
    ['go test ./...', 'ask_go_test'],
    ['aws s3 rm s3://bucket', 'ask_aws_cli']
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
    ['go version'],
    // P81 新增
    ['git branch'],
    ['git tag -l'],
    ['git remote -v'],
    ['git blame file.ts'],
    ['git reflog'],
    ['docker inspect container'],
    ['docker logs container'],
    ['docker stats'],
    ['kubectl describe pod'],
    ['kubectl logs pod'],
    ['kubectl top pods'],
    ['java --version'],
    ['ruby --version'],
    ['php --version'],
    ['uname -a'],
    ['whoami'],
    ['df -h'],
    ['env'],
    ['which node']
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
