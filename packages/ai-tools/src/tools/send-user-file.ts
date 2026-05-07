/**
 * SendUserFileTool — 向用户发送文件/图片
 *
 * N33: 对齐 CC SendUserFileTool 作为 SendMessage 的附件扩展，允许 AI 代理向用户传递文件。
 */

import type { Buffer } from 'node:buffer';
import { z } from 'zod/v4';
import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ToolUseContext } from '@suga/ai-tool-core';

export const SendUserFileInputSchema = z.strictObject({
  filePath: z.string().min(1).describe('Path to the file to send to the user'),
  description: z.string().optional().describe('Description of the file content')
});

export type SendUserFileInput = z.infer<typeof SendUserFileInputSchema>;

export interface SendUserFileOutput {
  readonly sent: boolean;
  readonly filePath: string;
  readonly fileName: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly error?: string;
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    html: 'text/html',
    zip: 'application/zip'
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

export const sendUserFileTool = buildTool({
  name: 'send_user_file',
  description: async () =>
    'Send a file (image, document, etc.) to the user. Use this to share files, screenshots, or other binary content.',
  safetyLabel: () => 'readonly',
  isReadOnly: () => true,
  inputSchema: SendUserFileInputSchema,
  async call(
    input: SendUserFileInput,
    context: ToolUseContext
  ): Promise<ToolResult<SendUserFileOutput>> {
    const fsProvider = (context as unknown as Record<string, unknown>).fsProvider as
      | {
          stat?: (path: string) => { size: number; isFile: boolean } | null;
          readFile?: (path: string) => Buffer | string | null;
        }
      | undefined;

    if (!fsProvider?.stat) {
      return {
        data: {
          sent: false,
          filePath: input.filePath,
          fileName: '',
          error: 'No fsProvider available'
        }
      };
    }

    const stat = fsProvider.stat(input.filePath);
    if (!stat || !stat.isFile) {
      return {
        data: {
          sent: false,
          filePath: input.filePath,
          fileName: '',
          error: 'File not found or not a file'
        }
      };
    }

    const fileName = input.filePath.split('/').pop() ?? input.filePath;
    const mimeType = guessMimeType(fileName);

    return {
      data: {
        sent: true,
        filePath: input.filePath,
        fileName,
        mimeType,
        sizeBytes: stat.size
      }
    };
  }
});
