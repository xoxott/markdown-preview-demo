/** format-helpers 测试 — 格式化辅助函数 */

import { describe, expect, it } from 'vitest';
import {
  formatConfigSections,
  formatConfigValue,
  formatDiagnosticReport,
  formatGitLog,
  formatGitStatus,
  formatMcpServers,
  formatMemoryEntries,
  formatRefreshResult,
  formatSessionStatus
} from '../utils/format-helpers';
import type {
  ConfigSection,
  CostInfo,
  DiagnosticReport,
  GitLogEntry,
  GitStatusResult,
  McpServerEntry,
  MemoryEntry,
  RefreshResult,
  SessionStatus,
  TokenUsageInfo
} from '../types/providers';

const MOCK_STATUS: GitStatusResult = {
  staged: [{ path: 'src/index.ts', status: 'modified' }],
  unstaged: [{ path: 'package.json', status: 'added' }],
  untracked: ['new-feature.ts'],
  branch: 'feature/test',
  aheadBehind: { ahead: 3, behind: 1 }
};

const MOCK_LOG: GitLogEntry[] = [
  { hash: 'abc1234567', subject: 'feat: add memory', author: 'dev', date: '2026-04-28' },
  { hash: 'def2345678', subject: 'fix: path traversal', author: 'dev', date: '2026-04-27' }
];

const MOCK_CONFIG: ConfigSection[] = [
  { key: 'model', value: 'claude-sonnet-4-6', source: 'project' },
  { key: 'permissions.mode', value: 'default', source: 'default', description: 'Permission mode' }
];

const MOCK_DIAG: DiagnosticReport = {
  checks: [
    { name: 'Node.js', status: 'pass', message: 'v20.11.0' },
    { name: 'Git', status: 'fail', message: 'git not found' }
  ],
  passCount: 1,
  failCount: 1,
  warnCount: 0
};

const MOCK_SERVERS: McpServerEntry[] = [
  { name: 'filesystem', state: 'connected', configType: 'stdio' },
  { name: 'postgres', state: 'failed', error: 'Connection refused' }
];

describe('formatGitStatus', () => {
  it('完整状态 → 格式化输出', () => {
    const text = formatGitStatus(MOCK_STATUS);
    expect(text).toContain('Staged changes');
    expect(text).toContain('[M] src/index.ts');
    expect(text).toContain('Unstaged changes');
    expect(text).toContain('[A] package.json');
    expect(text).toContain('Untracked files');
    expect(text).toContain('new-feature.ts');
    expect(text).toContain('Branch: feature/test');
    expect(text).toContain('ahead 3, behind 1');
  });

  it('空状态 → 仅分支', () => {
    const empty: GitStatusResult = {
      staged: [],
      unstaged: [],
      untracked: [],
      branch: 'main'
    };
    const text = formatGitStatus(empty);
    expect(text).toContain('Branch: main');
    expect(text).not.toContain('Staged');
  });
});

describe('formatGitLog', () => {
  it('日志条目 → 格式化', () => {
    const text = formatGitLog(MOCK_LOG);
    expect(text).toContain('abc1234');
    expect(text).toContain('feat: add memory');
  });

  it('count 截取 → 限制数量', () => {
    const text = formatGitLog(MOCK_LOG, 1);
    expect(text).toContain('feat: add memory');
    expect(text).not.toContain('fix: path traversal');
  });
});

describe('formatConfigSections', () => {
  it('配置节 → 格式化', () => {
    const text = formatConfigSections(MOCK_CONFIG);
    expect(text).toContain('model');
    expect(text).toContain('claude-sonnet-4-6');
    expect(text).toContain('[project]');
  });
});

describe('formatConfigValue', () => {
  it('存在的值 → 格式化', () => {
    const text = formatConfigValue('model', { key: 'model', value: 'sonnet', source: 'user' });
    expect(text).toContain('model');
    expect(text).toContain('sonnet');
  });

  it('不存在的值 → 提示未设置', () => {
    const text = formatConfigValue('unknown', undefined);
    expect(text).toContain('not set');
  });
});

describe('formatDiagnosticReport', () => {
  it('完整报告 → 格式化', () => {
    const text = formatDiagnosticReport(MOCK_DIAG);
    expect(text).toContain('✓');
    expect(text).toContain('✗');
    expect(text).toContain('Node.js');
    expect(text).toContain('1 passed');
  });

  it('filter → 仅匹配检查', () => {
    const text = formatDiagnosticReport(MOCK_DIAG, 'node');
    expect(text).toContain('Node.js');
    expect(text).not.toContain('Git');
  });
});

describe('formatMcpServers', () => {
  it('服务器列表 → 格式化', () => {
    const text = formatMcpServers(MOCK_SERVERS);
    expect(text).toContain('filesystem');
    expect(text).toContain('●');
    expect(text).toContain('postgres');
    expect(text).toContain('✗');
    expect(text).toContain('Connection refused');
  });

  it('空列表 → 提示无服务器', () => {
    const text = formatMcpServers([]);
    expect(text).toContain('No MCP servers');
  });
});

describe('formatSessionStatus', () => {
  it('标准会话 → 格式化', () => {
    const text = formatSessionStatus(
      { sessionId: 's1', turnCount: 5, status: 'active' } as SessionStatus,
      { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 } as TokenUsageInfo,
      { totalCost: 0.05, inputCost: 0.03, outputCost: 0.02 } as CostInfo,
      185000,
      'claude-sonnet-4-6'
    );
    expect(text).toContain('s1');
    expect(text).toContain('3m');
    expect(text).toContain('claude-sonnet-4-6');
  });

  it('verbose → 显示详细 token', () => {
    const text = formatSessionStatus(
      { sessionId: 's1', turnCount: 5, status: 'active' } as SessionStatus,
      { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 } as TokenUsageInfo,
      { totalCost: 0.05, inputCost: 0.03, outputCost: 0.02 } as CostInfo,
      185000,
      'sonnet',
      true
    );
    expect(text).toContain('Input tokens');
    expect(text).toContain('Output tokens');
  });
});

describe('formatMemoryEntries', () => {
  it('记忆条目 → 格式化', () => {
    const entries: MemoryEntry[] = [
      {
        filePath: 'user/prefs.md',
        name: 'Prefs',
        description: 'Dark mode',
        type: 'user',
        body: 'VS Code dark theme',
        mtimeMs: Date.now()
      }
    ];
    const text = formatMemoryEntries(entries, 'dark');
    expect(text).toContain('Prefs');
    expect(text).toContain('[user]');
  });

  it('空结果 → 提示无记忆', () => {
    const text = formatMemoryEntries([], 'test');
    expect(text).toContain('No memories');
  });
});

describe('formatRefreshResult', () => {
  it('刷新结果 → 格式化', () => {
    const result: RefreshResult = { filesLoaded: 5, filesSkipped: 1, errors: ['bad.md'] };
    const text = formatRefreshResult(result);
    expect(text).toContain('Loaded: 5');
    expect(text).toContain('Skipped: 1');
    expect(text).toContain('bad.md');
  });

  it('无错误 → 不显示 errors 节', () => {
    const result: RefreshResult = { filesLoaded: 3, filesSkipped: 0, errors: [] };
    const text = formatRefreshResult(result);
    expect(text).not.toContain('Errors');
  });
});
