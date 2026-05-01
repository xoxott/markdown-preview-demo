/** 6 核心工具 Zod 输入 Schema 定义 */

import { z } from 'zod';

// === GlobTool ===

export const GlobInputSchema = z.strictObject({
  pattern: z.string().describe('Glob pattern to match files against'),
  path: z.string().optional().describe('Directory to search in (defaults to cwd)')
});

export type GlobInput = z.infer<typeof GlobInputSchema>;

// === GrepTool ===

export const GrepInputSchema = z.strictObject({
  pattern: z.string().describe('Regular expression pattern to search for'),
  path: z.string().optional().describe('Directory or file to search in'),
  glob: z.string().optional().describe('Glob pattern for file filtering (e.g. "*.ts")'),
  outputMode: z
    .enum(['content', 'files-with-matches', 'count'])
    .optional()
    .default('files-with-matches')
    .describe('Output mode: content (lines), files-with-matches (paths), or count (per file)'),
  caseInsensitive: z.boolean().optional().describe('Case-insensitive search'),
  contextBefore: z.number().int().min(0).optional().describe('Lines before each match'),
  contextAfter: z.number().int().min(0).optional().describe('Lines after each match'),
  contextLines: z.number().int().min(0).optional().describe('Lines before and after each match'),
  headLimit: z.number().int().min(0).optional().describe('Maximum number of results')
});

export type GrepInput = z.infer<typeof GrepInputSchema>;

// === FileReadTool ===

export const FileReadInputSchema = z.strictObject({
  filePath: z.string().describe('Absolute path to the file to read'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Line number to start reading from (0-based)'),
  limit: z.number().int().min(1).optional().describe('Number of lines to read'),
  pages: z.string().optional().describe('Page range for PDF files (e.g. "1-5", "3", "10-20")')
});

export type FileReadInput = z.infer<typeof FileReadInputSchema>;

// === FileWriteTool ===

export const FileWriteInputSchema = z.strictObject({
  filePath: z.string().describe('Absolute path to the file to write'),
  content: z.string().describe('Full file content to write (overwrites existing)')
});

export type FileWriteInput = z.infer<typeof FileWriteInputSchema>;

// === FileEditTool ===

export const FileEditInputSchema = z.strictObject({
  filePath: z.string().describe('Absolute path to the file to edit'),
  oldString: z.string().describe('Exact string to find and replace (must be unique in file)'),
  newString: z.string().describe('Replacement string'),
  replaceAll: z
    .boolean()
    .optional()
    .default(false)
    .describe('Replace all occurrences instead of requiring unique match')
});

export type FileEditInput = z.infer<typeof FileEditInputSchema>;

// === BashTool ===

export const BashInputSchema = z.strictObject({
  command: z.string().describe('Shell command to execute'),
  timeout: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Timeout in milliseconds (max 600000, default 120000)'),
  description: z.string().optional().describe('Short description of what this command does'),
  runInBackground: z
    .boolean()
    .optional()
    .default(false)
    .describe('Run command in background (non-blocking)')
});

export type BashInput = z.infer<typeof BashInputSchema>;
