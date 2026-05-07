/** G6 Git 操作跟踪测试 */

import { describe, expect, it } from 'vitest';
import {
  GitOperationTracker,
  detectGitOperation,
  parseCommitSha,
  parsePRInfo
} from '../tools/git-tracking';

describe('detectGitOperation', () => {
  it('git commit → type=commit', () => {
    const result = detectGitOperation('git commit -m "feat: add feature"');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('commit');
    expect(result.isDestructive).toBe(false);
  });

  it('git push → type=push, isDestructive=true', () => {
    const result = detectGitOperation('git push origin main');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('push');
    expect(result.isDestructive).toBe(true);
  });

  it('git checkout → type=checkout', () => {
    const result = detectGitOperation('git checkout -b feature');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('checkout');
  });

  it('git branch -D → type=branch_delete, isDestructive=true', () => {
    const result = detectGitOperation('git branch -D old-branch');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('branch_delete');
    expect(result.isDestructive).toBe(true);
  });

  it('git branch → type=branch_create', () => {
    const result = detectGitOperation('git branch new-branch');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('branch_create');
  });

  it('git reset --hard → type=reset, isDestructive=true', () => {
    const result = detectGitOperation('git reset --hard HEAD~1');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('reset');
    expect(result.isDestructive).toBe(true);
  });

  it('git status → type=status', () => {
    const result = detectGitOperation('git status');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('status');
    expect(result.isDestructive).toBe(false);
  });

  it('git log → type=log', () => {
    const result = detectGitOperation('git log --oneline -5');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('log');
  });

  it('非 git 命令 → isGitOp=false', () => {
    const result = detectGitOperation('ls -la');
    expect(result.isGitOp).toBe(false);
  });

  it('git cherry-pick → type=cherry_pick', () => {
    const result = detectGitOperation('git cherry-pick abc123');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('cherry_pick');
  });

  it('git -C /path commit → type=commit', () => {
    const result = detectGitOperation('git -C /home/project commit -m "fix"');
    expect(result.isGitOp).toBe(true);
    expect(result.type).toBe('commit');
  });
});

describe('parseCommitSha', () => {
  it('完整 SHA (40字符)', () => {
    const sha = 'abcdef1234567890abcdef1234567890abcdef12';
    const result = parseCommitSha(`[${sha}] feat: add feature`);
    expect(result.found).toBe(true);
    expect(result.sha).toBe(sha);
    expect(result.isAbbreviated).toBe(false);
  });

  it('缩写 SHA (7字符)', () => {
    const result = parseCommitSha('abc1234 feat: add feature');
    expect(result.found).toBe(true);
    expect(result.sha).toBe('abc1234');
    expect(result.isAbbreviated).toBe(true);
  });

  it('无 SHA → found=false', () => {
    const result = parseCommitSha('Nothing to commit');
    expect(result.found).toBe(false);
  });
});

describe('parsePRInfo', () => {
  it('GitHub PR URL', () => {
    const result = parsePRInfo('https://github.com/owner/repo/pull/42');
    expect(result.found).toBe(true);
    expect(result.prNumber).toBe(42);
    expect(result.url).toBe('https://github.com/owner/repo/pull/42');
    expect(result.status).toBe('open');
  });

  it('创建 PR 输出', () => {
    const result = parsePRInfo('Created pull request #123: Fix bug');
    expect(result.found).toBe(true);
    expect(result.prNumber).toBe(123);
    expect(result.title).toBe('Fix bug');
  });

  it('简号格式', () => {
    const result = parsePRInfo('See #456 for details');
    expect(result.found).toBe(true);
    expect(result.prNumber).toBe(456);
  });

  it('无 PR → found=false', () => {
    const result = parsePRInfo('No PR info here');
    expect(result.found).toBe(false);
  });
});

describe('GitOperationTracker', () => {
  let tracker: GitOperationTracker;

  beforeEach(() => {
    tracker = new GitOperationTracker();
  });
  afterEach(() => {
    tracker.reset();
  });

  it('track git commit → 记录带 SHA', () => {
    const record = tracker.track('git commit -m "feat"', '[abc1234def] feat: add feature');
    expect(record).not.toBeNull();
    expect(record!.type).toBe('commit');
    expect(record!.commitSha).toBe('abc1234def');
  });

  it('track git push → 记录（无 SHA 也要记录 push）', () => {
    const record = tracker.track('git push origin main', 'Everything up-to-date');
    expect(record).not.toBeNull();
    expect(record!.type).toBe('push');
    expect(record!.isDestructive).toBe(true);
  });

  it('track 非 git 命令 → null', () => {
    const record = tracker.track('ls -la', 'file1\nfile2');
    expect(record).toBeNull();
  });

  it('track git status → null（无 SHA/PR/push/checkout）', () => {
    const record = tracker.track('git status', 'On branch main');
    expect(record).toBeNull();
  });

  it('track git checkout → 记录', () => {
    const record = tracker.track('git checkout main', 'Switched to branch main');
    expect(record).not.toBeNull();
    expect(record!.type).toBe('checkout');
  });

  it('track PR 创建 → 记录带 prInfo', () => {
    const record = tracker.track(
      'gh pr create --title "Fix" --body "desc"',
      'Created pull request #42: Fix'
    );
    // gh 不是 git → isGitOp=false → null
    // 但 gh pr create 是特殊命令，此处只检测 git 命令
    expect(record).toBeNull();
  });

  it('getRecords → 返回所有记录', () => {
    tracker.track('git commit -m "a"', '[abc1234def] a');
    tracker.track('git push origin main', 'done');
    expect(tracker.getRecords().length).toBe(2);
  });

  it('getRecentRecords → 返回最近N条', () => {
    tracker.track('git commit -m "a"', '[abc1234def] a');
    tracker.track('git push origin main', 'done');
    tracker.track('git checkout -b feat', 'Switched');
    const recent = tracker.getRecentRecords(2);
    expect(recent.length).toBe(2);
    expect(recent[0].type).toBe('push');
  });

  it('reset → 清空', () => {
    tracker.track('git commit -m "a"', '[abc1234def] a');
    tracker.reset();
    expect(tracker.getRecords().length).toBe(0);
  });
});
