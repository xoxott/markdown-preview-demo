/** WebSearchTool — 搜索查询工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { WebSearchInput } from '../types/tool-inputs';
import type { WebSearchOutput } from '../types/tool-outputs';
import { WebSearchInputSchema } from '../types/tool-inputs';

/**
 * WebSearchTool — 搜索查询工具
 *
 * - isReadOnly: true — 只读网络操作
 * - isConcurrencySafe: false — 网络请求可能有副作用
 * - safetyLabel: 'network' — 网络访问需要权限确认
 * - 依赖SearchProvider（宿主注入） — 无直接API依赖
 * - 强制包含Sources列表
 */
export const webSearchTool = buildTool<WebSearchInput, WebSearchOutput>({
  name: 'web-search',

  inputSchema: WebSearchInputSchema,

  description: async input => `Search the web for: "${input.query}"`,

  isReadOnly: () => true,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'network' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: WebSearchInput): ValidationResult => {
    if (input.query.trim().length < 2) {
      return {
        behavior: 'deny',
        message: 'Query must be at least 2 characters',
        reason: 'invalid_query'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: WebSearchInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<WebSearchOutput>> => {
    const searchProvider = context.searchProvider;

    if (!searchProvider || !searchProvider.isEnabled()) {
      return {
        data: {
          query: input.query,
          results: [],
          durationSeconds: 0
        }
      };
    }

    const result = await searchProvider.search(input.query, {
      allowedDomains: input.allowedDomains,
      blockedDomains: input.blockedDomains
    });

    return {
      data: {
        query: input.query,
        results: result.results,
        durationSeconds: result.durationSeconds
      }
    };
  },

  toAutoClassifierInput: (input: WebSearchInput) => ({
    toolName: 'web_search',
    input,
    safetyLabel: 'network',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 50_000
});
