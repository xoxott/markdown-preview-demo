/** G2: LSP findReferences 工具 */

import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ValidationResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { LspFindReferencesInput } from '../types/tool-inputs';
import type { LspFindReferencesOutput } from '../types/tool-outputs';
import { LspFindReferencesInputSchema } from '../types/tool-inputs';

export const lspFindReferencesTool = buildTool<LspFindReferencesInput, LspFindReferencesOutput>({
  name: 'lsp_find_references',

  inputSchema: LspFindReferencesInputSchema,

  description: async input =>
    `Find references at ${input.filePath}:${input.position.line}:${input.position.character}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as const,
  isDestructive: () => false,

  validateInput: (input: LspFindReferencesInput): ValidationResult => {
    if (!input.filePath) {
      return { behavior: 'deny', message: 'filePath is required', reason: 'missing_file_path' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: () => ({ behavior: 'allow', decisionReason: 'lsp_readonly_operation' }),

  call: async (
    input: LspFindReferencesInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<LspFindReferencesOutput>> => {
    const provider = context.lspProvider;
    if (!provider) {
      return {
        data: { references: [], totalReferences: 0 },
        error: 'No LspProvider available'
      };
    }

    try {
      const result = await provider.findReferences(
        input.filePath,
        input.position,
        input.includeDeclaration
      );
      return { data: result };
    } catch (err) {
      return {
        data: { references: [], totalReferences: 0 },
        error: `LSP findReferences failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
});
