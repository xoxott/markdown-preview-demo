/** G2: LSP completion 工具 */

import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ValidationResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { LspCompletionInput } from '../types/tool-inputs';
import type { LspCompletionOutput } from '../types/tool-outputs';
import { LspCompletionInputSchema } from '../types/tool-inputs';

export const lspCompletionTool = buildTool<LspCompletionInput, LspCompletionOutput>({
  name: 'lsp_completion',

  inputSchema: LspCompletionInputSchema,

  description: async input =>
    `Get completions at ${input.filePath}:${input.position.line}:${input.position.character}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as const,
  isDestructive: () => false,

  validateInput: (input: LspCompletionInput): ValidationResult => {
    if (!input.filePath) {
      return { behavior: 'deny', message: 'filePath is required', reason: 'missing_file_path' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: () => ({ behavior: 'allow', decisionReason: 'lsp_readonly_operation' }),

  call: async (
    input: LspCompletionInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<LspCompletionOutput>> => {
    const provider = context.lspProvider;
    if (!provider) {
      return {
        data: { items: [], isIncomplete: false },
        error: 'No LspProvider available'
      };
    }

    try {
      const result = await provider.completion(input.filePath, input.position);
      return { data: result };
    } catch (err) {
      return {
        data: { items: [], isIncomplete: false },
        error: `LSP completion failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
});
