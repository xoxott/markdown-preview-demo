/** 6 核心工具输出类型定义 */

import type { CommandResult, EditResult, FileContent, GrepResult } from './fs-provider';

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
