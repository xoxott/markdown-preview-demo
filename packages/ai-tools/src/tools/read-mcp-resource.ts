/** ReadMcpResourceTool — 读取MCP服务器资源 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ReadMcpResourceInput } from '../types/tool-inputs';
import type { ReadMcpResourceOutput } from '../types/tool-outputs';
import { ReadMcpResourceInputSchema } from '../types/tool-inputs';

export const readMcpResourceTool = buildTool<ReadMcpResourceInput, ReadMcpResourceOutput>({
  name: 'read-mcp-resource',

  inputSchema: ReadMcpResourceInputSchema,

  description: async input => `Read resource "${input.uri}" from MCP server "${input.server}"`,

  isReadOnly: () => true,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'network' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: ReadMcpResourceInput): ValidationResult => {
    if (input.server.trim().length === 0) {
      return { behavior: 'deny', message: 'Server name cannot be empty', reason: 'invalid_server' };
    }
    if (input.uri.trim().length === 0) {
      return { behavior: 'deny', message: 'Resource URI cannot be empty', reason: 'invalid_uri' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => ({ behavior: 'allow' }),

  call: async (
    input: ReadMcpResourceInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<ReadMcpResourceOutput>> => {
    const provider = context.mcpResourceProvider;
    if (!provider) {
      return { data: { contents: [] } };
    }
    const content = await provider.readResource(input.server, input.uri);
    return { data: content };
  },

  toAutoClassifierInput: (input: ReadMcpResourceInput) => ({
    toolName: 'read_mcp_resource',
    input,
    safetyLabel: 'network',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});