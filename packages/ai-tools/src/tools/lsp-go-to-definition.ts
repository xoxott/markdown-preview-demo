/** G2: LSP goToDefinition 工具 */

import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ValidationResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { LspGoToDefinitionInput } from '../types/tool-inputs';
import type { LspGoToDefinitionOutput } from '../types/tool-outputs';
import { LspGoToDefinitionInputSchema } from '../types/tool-inputs';

export const lspGoToDefinitionTool = buildTool<LspGoToDefinitionInput, LspGoToDefinitionOutput>({
  name: 'lsp_go_to_definition',

  inputSchema: LspGoToDefinitionInputSchema,

  description: async input =>
    `Go to definition at ${input.filePath}:${input.position.line}:${input.position.character}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as const,
  isDestructive: () => false,

  validateInput: (input: LspGoToDefinitionInput): ValidationResult => {
    if (!input.filePath) {
      return { behavior: 'deny', message: 'filePath is required', reason: 'missing_file_path' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: () => ({ behavior: 'allow', decisionReason: 'lsp_readonly_operation' }),

  call: async (
    input: LspGoToDefinitionInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<LspGoToDefinitionOutput>> => {
    const provider = context.lspProvider;
    if (!provider) {
      return {
        data: { locations: [], found: false },
        error: 'No LspProvider available — host must inject lspProvider into context'
      };
    }

    try {
      const result = await provider.goToDefinition(input.filePath, input.position);
      return { data: result };
    } catch (err) {
      return {
        data: { locations: [], found: false },
        error: `LSP goToDefinition failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
});
