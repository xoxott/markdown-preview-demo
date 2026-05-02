/** BashCommandClassifier 测试 — 确定性分类逻辑: allow/deny/ask + 复合命令 */

import { describe, expect, it } from 'vitest';
import { classifyBashCommand } from '../provider/BashCommandClassifier';

describe('classifyBashCommand', () => {
  // ===== ALLOW 白名单 =====

  it('ls → allow', () => {
    const result = classifyBashCommand('ls');
    expect(result.decision).toBe('allow');
    expect(result.confidence).toBe('high');
    expect(result.matchType).toBe('allow_prefix');
  });

  it('ls -la → allow (带参数)', () => {
    const result = classifyBashCommand('ls -la /tmp');
    expect(result.decision).toBe('allow');
    expect(result.reason).toContain('Safe read-only');
  });

  it('cat → allow', () => {
    expect(classifyBashCommand('cat file.txt').decision).toBe('allow');
  });

  it('grep → allow', () => {
    expect(classifyBashCommand('grep pattern file.txt').decision).toBe('allow');
  });

  it('find → allow', () => {
    expect(classifyBashCommand('find /tmp -name "*.log"').decision).toBe('allow');
  });

  it('echo → allow', () => {
    expect(classifyBashCommand('echo hello').decision).toBe('allow');
  });

  it('pwd → allow', () => {
    expect(classifyBashCommand('pwd').decision).toBe('allow');
  });

  it('ps → allow', () => {
    expect(classifyBashCommand('ps aux').decision).toBe('allow');
  });

  it('env → allow', () => {
    expect(classifyBashCommand('env').decision).toBe('allow');
  });

  it('df → allow', () => {
    expect(classifyBashCommand('df -h').decision).toBe('allow');
  });

  it('git status → allow', () => {
    const result = classifyBashCommand('git status');
    expect(result.decision).toBe('allow');
    expect(result.confidence).toBe('high');
  });

  it('git log → allow', () => {
    expect(classifyBashCommand('git log --oneline').decision).toBe('allow');
  });

  it('git diff → allow', () => {
    expect(classifyBashCommand('git diff HEAD').decision).toBe('allow');
  });

  it('git branch → allow', () => {
    expect(classifyBashCommand('git branch -a').decision).toBe('allow');
  });

  it('npm list → allow', () => {
    expect(classifyBashCommand('npm list').decision).toBe('allow');
  });

  it('npm view → allow', () => {
    expect(classifyBashCommand('npm view react').decision).toBe('allow');
  });

  // ===== DENY 黑名单 =====

  it('rm → deny', () => {
    const result = classifyBashCommand('rm file.txt');
    expect(result.decision).toBe('deny');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('rm');
  });

  it('rm -rf → deny', () => {
    const result = classifyBashCommand('rm -rf /tmp/test');
    expect(result.decision).toBe('deny');
    expect(result.reason).toContain('rm');
  });

  it('rmdir → deny', () => {
    expect(classifyBashCommand('rmdir /tmp/empty').decision).toBe('deny');
  });

  it('shred → deny', () => {
    expect(classifyBashCommand('shred file.txt').decision).toBe('deny');
  });

  it('kill → deny', () => {
    expect(classifyBashCommand('kill 1234').decision).toBe('deny');
  });

  it('killall → deny', () => {
    expect(classifyBashCommand('killall node').decision).toBe('deny');
  });

  it('chmod → deny', () => {
    expect(classifyBashCommand('chmod 777 file').decision).toBe('deny');
  });

  it('chown → deny', () => {
    expect(classifyBashCommand('chown root file').decision).toBe('deny');
  });

  it('reboot → deny', () => {
    expect(classifyBashCommand('reboot').decision).toBe('deny');
  });

  it('git push → deny', () => {
    const result = classifyBashCommand('git push origin main');
    expect(result.decision).toBe('deny');
    expect(result.reason).toContain('git push');
  });

  it('git reset --hard → deny', () => {
    expect(classifyBashCommand('git reset --hard HEAD~1').decision).toBe('deny');
  });

  it('npm publish → deny', () => {
    expect(classifyBashCommand('npm publish').decision).toBe('deny');
  });

  it('pip install → deny', () => {
    expect(classifyBashCommand('pip install requests').decision).toBe('deny');
  });

  it('sudo → deny', () => {
    const result = classifyBashCommand('sudo ls');
    expect(result.decision).toBe('deny');
    expect(result.matchType).toBe('sudo_deny');
  });

  it('sudo rm → deny', () => {
    expect(classifyBashCommand('sudo rm -rf /').decision).toBe('deny');
  });

  it('dd → deny', () => {
    expect(classifyBashCommand('dd if=/dev/zero of=/dev/sda').decision).toBe('deny');
  });

  // ===== ASK 模糊命令 =====

  it('bash → ask', () => {
    const result = classifyBashCommand('bash script.sh');
    expect(result.decision).toBe('ask');
  });

  it('sh → ask', () => {
    expect(classifyBashCommand('sh script.sh').decision).toBe('ask');
  });

  it('curl → ask', () => {
    expect(classifyBashCommand('curl https://example.com').decision).toBe('ask');
  });

  it('wget → ask', () => {
    expect(classifyBashCommand('wget https://example.com/file').decision).toBe('ask');
  });

  it('docker → ask', () => {
    expect(classifyBashCommand('docker ps').decision).toBe('ask');
  });

  it('python → ask', () => {
    expect(classifyBashCommand('python script.py').decision).toBe('ask');
  });

  it('node → ask', () => {
    expect(classifyBashCommand('node script.js').decision).toBe('ask');
  });

  it('git commit → deny (修改仓库历史)', () => {
    const result = classifyBashCommand('git commit -m "msg"');
    expect(result.decision).toBe('deny');
    expect(result.reason).toContain('git commit');
  });

  it('git add → deny (暂存修改)', () => {
    const result = classifyBashCommand('git add file.txt');
    expect(result.decision).toBe('deny');
    expect(result.reason).toContain('git add');
  });

  // ===== 复合命令 =====

  it('管道: ls | grep foo → allow (allow + allow)', () => {
    const result = classifyBashCommand('ls | grep foo');
    expect(result.decision).toBe('allow');
  });

  it('管道: ls | rm → deny (allow + deny)', () => {
    const result = classifyBashCommand('ls | rm file.txt');
    expect(result.decision).toBe('deny');
    expect(result.matchType).toBe('compound_deny');
  });

  it('管道: cat file | sort | uniq → allow (全allow)', () => {
    expect(classifyBashCommand('cat file | sort | uniq').decision).toBe('allow');
  });

  it('链式: git status && git log → allow', () => {
    expect(classifyBashCommand('git status && git log').decision).toBe('allow');
  });

  it('链式: git status && git push → deny (allow + deny)', () => {
    const result = classifyBashCommand('git status && git push');
    expect(result.decision).toBe('deny');
    expect(result.matchType).toBe('compound_deny');
  });

  it('链式: ls || echo error → allow', () => {
    expect(classifyBashCommand('ls || echo error').decision).toBe('allow');
  });

  it('链式: rm file || echo failed → deny', () => {
    expect(classifyBashCommand('rm file || echo failed').decision).toBe('deny');
  });

  // ===== 重定向 =====

  it('echo foo > bar → deny (写重定向)', () => {
    const result = classifyBashCommand('echo foo > output.txt');
    expect(result.decision).toBe('deny');
    expect(result.matchType).toBe('redirect_deny');
  });

  it('cat file >> output → deny (追加重定向)', () => {
    const result = classifyBashCommand('cat input.txt >> output.txt');
    expect(result.decision).toBe('deny');
    expect(result.matchType).toBe('redirect_deny');
  });

  it('ls > /dev/null → deny (即使是/dev/null)', () => {
    expect(classifyBashCommand('ls > /dev/null').decision).toBe('deny');
  });

  // ===== 子shell =====

  it('echo $(ls) → 继续分类外层 (内层安全)', () => {
    // $(ls) 内层是安全的，外层echo是安全的，整体应继续走管道分类
    const result = classifyBashCommand('echo $(ls)');
    expect(result.decision).toBe('allow');
  });

  it('echo $(rm foo) → deny (子shell含破坏性命令)', () => {
    const result = classifyBashCommand('echo $(rm foo)');
    expect(result.decision).toBe('deny');
    expect(result.matchType).toBe('subshell_deny');
  });

  it('反引号: echo `ls` → 内层安全', () => {
    const result = classifyBashCommand('echo `ls`');
    expect(result.decision).toBe('allow');
  });

  it('反引号: echo `rm foo` → deny', () => {
    const result = classifyBashCommand('echo `rm foo`');
    expect(result.decision).toBe('deny');
    expect(result.matchType).toBe('subshell_deny');
  });

  // ===== 边界情况 =====

  it('空命令 → ask', () => {
    const result = classifyBashCommand('');
    expect(result.decision).toBe('ask');
    expect(result.confidence).toBe('low');
  });

  it('纯空格 → ask', () => {
    expect(classifyBashCommand('   ').decision).toBe('ask');
  });

  it('git 前缀不匹配: git → ask (无子命令)', () => {
    expect(classifyBashCommand('git').decision).toBe('ask');
  });

  it('git stash → ask (不在白/黑名单)', () => {
    expect(classifyBashCommand('git stash').decision).toBe('ask');
  });

  it('docker rm → deny (破坏性docker)', () => {
    expect(classifyBashCommand('docker rm container').decision).toBe('deny');
  });

  it('kubectl delete → deny', () => {
    expect(classifyBashCommand('kubectl delete pod my-pod').decision).toBe('deny');
  });
});
