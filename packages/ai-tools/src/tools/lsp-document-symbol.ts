/** G2: LSP documentSymbol 工具 */

import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ValidationResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { LspDocumentSymbolInput } from '../types/tool-inputs';
import type { LspDocumentSymbolOutput } from '../types/tool-outputs';
import { LspDocumentSymbolInputSchema } from '../types/tool-inputs';

export const lspDocumentSymbolTool = buildTool<LspDocumentSymbolInput, LspDocumentSymbolOutput>({
  name: 'lsp_document_symbol',

  inputSchema: LspDocumentSymbolInputSchema,

  description: async input => `Get document symbols for ${input.filePath}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as const,
  isDestructive: () => false,

  validateInput: (input: LspDocumentSymbolInput): ValidationResult => {
    if (!input.filePath) {
      return { behavior: 'deny', message: 'filePath is required', reason: 'missing_file_path' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: () => ({ behavior: 'allow', decisionReason: 'lsp_readonly_operation' }),

  call: async (
    input: LspDocumentSymbolInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<LspDocumentSymbolOutput>> => {
    const provider = context.lspProvider;
    if (!provider) {
      return {
        data: { symbols: [], totalSymbols: 0 },
        error: 'No LspProvider available'
      };
    }

    try {
      const result = await provider.documentSymbol(input.filePath);
      return { data: result };
    } catch (err) {
      return {
        data: { symbols: [], totalSymbols: 0 },
        error: `LSP documentSymbol failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
});
