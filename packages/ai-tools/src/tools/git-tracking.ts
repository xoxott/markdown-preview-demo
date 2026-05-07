/**
 * G6: Git 操作跟踪 — commit SHA/PR 解析 + git 操作检测
 *
 * 对齐 Claude Code 的 Git 跟踪工具集:
 *
 * 1. detectGitOperation — 从 Bash 命令检测 git 操作类型
 * 2. parseCommitSha — 从 git 输出解析 commit SHA
 * 3. parsePRInfo — 从 gh 命令输出解析 PR 信息
 * 4. trackGitOperations — Git 操作记录器（记录每次 git 操作的元信息）
 */

// ============================================================
// 1. Git 操作类型检测
// ============================================================

/** Git 操作类型 */
export type GitOperationType =
  | 'commit'
  | 'push'
  | 'pull'
  | 'checkout'
  | 'branch_create'
  | 'branch_delete'
  | 'merge'
  | 'rebase'
  | 'reset'
  | 'stash'
  | 'tag'
  | 'cherry_pick'
  | 'amend'
  | 'diff'
  | 'log'
  | 'status'
  | 'add'
  | 'remote'
  | 'clone'
  | 'init'
  | 'other';

/** Git 操作检测结果 */
export interface GitOperationDetection {
  /** 是否检测到 git 操作 */
  readonly isGitOp: boolean;
  /** 操作类型 */
  readonly type: GitOperationType;
  /** 原始命令 */
  readonly command: string;
  /** 是否为破坏性操作 */
  readonly isDestructive: boolean;
}

/**
 * detectGitOperation — 从 Bash 命令字符串检测 git 操作
 *
 * 解析命令的第一个 token，判断是否为 git 子命令。 同时检测破坏性操作（push、reset --hard、branch -D 等）。
 */
export function detectGitOperation(command: string): GitOperationDetection {
  // 提取命令的第一个 token（跳过 env vars 和 safe wrappers）
  const trimmed = command.trim();
  // 匹配 git 子命令: git <subcommand> 或 git -C <dir> <subcommand>
  // 支持 cherry-pick 等带连字符的子命令
  const gitMatch = trimmed.match(/^git\s+(?:-[a-zA-Z]\s+\S+\s+)?([\w-]+)/);
  if (!gitMatch) {
    return { isGitOp: false, type: 'other', command, isDestructive: false };
  }

  const subcommand = gitMatch[1].toLowerCase();

  // 操作类型映射
  const typeMap: Record<string, GitOperationType> = {
    'commit': 'commit',
    'push': 'push',
    'pull': 'pull',
    'checkout': 'checkout',
    'switch': 'checkout',
    'branch':
      trimmed.includes('-D') || trimmed.includes('--delete') ? 'branch_delete' : 'branch_create',
    'merge': 'merge',
    'rebase': 'rebase',
    'reset': 'reset',
    'stash': 'stash',
    'tag': 'tag',
    'cherry-pick': 'cherry_pick',
    'diff': 'diff',
    'log': 'log',
    'status': 'status',
    'add': 'add',
    'remote': 'remote',
    'clone': 'clone',
    'init': 'init'
  };

  const type = typeMap[subcommand] ?? 'other';

  // 破坏性操作检测
  const isDestructive =
    type === 'push' ||
    type === 'reset' ||
    type === 'branch_delete' ||
    type === 'merge' ||
    type === 'rebase';

  return { isGitOp: true, type, command, isDestructive };
}

// ============================================================
// 2. Commit SHA 解析
// ============================================================

/** Commit SHA 解析结果 */
export interface CommitShaParseResult {
  /** 是否解析到 SHA */
  readonly found: boolean;
  /** Commit SHA（完整或缩写） */
  readonly sha?: string;
  /** 是否为缩写 SHA（7字符） */
  readonly isAbbreviated?: boolean;
}

/**
 * parseCommitSha — 从 git 输出解析 commit SHA
 *
 * 支持格式:
 *
 * - [abc1234] message → 缩写 SHA
 * - abc1234def5678901234567890123456789012 message → 完整 SHA
 * - Commit abc1234 → 缩写 SHA
 */
export function parseCommitSha(output: string): CommitShaParseResult {
  // 完整 SHA: 40字符十六进制（优先匹配，正则引擎贪婪匹配会优先取40字符）
  const fullShaMatch = output.match(/([0-9a-f]{40})/);
  if (fullShaMatch) {
    return { found: true, sha: fullShaMatch[1], isAbbreviated: false };
  }

  // 缩写 SHA: 7-12字符十六进制（只在没有40字符SHA时匹配）
  // 要求后面不是更多hex字符（防止截断）
  const abbrevShaMatch = output.match(/([0-9a-f]{7,12})(?:[^0-9a-f]|$)/);
  if (abbrevShaMatch) {
    return { found: true, sha: abbrevShaMatch[1], isAbbreviated: true };
  }

  return { found: false };
}

// ============================================================
// 3. PR 信息解析
// ============================================================

/** PR 信息解析结果 */
export interface PRParseResult {
  /** 是否解析到 PR 信息 */
  readonly found: boolean;
  /** PR 编号 */
  readonly prNumber?: number;
  /** PR URL */
  readonly url?: string;
  /** PR 状态 */
  readonly status?: 'open' | 'closed' | 'merged';
  /** PR 标题 */
  readonly title?: string;
}

/**
 * parsePRInfo — 从 gh 命令输出解析 PR 信息
 *
 * 支持格式:
 *
 * - https://github.com/owner/repo/pull/123 → URL
 * - #123 → 简号
 * - Creating pull request #123: Title → 创建输出
 */
export function parsePRInfo(output: string): PRParseResult {
  // URL 格式
  const urlMatch = output.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (urlMatch) {
    return {
      found: true,
      prNumber: Number.parseInt(urlMatch[3]),
      url: urlMatch[0],
      status: 'open'
    };
  }

  // 创建输出格式: "Creating pull request #123: Title"
  const createMatch = output.match(/(?:Creating|Created) pull request #(\d+):?\s*(.*)/);
  if (createMatch) {
    return {
      found: true,
      prNumber: Number.parseInt(createMatch[1]),
      title: createMatch[2]?.trim() || undefined,
      status: 'open'
    };
  }

  // 简号格式: #123
  const simpleMatch = output.match(/#(\d+)/);
  if (simpleMatch) {
    return {
      found: true,
      prNumber: Number.parseInt(simpleMatch[1])
    };
  }

  return { found: false };
}

// ============================================================
// 4. Git 操作记录器
// ============================================================

/** Git 操作记录条目 */
export interface GitOperationRecord {
  /** 操作类型 */
  readonly type: GitOperationType;
  /** 原始命令 */
  readonly command: string;
  /** Commit SHA（如有） */
  readonly commitSha?: string;
  /** PR 信息（如有） */
  readonly prInfo?: PRParseResult;
  /** 是否破坏性 */
  readonly isDestructive: boolean;
  /** 时间戳 */
  readonly timestamp: number;
}

/**
 * GitOperationTracker — Git 操作记录器
 *
 * 每次 Bash 执行 git 命令后记录操作元信息， 便于宿主追踪 git 状态变化（如 commit SHA、PR 创建等）。
 */
export class GitOperationTracker {
  private records: GitOperationRecord[] = [];

  /**
   * track — 从命令和输出记录 git 操作
   *
   * @param command Bash 命令
   * @param output 命令输出
   */
  track(command: string, output: string): GitOperationRecord | null {
    const detection = detectGitOperation(command);
    if (!detection.isGitOp) return null;

    const sha = parseCommitSha(output).sha;
    const prInfo = parsePRInfo(output);

    // push 和 checkout 总是记录（重要操作），其他只在找到了 SHA 或 PR 时才记录
    if (
      !sha &&
      !prInfo.found &&
      detection.type !== 'push' &&
      detection.type !== 'checkout' &&
      detection.type !== 'pull' &&
      detection.type !== 'merge'
    ) {
      return null;
    }

    const record: GitOperationRecord = {
      type: detection.type,
      command,
      commitSha: sha,
      prInfo: prInfo.found ? prInfo : undefined,
      isDestructive: detection.isDestructive,
      timestamp: Date.now()
    };

    this.records.push(record);
    return record;
  }

  /** 获取所有记录 */
  getRecords(): readonly GitOperationRecord[] {
    return this.records;
  }

  /** 获取最近的 N 条记录 */
  getRecentRecords(limit: number): readonly GitOperationRecord[] {
    return this.records.slice(-limit);
  }

  /** 清空记录 */
  reset(): void {
    this.records = [];
  }
}
