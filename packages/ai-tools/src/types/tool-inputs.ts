/** 工具 Zod 输入 Schema 定义 */

import { z } from 'zod';

// === WebFetchTool ===

export const WebFetchInputSchema = z.strictObject({
  url: z.string().describe('The URL to fetch content from'),
  prompt: z
    .string()
    .optional()
    .describe('A prompt to apply to the fetched content for extracting specific information'),
  raw: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return raw content instead of Markdown conversion')
});

export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;

// === FileLsTool ===

export const FileLsInputSchema = z.strictObject({
  path: z.string().describe('Directory path to list contents of'),
  recursive: z.boolean().optional().default(false).describe('Recursively list all subdirectories')
});

export type FileLsInput = z.infer<typeof FileLsInputSchema>;

// === NotebookEditTool ===

export const NotebookEditInputSchema = z.strictObject({
  notebook_path: z.string().describe('Absolute path to the Jupyter notebook file to edit'),
  cell_id: z
    .string()
    .optional()
    .describe('The ID of the cell to edit. When inserting, the new cell is added after this cell'),
  new_source: z.string().describe('The new source content for the cell'),
  cell_type: z
    .enum(['code', 'markdown'])
    .optional()
    .describe('Cell type (required for insert mode)'),
  edit_mode: z
    .enum(['replace', 'insert', 'delete'])
    .optional()
    .default('replace')
    .describe('Edit mode: replace, insert, or delete')
});

export type NotebookEditInput = z.infer<typeof NotebookEditInputSchema>;

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

// === TaskCreateTool ===

export const TaskCreateInputSchema = z.strictObject({
  subject: z.string().describe('Brief title for the task'),
  description: z.string().describe('What needs to be done'),
  activeForm: z
    .string()
    .optional()
    .describe('Present continuous form for spinner (e.g. "Running tests")'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary metadata to attach')
});

export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;

// === TaskGetTool ===

export const TaskGetInputSchema = z.strictObject({
  taskId: z.string().describe('Task ID to retrieve')
});

export type TaskGetInput = z.infer<typeof TaskGetInputSchema>;

// === TaskListTool ===

export const TaskListInputSchema = z.strictObject({});

export type TaskListInput = z.infer<typeof TaskListInputSchema>;

// === TaskUpdateTool ===

export const TaskUpdateInputSchema = z.strictObject({
  taskId: z.string().describe('Task ID to update'),
  subject: z.string().optional().describe('New task title'),
  description: z.string().optional().describe('New task description'),
  activeForm: z.string().optional().describe('New spinner text'),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'deleted'])
    .optional()
    .describe('New status'),
  owner: z.string().optional().describe('Agent name claiming this task'),
  addBlocks: z.array(z.string()).optional().describe('Task IDs this task blocks'),
  addBlockedBy: z.array(z.string()).optional().describe('Task IDs that block this task'),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Metadata merge (null values delete keys)')
});

export type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>;

// === TeamCreateTool ===

export const TeamCreateInputSchema = z.strictObject({
  team_name: z.string().describe('Name for the new team'),
  description: z.string().optional().describe('Team description/purpose')
});

export type TeamCreateInput = z.infer<typeof TeamCreateInputSchema>;

// === TeamDeleteTool ===

export const TeamDeleteInputSchema = z.strictObject({});

export type TeamDeleteInput = z.infer<typeof TeamDeleteInputSchema>;

// === SendMessageTool ===

export const SendMessageInputSchema = z.object({
  to: z.string().describe('Recipient name, or "*" for broadcast'),
  summary: z.string().optional().describe('5-10 word summary for UI preview'),
  message: z.union([
    z.string(),
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('shutdown_request'), reason: z.string().optional() }),
      z.object({
        type: z.literal('shutdown_response'),
        request_id: z.string(),
        approve: z.boolean(),
        reason: z.string().optional()
      }),
      z.object({
        type: z.literal('plan_approval_response'),
        request_id: z.string(),
        approve: z.boolean(),
        feedback: z.string().optional()
      })
    ])
  ])
});

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
