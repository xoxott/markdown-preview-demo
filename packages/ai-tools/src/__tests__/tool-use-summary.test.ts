import { describe, expect, it } from 'vitest';
import {
  ToolUseSummaryInputSchema,
  formatToolCallsForSummary,
  generateToolUseSummary
} from '../tools/tool-use-summary';

describe('generateToolUseSummary', () => {
  it('generates summary via injected fn', async () => {
    const fn = async () => 'Ran bash and file-edit';
    const result = await generateToolUseSummary(
      [{ name: 'bash', inputSummary: 'ls', resultSummary: '5 files' }],
      fn
    );
    expect(result.summary).toBe('Ran bash and file-edit');
    expect(result.toolCount).toBe(1);
  });

  it('multiple tools → correct count', async () => {
    const fn = async () => 'summary';
    const result = await generateToolUseSummary(
      [{ name: 'bash' }, { name: 'file_edit' }, { name: 'grep' }],
      fn
    );
    expect(result.toolCount).toBe(3);
  });
});

describe('formatToolCallsForSummary', () => {
  it('formats simple calls', () => {
    const result = formatToolCallsForSummary([{ name: 'bash' }]);
    expect(result).toBe('bash');
  });

  it('formats calls with input+result', () => {
    const result = formatToolCallsForSummary([
      { name: 'bash', inputSummary: 'ls -la', resultSummary: '5 files' }
    ]);
    expect(result).toBe('bash in: ls -la out: 5 files');
  });

  it('formats multiple calls', () => {
    const result = formatToolCallsForSummary([
      { name: 'bash' },
      { name: 'file_edit', resultSummary: 'changed 3 lines' }
    ]);
    expect(result).toBe('bash, file_edit out: changed 3 lines');
  });
});

describe('ToolUseSummaryInputSchema', () => {
  it('validates correct input', () => {
    const result = ToolUseSummaryInputSchema.safeParse({
      toolCalls: [{ name: 'bash' }]
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty toolCalls', () => {
    const result = ToolUseSummaryInputSchema.safeParse({
      toolCalls: []
    });
    expect(result.success).toBe(false);
  });
});
