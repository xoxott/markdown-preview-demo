/** MockGitProvider — 测试用的 Git 操作模拟 */

import type { GitLogEntry, GitProvider, GitStatusResult } from '../../types/providers';

/** Mock GitProvider 默认数据 */
const DEFAULT_STATUS: GitStatusResult = {
  staged: [{ path: 'src/index.ts', status: 'modified' }],
  unstaged: [{ path: 'package.json', status: 'modified' }],
  untracked: ['new-feature.ts'],
  branch: 'main',
  aheadBehind: { ahead: 2, behind: 0 }
};

const DEFAULT_LOG: GitLogEntry[] = [
  { hash: 'abc1234567', subject: 'feat: add memory system', author: 'yangtao', date: '2026-04-28' },
  {
    hash: 'def2345678',
    subject: 'fix: resolve path traversal',
    author: 'yangtao',
    date: '2026-04-27'
  },
  {
    hash: 'ghi3456789',
    subject: 'chore: update dependencies',
    author: 'yangtao',
    date: '2026-04-26'
  }
];

const DEFAULT_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc..def 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
+export { newExport } from './new-module';
 export { existingExport } from './module';`;

export class MockGitProvider implements GitProvider {
  private _status: GitStatusResult = DEFAULT_STATUS;
  private _stagedDiff: string = DEFAULT_DIFF;
  private _unstagedDiff: string = 'diff --git a/package.json b/package.json\n+change';
  private _log: GitLogEntry[] = DEFAULT_LOG;
  private _fullDiff: string = `${DEFAULT_DIFF}\n` + `unstaged diff content`;

  /** 设置自定义 status 数据 */
  setStatus(status: GitStatusResult): this {
    this._status = status;
    return this;
  }

  /** 设置自定义 staged diff */
  setStagedDiff(diff: string): this {
    this._stagedDiff = diff;
    return this;
  }

  /** 设置自定义 log */
  setLog(log: GitLogEntry[]): this {
    this._log = log;
    return this;
  }

  async getStatus(): Promise<GitStatusResult> {
    return this._status;
  }

  async getStagedDiff(): Promise<string> {
    return this._stagedDiff;
  }

  async getUnstagedDiff(): Promise<string> {
    return this._unstagedDiff;
  }

  async getLog(count: number): Promise<GitLogEntry[]> {
    return this._log.slice(0, count);
  }

  async getFullDiff(): Promise<string> {
    return this._fullDiff;
  }
}
