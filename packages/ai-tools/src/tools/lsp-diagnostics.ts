/** G2: LSP diagnostics 工具 */

import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { LspDiagnosticsInput } from '../types/tool-inputs';
import type { LspDiagnosticsOutput } from '../types/tool-outputs';
import { LspDiagnosticsInputSchema } from '../types/tool-inputs';

export const lspDiagnosticsTool = buildTool<LspDiagnosticsInput, LspDiagnosticsOutput>({
  name: 'lsp_diagnostics',

  inputSchema: LspDiagnosticsInputSchema,

  description: async input =>
    input.filePath ? `Get diagnostics for ${input.filePath}` : 'Get workspace diagnostics',

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as const,
  isDestructive: () => false,

  validateInput: () => ({ behavior: 'allow' }),

  checkPermissions: () => ({ behavior: 'allow', decisionReason: 'lsp_readonly_operation' }),

  call: async (
    input: LspDiagnosticsInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<LspDiagnosticsOutput>> => {
    const provider = context.lspProvider;
    if (!provider) {
      return {
        data: {
          diagnostics: [],
          totalDiagnostics: 0,
          bySeverity: { error: 0, warning: 0, information: 0, hint: 0 }
        },
        error: 'No LspProvider available'
      };
    }

    try {
      const result = await provider.diagnostics(input.filePath);
      return { data: result };
    } catch (err) {
      return {
        data: {
          diagnostics: [],
          totalDiagnostics: 0,
          bySeverity: { error: 0, warning: 0, information: 0, hint: 0 }
        },
        error: `LSP diagnostics failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
});
