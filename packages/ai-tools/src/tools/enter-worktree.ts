/**
 * EnterWorktreeTool — 创建隔离 Git 工作树
 *
 * 对齐 Claude Code EnterWorktreeTool:
 *
 * - git worktree add 创建隔离工作目录
 * - 新分支基于 HEAD
 * - 返回工作树路径和分支信息
 * - 保存会话状态（供 ExitWorktreeTool 消费）
 *
 * 宿主负责: chdir, 系统提示重计算, 内存缓存清除
 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { EnterWorktreeInput } from '../types/tool-inputs';
import type { EnterWorktreeOutput } from '../types/tool-outputs';
import { EnterWorktreeInputSchema } from '../types/tool-inputs';

// ============================================================
// 工作树会话状态（供 ExitWorktreeTool 消费）
// ============================================================

export interface WorktreeSession {
  readonly worktreePath: string;
  readonly worktreeBranch: string;
  readonly originalCwd: string;
  readonly originalHeadCommit: string;
  readonly createdAt: number;
}

// ============================================================
// EnterWorktreeTool 定义
// ============================================================

export const enterWorktreeTool = buildTool<EnterWorktreeInput, EnterWorktreeOutput>({
  name: 'enter-worktree',
  inputSchema: EnterWorktreeInputSchema,
  description: async input =>
    `Create an isolated git worktree${input.name ? ` named "${input.name}"` : ''} and switch into it`,
  searchHint: 'create isolated git worktree switch directory branch',
  shouldDefer: true,
  isReadOnly: () => false,
  isDestructive: () => false,
  safetyLabel: () => 'system' as SafetyLabel,

  validateInput: (_input: EnterWorktreeInput): ValidationResult => {
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => ({ behavior: 'allow' }),

  call: async (
    input: EnterWorktreeInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<EnterWorktreeOutput>> => {
    const fs = context.fsProvider;

    // 生成工作树名称
    const slug = input.name ?? `worktree_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const branchName = `wt-${slug}`;
    const worktreeDir = `.claude/worktrees/${slug}`;

    // Step 1: git worktree add <path> -b <branch>
    const addResult = await fs.runCommand(`git worktree add "${worktreeDir}" -b "${branchName}"`, {
      timeout: 30_000
    });

    if (addResult.exitCode !== 0) {
      return {
        data: {
          worktreePath: '',
          worktreeBranch: branchName,
          message: `Failed to create worktree: ${addResult.stderr}`
        },
        error: `git worktree add failed: ${addResult.stderr}`
      };
    }

    // Step 2: 获取原始 HEAD commit
    const headResult = await fs.runCommand('git rev-parse HEAD', { timeout: 5_000 });
    const originalHeadCommit = headResult.stdout.trim();

    // Step 3: 获取完整工作树路径
    const fullPathResult = await fs.runCommand(
      `git -C "${worktreeDir}" rev-parse --show-toplevel`,
      {
        timeout: 5_000
      }
    );
    const worktreePath = fullPathResult.stdout.trim() || worktreeDir;

    // Step 4: 保存会话状态（通过 ToolResult metadata 传递）
    const session: WorktreeSession = {
      worktreePath,
      worktreeBranch: branchName,
      originalCwd: process.cwd(),
      originalHeadCommit,
      createdAt: Date.now()
    };

    return {
      data: {
        worktreePath,
        worktreeBranch: branchName,
        message: `Created worktree at ${worktreePath} on branch ${branchName}. The session should switch to this directory. Use exit-worktree to leave.`
      },
      metadata: { worktreeSession: session }
    };
  },

  toAutoClassifierInput: (input: EnterWorktreeInput) => ({
    toolName: 'enter-worktree',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
