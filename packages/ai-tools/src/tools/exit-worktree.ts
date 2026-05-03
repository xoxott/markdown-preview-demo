/**
 * ExitWorktreeTool — 退出 Git 工作树
 *
 * 对齐 Claude Code ExitWorktreeTool:
 *
 * - action: 'keep' — 保留工作树和分支（不删除）
 * - action: 'remove' — 删除工作树和分支（需要 discard_changes 确认）
 * - 安全检查: 无 session 时拒绝, remove 需要 discard_changes
 *
 * 宿主负责: chdir 回原目录, 系统提示重计算
 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ExitWorktreeInput } from '../types/tool-inputs';
import type { ExitWorktreeOutput } from '../types/tool-outputs';
import { ExitWorktreeInputSchema } from '../types/tool-inputs';

// ============================================================
// ExitWorktreeTool 定义
// ============================================================

export const exitWorktreeTool = buildTool<ExitWorktreeInput, ExitWorktreeOutput>({
  name: 'exit-worktree',
  inputSchema: ExitWorktreeInputSchema,
  description: async input =>
    `Exit worktree session (action: ${input.action}) and return to original directory`,
  searchHint: 'exit leave worktree return original directory remove cleanup',
  shouldDefer: true,
  isReadOnly: () => false,
  isDestructive: input => input.action === 'remove',
  safetyLabel: () => 'system' as SafetyLabel,

  validateInput: (input: ExitWorktreeInput): ValidationResult => {
    // remove 操作需要 discard_changes 确认（但我们无法在 validateInput 中访问 session 状态，
    // 因为 ToolUseContext 没有 metadata — 安全检查推迟到 call() 中）
    if (input.action === 'remove' && !input.discard_changes) {
      return {
        behavior: 'deny',
        message:
          'Removing the worktree will discard all uncommitted changes. Please set discard_changes: true to proceed, or use action: "keep" to preserve.',
        reason: 'requires_discard_confirmation'
      };
    }

    return { behavior: 'allow' };
  },

  checkPermissions: (input: ExitWorktreeInput): PermissionResult => {
    if (input.action === 'remove') {
      return {
        behavior: 'deny',
        message: 'Worktree removal requires explicit confirmation via discard_changes',
        reason: 'destructive_worktree_remove'
      };
    }
    return { behavior: 'allow' };
  },

  call: async (
    input: ExitWorktreeInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<ExitWorktreeOutput>> => {
    const fs = context.fsProvider;

    // 从 ToolResult metadata 获取 session（宿主在 enter-worktree 返回后存储）
    // 这里我们使用一个简单策略: 通过 fsProvider 获取当前 git 仓库的 worktree 信息
    // 而不依赖 context.metadata（ToolUseContext 接口不支持）

    // Step 1: 获取当前 worktree 信息
    const worktreeListResult = await fs.runCommand('git worktree list --porcelain', {
      timeout: 5_000
    });

    if (worktreeListResult.exitCode !== 0) {
      return {
        data: {
          action: input.action,
          originalCwd: '',
          worktreePath: '',
          message: 'No git worktree found or not in a git repository'
        },
        error: 'git worktree list failed'
      };
    }

    // 解析 worktree list — 找到 .claude/worktrees 下的工作树
    const lines = worktreeListResult.stdout.split('\n');
    const worktreePaths = lines.filter(l => l.startsWith('worktree ')).map(l => l.slice(9));

    // 找到我们的 worktree（.claude/worktrees/ 路径）
    const ourWorktree = worktreePaths.find(p => p.includes('.claude/worktrees'));
    if (!ourWorktree) {
      return {
        data: {
          action: input.action,
          originalCwd: '',
          worktreePath: '',
          message:
            'No active worktree session to exit. This tool only operates on worktrees created by enter-worktree.'
        },
        error: 'No worktree session'
      };
    }

    // 获取主仓库路径（第一个 worktree 是主仓库）
    const mainWorktree = worktreePaths[0] ?? process.cwd();

    // 计算工作树中的变更
    let changedFiles = 0;
    const commits = 0;

    try {
      const statusResult = await fs.runCommand(`git -C "${ourWorktree}" status --porcelain`, {
        timeout: 10_000
      });
      if (statusResult.exitCode === 0) {
        changedFiles = statusResult.stdout.split('\n').filter(l => l.trim() !== '').length;
      }
    } catch {
      // git status 失败 → 保守处理
    }

    // 获取分支名
    const branchResult = await fs.runCommand(
      `git -C "${ourWorktree}" rev-parse --abbrev-ref HEAD`,
      {
        timeout: 5_000
      }
    );
    const worktreeBranch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : undefined;

    if (input.action === 'keep') {
      return {
        data: {
          action: 'keep',
          originalCwd: mainWorktree,
          worktreePath: ourWorktree,
          worktreeBranch,
          message: `Exited worktree. Work preserved at ${ourWorktree}${worktreeBranch ? ` on branch ${worktreeBranch}` : ''}. Session should return to ${mainWorktree}.`
        }
      };
    }

    // action === 'remove'
    // git worktree remove <path> --force
    const removeResult = await fs.runCommand(`git worktree remove "${ourWorktree}" --force`, {
      timeout: 30_000
    });

    if (removeResult.exitCode !== 0) {
      return {
        data: {
          action: 'remove',
          originalCwd: mainWorktree,
          worktreePath: ourWorktree,
          worktreeBranch,
          discardedFiles: changedFiles,
          message: `Failed to remove worktree: ${removeResult.stderr}. Session should return to ${mainWorktree}.`
        },
        error: `git worktree remove failed: ${removeResult.stderr}`
      };
    }

    // 删除分支
    if (worktreeBranch && worktreeBranch.startsWith('wt-')) {
      await fs.runCommand(`git branch -D "${worktreeBranch}"`, { timeout: 5_000 }).catch(() => {
        // 分支删除失败不影响主流程
      });
    }

    const discardParts: string[] = [];
    if (commits > 0) discardParts.push(`${commits} commit${commits > 1 ? 's' : ''}`);
    if (changedFiles > 0)
      discardParts.push(`${changedFiles} uncommitted file${changedFiles > 1 ? 's' : ''}`);
    const discardNote = discardParts.length > 0 ? ` Discarded ${discardParts.join(' and ')}.` : '';

    return {
      data: {
        action: 'remove',
        originalCwd: mainWorktree,
        worktreePath: ourWorktree,
        worktreeBranch,
        discardedFiles: changedFiles,
        discardedCommits: commits,
        message: `Exited and removed worktree at ${ourWorktree}.${discardNote} Session should return to ${mainWorktree}.`
      }
    };
  },

  toAutoClassifierInput: (input: ExitWorktreeInput) => ({
    toolName: 'exit-worktree',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: input.action === 'remove'
  }),

  maxResultSizeChars: 100_000
});
