/** 工具输出类型定义 */

// === WebFetchTool ===
import type { CommandResult, EditResult, FileContent, GrepResult } from './fs-provider';
// === TaskTools ===
import type {
  TaskEntry,
  TaskOutputResult,
  TaskStopResult,
  TaskUpdateResult
} from './task-provider';
// === TeamTools ===
import type { SendMessageResult, TeamDeleteResult, TeamResult } from './team-provider';
// === WebSearchTool ===
import type { SearchResultItem } from './search-provider';
// === AskUserQuestionTool ===
import type { QuestionInput } from './user-interaction-provider';
// === ConfigTool ===
import type { ConfigValue } from './config-provider';
// === MCP Resource ===
import type { McpResourceContent, McpResourceEntry } from './mcp-resource-provider';
// === PlanMode ===
import type { PlanModeResult } from './plan-mode-provider';

export interface WebFetchOutput {
  readonly content: string;
  readonly mimeType: string;
  readonly statusCode: number;
  readonly bytes: number;
  readonly url: string;
}

// === FileLsTool ===

export type FileLsOutput = import('./fs-provider').FileLsEntry[];

// === NotebookEditTool ===

export interface NotebookEditOutput {
  readonly applied: boolean;
  readonly cellId: string;
  readonly editMode: string;
  readonly error?: string;
}

// === GlobTool ===
export type GlobOutput = string[];

// === GrepTool ===
export type GrepOutput = GrepResult;

// === FileReadTool ===
export type FileReadOutput = FileContent;

// === FileWriteTool ===
export interface FileWriteOutput {
  readonly written: boolean;
  readonly bytesWritten: number;
}

// === FileEditTool ===
export type FileEditOutput = EditResult;

// === BashTool ===
export type BashOutput = CommandResult;

export interface TaskCreateOutput {
  readonly task: { id: string; subject: string };
}

export interface TaskGetOutput {
  readonly task: TaskEntry | null;
}

export interface TaskListOutput {
  readonly tasks: Array<{
    id: string;
    subject: string;
    status: string;
    owner?: string;
    blockedBy: string[];
  }>;
}

export type TaskUpdateOutput = TaskUpdateResult;

export type TeamCreateOutput = TeamResult;
export type TeamDeleteOutput = TeamDeleteResult;
export type SendMessageOutput = SendMessageResult;

// === TaskOutputTool ===
export type TaskOutputOutput = TaskOutputResult;

// === TaskStopTool ===
export type TaskStopOutput = TaskStopResult;

// === WebSearchTool ===
export interface WebSearchOutput {
  readonly query: string;
  readonly results: SearchResultItem[];
  readonly durationSeconds: number;
}

// === AskUserQuestionTool ===
export interface AskUserQuestionOutput {
  readonly questions: QuestionInput[];
  readonly answers: Record<string, string>;
  readonly annotations?: Record<string, { preview?: string; notes?: string }>;
}

// === SkillTool ===
export interface SkillOutput {
  readonly success: boolean;
  readonly commandName: string;
  readonly status: 'inline' | 'forked';
  readonly allowedTools?: string[];
  readonly model?: string;
  readonly result?: string;
}

// === ConfigTool ===
export interface ConfigOutput {
  readonly success: boolean;
  readonly operation?: 'get' | 'set';
  readonly setting?: string;
  readonly value?: ConfigValue;
  readonly previousValue?: ConfigValue;
  readonly newValue?: ConfigValue;
  readonly error?: string;
}

// === ListMcpResourcesTool ===
export type ListMcpResourcesOutput = McpResourceEntry[];

// === ReadMcpResourceTool ===
export type ReadMcpResourceOutput = McpResourceContent;

// === EnterPlanModeTool ===
export type EnterPlanModeOutput = PlanModeResult;

// === ExitPlanModeTool ===
export type ExitPlanModeOutput = PlanModeResult;

// === SleepTool ===
export interface SleepOutput {
  readonly slept: boolean;
  readonly seconds: number;
}

// === StructuredOutputTool ===
export interface StructuredOutputOutput {
  readonly valid: boolean;
  readonly data: Record<string, unknown>;
  readonly errors?: string[];
}

// === ToolSearchTool ===

export interface ToolSearchOutput {
  readonly matches: string[];
  readonly query: string;
  readonly totalDeferredTools: number;
  readonly pendingMcpServers?: string[];
}

// === EnterWorktreeTool ===

export interface EnterWorktreeOutput {
  readonly worktreePath: string;
  readonly worktreeBranch: string;
  readonly message: string;
}

// === ExitWorktreeTool ===

export interface ExitWorktreeOutput {
  readonly action: 'keep' | 'remove';
  readonly originalCwd: string;
  readonly worktreePath: string;
  readonly worktreeBranch?: string;
  readonly discardedFiles?: number;
  readonly discardedCommits?: number;
  readonly message: string;
}
