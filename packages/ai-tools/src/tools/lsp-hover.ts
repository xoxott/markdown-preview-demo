/** G2: LSP hover 工具 */

import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ValidationResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { LspHoverInput } from '../types/tool-inputs';
import type { LspHoverOutput } from '../types/tool-outputs';
import { LspHoverInputSchema } from '../types/tool-inputs';

export const lspHoverTool = buildTool<LspHoverInput, LspHoverOutput>({
  name: 'lsp_hover',

  inputSchema: LspHoverInputSchema,

  description: async input =>
    `Get hover info at ${input.filePath}:${input.position.line}:${input.position.character}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as const,
  isDestructive: () => false,

  validateInput: (input: LspHoverInput): ValidationResult => {
    if (!input.filePath) {
      return { behavior: 'deny', message: 'filePath is required', reason: 'missing_file_path' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: () => ({ behavior: 'allow', decisionReason: 'lsp_readonly_operation' }),

  call: async (
    input: LspHoverInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<LspHoverOutput>> => {
    const provider = context.lspProvider;
    if (!provider) {
      return {
        data: { signature: '', found: false },
        error: 'No LspProvider available'
      };
    }

    try {
      const result = await provider.hover(input.filePath, input.position);
      return { data: result };
    } catch (err) {
      return {
        data: { signature: '', found: false },
        error: `LSP hover failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
});
