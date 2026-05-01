/** 格式化辅助函数 — 将 provider 返回的结构化数据格式化为可读文本 */

import type {
  ConfigSection,
  ConfigValue,
  CostInfo,
  DiagnosticReport,
  GitFileChange,
  GitLogEntry,
  GitStatusResult,
  McpServerEntry,
  MemoryEntry,
  RefreshResult,
  SessionStatus,
  TokenUsageInfo
} from '../types/providers';

/** 格式化 git status */
export function formatGitStatus(status: GitStatusResult): string {
  const lines: string[] = [];

  if (status.staged.length > 0) {
    lines.push('## Staged changes:');
    for (const change of status.staged) {
      lines.push(`  ${formatFileChange(change)}`);
    }
  }

  if (status.unstaged.length > 0) {
    lines.push('## Unstaged changes:');
    for (const change of status.unstaged) {
      lines.push(`  ${formatFileChange(change)}`);
    }
  }

  if (status.untracked.length > 0) {
    lines.push('## Untracked files:');
    for (const file of status.untracked) {
      lines.push(`  ${file}`);
    }
  }

  if (status.aheadBehind) {
    lines.push(
      `## Branch: ${status.branch} (ahead ${status.aheadBehind.ahead}, behind ${status.aheadBehind.behind})`
    );
  } else {
    lines.push(`## Branch: ${status.branch}`);
  }

  return lines.join('\n');
}

/** 格式化单个文件变更 */
function formatFileChange(change: GitFileChange): string {
  const statusMap: Record<GitFileChange['status'], string> = {
    added: 'A',
    modified: 'M',
    deleted: 'D',
    renamed: 'R'
  };
  return `[${statusMap[change.status]}] ${change.path}`;
}

/** 格式化 git log */
export function formatGitLog(entries: readonly GitLogEntry[], count?: number): string {
  const shown = count ? entries.slice(0, count) : entries;
  const lines: string[] = ['## Recent commits:'];

  for (const entry of shown) {
    lines.push(`- ${entry.hash.slice(0, 7)} ${entry.subject} (${entry.author}, ${entry.date})`);
  }

  return lines.join('\n');
}

/** 格式化配置节列表 */
export function formatConfigSections(sections: readonly ConfigSection[]): string {
  const lines: string[] = ['## Configuration:'];

  for (const section of sections) {
    const sourceTag =
      section.source === 'default' ? 'default' : section.source === 'user' ? 'user' : 'project';
    lines.push(`- ${section.key}: ${JSON.stringify(section.value)} [${sourceTag}]`);
    if (section.description) {
      lines.push(`  (${section.description})`);
    }
  }

  return lines.join('\n');
}

/** 格式化单个配置值 */
export function formatConfigValue(key: string, value: ConfigValue | undefined): string {
  if (value === undefined) {
    return `Configuration key "${key}" is not set.`;
  }

  const lines: string[] = [
    `## ${key}:`,
    `  Value: ${JSON.stringify(value.value)}`,
    `  Source: ${value.source}`
  ];

  if (value.defaultValue !== undefined) {
    lines.push(`  Default: ${JSON.stringify(value.defaultValue)}`);
  }

  return lines.join('\n');
}

/** 格式化诊断报告 */
export function formatDiagnosticReport(report: DiagnosticReport, filter?: string): string {
  const checks = filter
    ? report.checks.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
    : report.checks;

  const lines: string[] = [
    '## Diagnostic Report:',
    `  ${report.passCount} passed, ${report.failCount} failed, ${report.warnCount} warnings`,
    ''
  ];

  for (const check of checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
    lines.push(`${icon} ${check.name}: ${check.message}`);
    if (check.details) {
      lines.push(`  Details: ${check.details}`);
    }
  }

  return lines.join('\n');
}

/** 格式化 MCP 服务器列表 */
export function formatMcpServers(servers: readonly McpServerEntry[]): string {
  if (servers.length === 0) {
    return 'No MCP servers configured.';
  }

  const lines: string[] = ['## MCP Servers:'];

  for (const server of servers) {
    const stateIcon =
      server.state === 'connected'
        ? '●'
        : server.state === 'failed'
          ? '✗'
          : server.state === 'pending'
            ? '○'
            : server.state === 'needs-auth'
              ? '🔒'
              : '—';
    lines.push(`- ${stateIcon} ${server.name} (${server.state})`);
    if (server.configType) {
      lines.push(`  Type: ${server.configType}`);
    }
    if (server.error) {
      lines.push(`  Error: ${server.error}`);
    }
  }

  return lines.join('\n');
}

/** 格式化会话状态 */
export function formatSessionStatus(
  status: SessionStatus,
  tokenUsage: TokenUsageInfo,
  cost: CostInfo,
  durationMs: number,
  model: string,
  verbose?: boolean
): string {
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  const lines: string[] = [
    '## Session Status:',
    `  Session: ${status.sessionId}`,
    `  Status: ${status.status}`,
    `  Turns: ${status.turnCount}`,
    `  Duration: ${durationMin}m ${durationSec}s`,
    `  Model: ${model}`
  ];

  if (verbose) {
    lines.push(
      `  Input tokens: ${tokenUsage.inputTokens}`,
      `  Output tokens: ${tokenUsage.outputTokens}`,
      `  Total tokens: ${tokenUsage.totalTokens}`,
      `  Total cost: $${cost.totalCost.toFixed(4)}`
    );
  } else {
    lines.push(`  Tokens: ${tokenUsage.totalTokens}`, `  Cost: $${cost.totalCost.toFixed(4)}`);
  }

  return lines.join('\n');
}

/** 格式化记忆 recall 结果 */
export function formatMemoryEntries(entries: readonly MemoryEntry[], query: string): string {
  if (entries.length === 0) {
    return `No memories found for "${query}".`;
  }

  const lines: string[] = [`## Memories matching "${query}":`];

  for (const entry of entries) {
    lines.push(`- [${entry.type}] ${entry.name}: ${entry.description}`);
    if (entry.body.length > 200) {
      lines.push(`  ${entry.body.slice(0, 200)}...`);
    } else {
      lines.push(`  ${entry.body}`);
    }
  }

  return lines.join('\n');
}

/** 格式化记忆 refresh 结果 */
export function formatRefreshResult(result: RefreshResult): string {
  const lines: string[] = [
    '## Memory refresh:',
    `  Loaded: ${result.filesLoaded} files`,
    `  Skipped: ${result.filesSkipped} files`
  ];

  if (result.errors.length > 0) {
    lines.push('  Errors:');
    for (const error of result.errors) {
      lines.push(`    - ${error}`);
    }
  }

  return lines.join('\n');
}
