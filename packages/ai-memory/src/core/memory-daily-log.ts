/**
 * Memory daily-log 模式（KAIROS assistant 模式）
 *
 * 对齐 Claude Code KAIROS assistant 模式:
 *
 * CC 的记忆系统有 "daily-log" 功能，将当天的工作记录以日志形式 写入项目记忆目录，用于跨 session 保持工作上下文。
 *
 * 功能:
 *
 * 1. buildDailyLogEntry — 构建日志条目（含日期、工作摘要、状态）
 * 2. parseDailyLog — 解析日志条目
 * 3. formatDailyLogForPrompt — 格式化为 prompt 注入文本
 * 4. getLatestDailyLog — 获取最近日志
 *
 * 注: 这是格式化和解析层，存储由宿主 MemoryStorageProvider 处理。
 */

// ============================================================
// 类型定义
// ============================================================

/** Daily Log 条目 */
export interface DailyLogEntry {
  /** 日期（YYYY-MM-DD 格式） */
  readonly date: string;
  /** 工作摘要 */
  readonly summary: string;
  /** 已完成事项 */
  readonly completed: readonly string[];
  /** 进行中事项 */
  readonly inProgress: readonly string[];
  /** 阻塞事项 */
  readonly blockers: readonly string[];
  /** 下一步计划 */
  readonly nextSteps: readonly string[];
  /** 关键决策 */
  readonly decisions?: readonly string[];
}

/** Daily Log 配置 */
export interface DailyLogConfig {
  /** 是否启用 daily-log（默认 true） */
  readonly enabled: boolean;
  /** 日志文件名模板（默认 'daily-{date}.md'） */
  readonly filenameTemplate?: string;
  /** 最大保留天数（默认 30） */
  readonly maxRetentionDays?: number;
}

/** 默认配置 */
export const DEFAULT_DAILY_LOG_CONFIG: DailyLogConfig = {
  enabled: true,
  filenameTemplate: 'daily-{date}.md',
  maxRetentionDays: 30
};

// ============================================================
// 构建 & 解析
// ============================================================

/**
 * buildDailyLogEntry — 构建日志条目
 *
 * 从当天工作信息构建结构化日志条目
 */
export function buildDailyLogEntry(input: {
  date?: string;
  summary: string;
  completed?: readonly string[];
  inProgress?: readonly string[];
  blockers?: readonly string[];
  nextSteps?: readonly string[];
  decisions?: readonly string[];
}): DailyLogEntry {
  const date = input.date ?? new Date().toISOString().slice(0, 10);

  return {
    date,
    summary: input.summary,
    completed: input.completed ?? [],
    inProgress: input.inProgress ?? [],
    blockers: input.blockers ?? [],
    nextSteps: input.nextSteps ?? [],
    decisions: input.decisions
  };
}

/**
 * serializeDailyLog — 将日志条目序列化为 markdown
 *
 * ## 输出格式:
 *
 * ## name: daily-{date}
 *
 * type: project
 *
 * ## Daily Log — {date}
 *
 * **Summary**: {summary}
 *
 * ### Completed
 *
 * - item1
 * - item2
 *
 * ### In Progress
 *
 * - item
 *
 * ### Blockers
 *
 * - item
 *
 * ### Next Steps
 *
 * - item
 *
 * ### Decisions
 *
 * - item
 */
export function serializeDailyLog(entry: DailyLogEntry): string {
  const lines: string[] = [
    `---`,
    `name: daily-${entry.date}`,
    `type: project`,
    `---`,
    `## Daily Log — ${entry.date}`,
    `**Summary**: ${entry.summary}`
  ];

  if (entry.completed.length > 0) {
    lines.push('### Completed');
    for (const item of entry.completed) lines.push(`- ${item}`);
  }

  if (entry.inProgress.length > 0) {
    lines.push('### In Progress');
    for (const item of entry.inProgress) lines.push(`- ${item}`);
  }

  if (entry.blockers.length > 0) {
    lines.push('### Blockers');
    for (const item of entry.blockers) lines.push(`- ${item}`);
  }

  if (entry.nextSteps.length > 0) {
    lines.push('### Next Steps');
    for (const item of entry.nextSteps) lines.push(`- ${item}`);
  }

  if (entry.decisions && entry.decisions.length > 0) {
    lines.push('### Decisions');
    for (const item of entry.decisions) lines.push(`- ${item}`);
  }

  return lines.join('\n');
}

/** parseDailyLog — 从 markdown 解析日志条目 */
export function parseDailyLog(content: string): DailyLogEntry | null {
  // 解析 frontmatter 中的日期
  const nameMatch = content.match(/^---\nname: daily-(\d{4}-\d{2}-\d{2})\n/);
  if (!nameMatch) return null;

  const date = nameMatch[1];

  // 解析摘要
  const summaryMatch = content.match(/\*\*Summary\*\*:\s*(.+)/);
  const summary = summaryMatch?.[1] ?? '';

  // 解析各列表
  const completed = extractListSection(content, 'Completed');
  const inProgress = extractListSection(content, 'In Progress');
  const blockers = extractListSection(content, 'Blockers');
  const nextSteps = extractListSection(content, 'Next Steps');
  const decisions = extractListSection(content, 'Decisions');

  return {
    date,
    summary,
    completed,
    inProgress,
    blockers,
    nextSteps,
    decisions: decisions.length > 0 ? decisions : undefined
  };
}

/** extractListSection — 从 markdown 中提取指定标题下的列表项 */
function extractListSection(content: string, sectionName: string): string[] {
  const sectionRegex = new RegExp(`### ${sectionName}\\n((?:- .+\\n?)+)`, 'm');
  const match = content.match(sectionRegex);
  if (!match) return [];

  return match[1]
    .split('\n')
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * formatDailyLogForPrompt — 格式化为 prompt 注入文本
 *
 * 将最近日志摘要注入到 system prompt 中，保持工作上下文连续性
 */
export function formatDailyLogForPrompt(
  entries: readonly DailyLogEntry[],
  maxEntries?: number
): string {
  if (entries.length === 0) return '';

  const limit = maxEntries ?? 3;
  const recent = entries.slice(0, limit);

  const lines: string[] = ['## Recent Daily Logs\n'];

  for (const entry of recent) {
    lines.push(`### ${entry.date}`);
    lines.push(`Summary: ${entry.summary}`);

    if (entry.completed.length > 0) {
      lines.push(`Completed: ${entry.completed.join(', ')}`);
    }
    if (entry.inProgress.length > 0) {
      lines.push(`In Progress: ${entry.inProgress.join(', ')}`);
    }
    if (entry.blockers.length > 0) {
      lines.push(`Blockers: ${entry.blockers.join(', ')}`);
    }
    if (entry.nextSteps.length > 0) {
      lines.push(`Next Steps: ${entry.nextSteps.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** getDailyLogFilename — 根据配置模板生成日志文件名 */
export function getDailyLogFilename(date: string, config?: DailyLogConfig): string {
  const template = config?.filenameTemplate ?? DEFAULT_DAILY_LOG_CONFIG.filenameTemplate!;
  return template.replace('{date}', date);
}

/** isDailyLogFile — 判断文件名是否为 daily-log 格式 */
export function isDailyLogFile(filename: string): boolean {
  return /^daily-\d{4}-\d{2}-\d{2}\.md$/.test(filename);
}
