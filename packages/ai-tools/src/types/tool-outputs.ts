/** 工具输出类型定义 */

// === WebFetchTool ===

import type { CommandResult, EditResult, FileContent, GrepResult } from './fs-provider';

// === TaskTools ===

import type { TaskEntry, TaskUpdateResult } from './task-provider';

// === TeamTools ===

import type { SendMessageResult, TeamDeleteResult, TeamResult } from './team-provider';

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
