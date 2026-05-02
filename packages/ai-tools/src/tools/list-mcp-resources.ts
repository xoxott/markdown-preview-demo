/** ListMcpResourcesTool — 列出MCP服务器资源 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ListMcpResourcesInput } from '../types/tool-inputs';
import type { ListMcpResourcesOutput } from '../types/tool-outputs';
import { ListMcpResourcesInputSchema } from '../types/tool-inputs';

export const listMcpResourcesTool = buildTool<ListMcpResourcesInput, ListMcpResourcesOutput>({
  name: 'list-mcp-resources',

  inputSchema: ListMcpResourcesInputSchema,

  description: async input =>
    input.server
      ? `List resources from MCP server "${input.server}"`
      : 'List resources from all MCP servers',

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (): ValidationResult => ({ behavior: 'allow' }),
  checkPermissions: (): PermissionResult => ({ behavior: 'allow' }),

  call: async (
    input: ListMcpResourcesInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<ListMcpResourcesOutput>> => {
    const provider = context.mcpResourceProvider;
    if (!provider) {
      return { data: [] };
    }
    const resources = await provider.listResources(input.server);
    return { data: resources };
  },

  toAutoClassifierInput: (input: ListMcpResourcesInput) => ({
    toolName: 'list_mcp_resources',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 50_000
});
