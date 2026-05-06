/** P63 测试 — Bash命令安全验证(readOnlyValidation+destructiveCommand+injection+pathValidation) */

import { describe, expect, it } from 'vitest';
import {
  assessBashCommandSecurity,
  assessCompoundCommandSecurity,
  detectCommandInjection,
  detectDestructiveCommand,
  isReadOnlyCommand,
  splitCommandIntoSegments,
  validateCommandPaths
} from '../tools/bash-security';

// ============================================================
// isReadOnlyCommand
// ============================================================

describe('isReadOnlyCommand', () => {
  it('空命令 → 只读', () => {
    expect(isReadOnlyCommand('').isReadOnly).toBe(true);
  });

  it('ls → 只读（flags白名单匹配）', () => {
    const result = isReadOnlyCommand('ls');
    expect(result.isReadOnly).toBe(true);
    expect(result.reason).toBe('safe_flags_match');
  });

  it('ls -la → 只读（安全flags）', () => {
    const result = isReadOnlyCommand('ls -la');
    expect(result.isReadOnly).toBe(true);
    expect(result.reason).toBe('safe_flags_match');
  });

  it('ls --sort=time → 只读（安全长flag）', () => {
    expect(isReadOnlyCommand('ls --sort=time').isReadOnly).toBe(true);
  });

  it('cat file.txt → 只读', () => {
    expect(isReadOnlyCommand('cat file.txt').isReadOnly).toBe(true);
  });

  it('git log → 只读', () => {
    expect(isReadOnlyCommand('git log').isReadOnly).toBe(true);
  });

  it('git status → 只读', () => {
    expect(isReadOnlyCommand('git status').isReadOnly).toBe(true);
  });

  it('pwd → 只读', () => {
    expect(isReadOnlyCommand('pwd').isReadOnly).toBe(true);
  });

  it('echo hello → 只读', () => {
    expect(isReadOnlyCommand('echo hello').isReadOnly).toBe(true);
  });

  it('rm file → 不只读', () => {
    expect(isReadOnlyCommand('rm file').isReadOnly).toBe(false);
  });

  it('curl url → 不只读', () => {
    expect(isReadOnlyCommand('curl https://example.com').isReadOnly).toBe(false);
  });

  it('npm install → 不只读', () => {
    expect(isReadOnlyCommand('npm install').isReadOnly).toBe(false);
  });

  it('ls && cat file → 只读（复合命令全部只读段）', () => {
    expect(isReadOnlyCommand('ls && cat file').isReadOnly).toBe(true);
  });

  it('ls && rm file → 不只读（复合命令含非只读段）', () => {
    expect(isReadOnlyCommand('ls && rm file').isReadOnly).toBe(false);
  });

  it('ls | grep foo → 只读（管道全部只读段）', () => {
    expect(isReadOnlyCommand('ls | grep foo').isReadOnly).toBe(true);
  });

  it('cat file | tee output → 不只读（tee写入）', () => {
    expect(isReadOnlyCommand('cat file | tee output').isReadOnly).toBe(false);
  });

  it('sleep 5 & → 不只读（后台命令）', () => {
    expect(isReadOnlyCommand('sleep 5 &').isReadOnly).toBe(false);
  });

  it('FOO=bar ls → 只读（环境变量包装）', () => {
    expect(isReadOnlyCommand('FOO=bar ls').isReadOnly).toBe(true);
  });

  it('timeout 30 ls → 只读（安全包装）', () => {
    expect(isReadOnlyCommand('timeout 30 ls').isReadOnly).toBe(true);
  });

  it('ls --unknown-flag → 不只读（未知flag）', () => {
    expect(isReadOnlyCommand('ls --unknown-flag').isReadOnly).toBe(false);
  });

  it('grep -ri pattern dir → 只读', () => {
    expect(isReadOnlyCommand('grep -ri pattern dir').isReadOnly).toBe(true);
  });

  it('find . -name "*.ts" → 只读', () => {
    expect(isReadOnlyCommand('find . -name "*.ts"').isReadOnly).toBe(true);
  });

  it('ps aux → 只读', () => {
    expect(isReadOnlyCommand('ps aux').isReadOnly).toBe(true);
  });

  it('diff file1 file2 → 只读', () => {
    expect(isReadOnlyCommand('diff file1 file2').isReadOnly).toBe(true);
  });
});

// ============================================================
// detectDestructiveCommand
// ============================================================

describe('detectDestructiveCommand', () => {
  it('ls → 无破坏性', () => {
    expect(detectDestructiveCommand('ls').length).toBe(0);
  });

  it('rm -rf / → 破坏性[critical]', () => {
    const result = detectDestructiveCommand('rm -rf /');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(d => d.severity === 'critical')).toBe(true);
    expect(result[0].description).toContain('强制删除');
  });

  it('git push --force → 破坏性[high]', () => {
    const result = detectDestructiveCommand('git push --force');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(d => d.severity === 'high')).toBe(true);
  });

  it('git reset --hard HEAD~1 → 破坏性[high]', () => {
    const result = detectDestructiveCommand('git reset --hard HEAD~1');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].description).toContain('硬重置');
  });

  it('DROP TABLE users → 破坏性[critical]', () => {
    const result = detectDestructiveCommand('DROP TABLE users');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(d => d.severity === 'critical')).toBe(true);
  });

  it('terraform destroy → 破坏性[critical]', () => {
    const result = detectDestructiveCommand('terraform destroy');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(d => d.severity === 'critical')).toBe(true);
  });

  it('sudo rm -rf /var → 破坏性[high]', () => {
    const result = detectDestructiveCommand('sudo rm -rf /var');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(d => d.description.includes('sudo删除'))).toBe(true);
  });

  it('echo hello → 无破坏性', () => {
    expect(detectDestructiveCommand('echo hello').length).toBe(0);
  });

  it('kubectl delete --force pod → 破坏性[high]', () => {
    const result = detectDestructiveCommand('kubectl delete --force pod');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(d => d.severity === 'high')).toBe(true);
  });
});

// ============================================================
// detectCommandInjection
// ============================================================

describe('detectCommandInjection', () => {
  it('ls → 无注入', () => {
    expect(detectCommandInjection('ls').length).toBe(0);
  });

  it('echo $(whoami) → 命令替换注入', () => {
    const result = detectCommandInjection('echo $(whoami)');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].description).toContain('命令替换');
  });

  it('echo `whoami` → 反引号注入', () => {
    const result = detectCommandInjection('echo `whoami`');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].description).toContain('反引号');
  });

  it('cat >() → 过程替换注入', () => {
    const result = detectCommandInjection('cat >()');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].description).toContain('过程替换');
  });

  it('eval "rm -rf /" → eval注入', () => {
    const result = detectCommandInjection('eval "rm -rf /"');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(d => d.description.includes('eval'))).toBe(true);
  });

  it('FOO=$(ls) → 命令替换注入', () => {
    const result = detectCommandInjection('FOO=$(ls)');
    expect(result.length).toBeGreaterThan(0);
  });

  it('echo hello → 安全', () => {
    expect(detectCommandInjection('echo hello').length).toBe(0);
  });
});

// ============================================================
// validateCommandPaths
// ============================================================

describe('validateCommandPaths', () => {
  it('ls /home → 无警告', () => {
    expect(validateCommandPaths('ls /home', '/home/user').length).toBe(0);
  });

  it('rm -rf / → 危险路径警告[critical]', () => {
    const result = validateCommandPaths('rm -rf /', '/home/user');
    expect(
      result.some(w => w.issue === 'dangerous_removal_path' && w.severity === 'critical')
    ).toBe(true);
  });

  it('cat /dev/zero → 设备文件警告[critical]', () => {
    const result = validateCommandPaths('cat /dev/zero', '/home/user');
    expect(result.some(w => w.issue === 'device_file_access' && w.severity === 'critical')).toBe(
      true
    );
  });

  it('echo "data" > /etc/config → 系统重定向警告[high]', () => {
    const result = validateCommandPaths('echo "data" > /etc/config', '/home/user');
    expect(result.some(w => w.issue === 'system_redirect' && w.severity === 'high')).toBe(true);
  });

  it('rm -rf /etc/ → 危险路径警告', () => {
    const result = validateCommandPaths('rm -rf /etc/', '/home/user');
    expect(result.some(w => w.issue === 'dangerous_removal_path')).toBe(true);
  });
});

// ============================================================
// assessBashCommandSecurity — 综合评估
// ============================================================

describe('assessBashCommandSecurity', () => {
  it('ls → safe（只读无注入无破坏性）', () => {
    const result = assessBashCommandSecurity('ls');
    expect(result.safetyLevel).toBe('safe');
    expect(result.isReadOnly).toBe(true);
    expect(result.hasInjection).toBe(false);
    expect(result.hasDestructive).toBe(false);
    expect(result.recommendation).toContain('只读');
  });

  it('rm -rf / → dangerous（破坏性命令）', () => {
    const result = assessBashCommandSecurity('rm -rf /');
    expect(result.safetyLevel).toBe('dangerous');
    expect(result.hasDestructive).toBe(true);
    expect(result.recommendation).toContain('破坏性');
  });

  it('echo $(whoami) → caution（有注入但非破坏性）', () => {
    const result = assessBashCommandSecurity('echo $(whoami)');
    expect(result.safetyLevel).toBe('caution');
    expect(result.hasInjection).toBe(true);
    expect(result.hasDestructive).toBe(false);
    expect(result.recommendation).toContain('注入');
  });

  it('npm install → caution（非只读无注入无破坏性）', () => {
    const result = assessBashCommandSecurity('npm install');
    expect(result.safetyLevel).toBe('caution');
    expect(result.isReadOnly).toBe(false);
    expect(result.recommendation).toContain('非只读');
  });

  it('git push --force → dangerous', () => {
    const result = assessBashCommandSecurity('git push --force');
    expect(result.safetyLevel).toBe('dangerous');
    expect(result.hasDestructive).toBe(true);
  });

  it('cat /dev/zero → caution（有路径警告）', () => {
    const result = assessBashCommandSecurity('cat /dev/zero', '/home');
    expect(result.safetyLevel).toBe('caution');
    expect(result.pathWarnings.length).toBeGreaterThan(0);
  });

  it('DROP TABLE + $(cmd) → dangerous（破坏性优先于注入）', () => {
    const result = assessBashCommandSecurity('DROP TABLE $(cat /etc/dbname)');
    expect(result.safetyLevel).toBe('dangerous');
    expect(result.hasDestructive).toBe(true);
    expect(result.hasInjection).toBe(true);
  });

  it('pwd → safe', () => {
    const result = assessBashCommandSecurity('pwd');
    expect(result.safetyLevel).toBe('safe');
  });

  it('timeout 30 ls → safe（包装不影响判定）', () => {
    const result = assessBashCommandSecurity('timeout 30 ls');
    expect(result.safetyLevel).toBe('safe');
    expect(result.isReadOnly).toBe(true);
  });
});

// ============================================================
// splitCommandIntoSegments
// ============================================================

describe('splitCommandIntoSegments', () => {
  it('single command → one segment', () => {
    const result = splitCommandIntoSegments('ls -la');
    expect(result).toHaveLength(1);
    expect(result[0].segment).toBe('ls -la');
  });

  it('pipe splits into segments', () => {
    const result = splitCommandIntoSegments('cat file | grep foo | wc -l');
    expect(result).toHaveLength(3);
    expect(result[0].segment).toBe('cat file');
    expect(result[1].separator).toBe('|');
    expect(result[1].segment).toBe('grep foo');
    expect(result[2].separator).toBe('|');
    expect(result[2].segment).toBe('wc -l');
  });

  it('&& splits into segments', () => {
    const result = splitCommandIntoSegments('mkdir dir && cd dir && ls');
    expect(result).toHaveLength(3);
    expect(result[1].separator).toBe('&&');
    expect(result[2].separator).toBe('&&');
  });

  it('; splits into segments', () => {
    const result = splitCommandIntoSegments('echo a; echo b');
    expect(result).toHaveLength(2);
    expect(result[1].separator).toBe(';');
  });

  it('|| splits into segments', () => {
    const result = splitCommandIntoSegments('cmd1 || cmd2');
    expect(result).toHaveLength(2);
    expect(result[1].separator).toBe('||');
  });

  it('quoted pipes not split', () => {
    const result = splitCommandIntoSegments("echo 'a|b' | grep c");
    expect(result).toHaveLength(2);
    expect(result[0].segment).toBe("echo 'a|b'");
  });

  it('empty segments filtered', () => {
    const result = splitCommandIntoSegments('ls ; ; pwd');
    expect(result.filter(s => s.segment === '')).toHaveLength(0);
  });
});

// ============================================================
// assessCompoundCommandSecurity
// ============================================================

describe('assessCompoundCommandSecurity', () => {
  it('single command delegates to assessBashCommandSecurity', () => {
    const result = assessCompoundCommandSecurity('ls -la');
    expect(result.overallSafetyLevel).toBe('safe');
    expect(result.segments).toHaveLength(1);
  });

  it('all-safe pipe → overall safe', () => {
    const result = assessCompoundCommandSecurity('cat file | grep foo | wc -l');
    expect(result.overallSafetyLevel).toBe('safe');
    expect(result.segments).toHaveLength(3);
  });

  it('pipe with destructive → overall dangerous', () => {
    const result = assessCompoundCommandSecurity('cat file | rm -rf /');
    expect(result.overallSafetyLevel).toBe('dangerous');
  });

  it('pipe with caution → overall caution', () => {
    const result = assessCompoundCommandSecurity('cat file | npm install');
    expect(result.overallSafetyLevel).toBe('caution');
  });

  it('mixed && chain → worst level wins', () => {
    const result = assessCompoundCommandSecurity('ls && rm -rf /');
    expect(result.overallSafetyLevel).toBe('dangerous');
  });
});
