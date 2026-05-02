/** 工具输出类型定义 */

// === WebFetchTool ===

import type { CommandResult, EditResult, FileContent, GrepResult } from './fs-provider';

// === TaskTools ===

import type { TaskEntry, TaskOutputResult, TaskStopResult, TaskUpdateResult } from './task-provider';

// === TeamTools ===

import type { SendMessageResult, TeamDeleteResult, TeamResult } from './team-provider';

// === WebSearchTool ===

import type { SearchResultItem } from './search-provider';

// === AskUserQuestionTool ===

import type { QuestionInput } from './user-interaction-provider';

// === ConfigTool ===

import type { ConfigValue } from './config-provider';

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
