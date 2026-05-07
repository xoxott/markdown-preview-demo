import { describe, expect, it } from 'vitest';
import { SendUserFileInputSchema, sendUserFileTool } from '../tools/send-user-file';

describe('SendUserFileInputSchema', () => {
  it('validates valid input', () => {
    const result = SendUserFileInputSchema.safeParse({ filePath: '/path/to/image.png' });
    expect(result.success).toBe(true);
  });

  it('rejects empty filePath', () => {
    const result = SendUserFileInputSchema.safeParse({ filePath: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional description', () => {
    const result = SendUserFileInputSchema.safeParse({
      filePath: '/a.png',
      description: 'A screenshot'
    });
    expect(result.success).toBe(true);
  });
});

describe('sendUserFileTool', () => {
  it('returns error when no fsProvider', async () => {
    const result = await sendUserFileTool.call({ filePath: '/test.png' }, {});
    expect(result.data.sent).toBe(false);
    expect(result.data.error).toBe('No fsProvider available');
  });

  it('returns error when file not found', async () => {
    const fsProvider = { stat: (_path: string) => null };
    const result = await sendUserFileTool.call({ filePath: '/missing.png' }, { fsProvider });
    expect(result.data.sent).toBe(false);
    expect(result.data.error).toBe('File not found or not a file');
  });

  it('returns success with file info', async () => {
    const fsProvider = {
      stat: (_path: string) => ({ size: 1024, isFile: true })
    };
    const result = await sendUserFileTool.call({ filePath: '/docs/image.png' }, { fsProvider });
    expect(result.data.sent).toBe(true);
    expect(result.data.fileName).toBe('image.png');
    expect(result.data.mimeType).toBe('image/png');
    expect(result.data.sizeBytes).toBe(1024);
  });

  it('guesses mime type from extension', async () => {
    const fsProvider = {
      stat: (_path: string) => ({ size: 500, isFile: true })
    };
    const result = await sendUserFileTool.call({ filePath: '/data/report.pdf' }, { fsProvider });
    expect(result.data.mimeType).toBe('application/pdf');
  });
});
