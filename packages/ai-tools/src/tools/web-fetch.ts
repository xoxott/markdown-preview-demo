/** WebFetchTool — URL抓取+Markdown转换工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { WebFetchInput } from '../types/tool-inputs';
import type { WebFetchOutput } from '../types/tool-outputs';
import { WebFetchInputSchema } from '../types/tool-inputs';
import { DefaultHttpProvider } from '../types/http-provider';

/**
 * WebFetchTool — URL抓取工具
 *
 * - isReadOnly: true — 只读网络操作
 * - isConcurrencySafe: false — 网络请求可能有副作用（但tool本身只读）
 * - safetyLabel: 'network' — 网络访问需要权限确认
 * - 依赖HttpProvider（宿主注入） — 无直接fetch依赖
 */
export const webFetchTool = buildTool<WebFetchInput, WebFetchOutput>({
  name: 'web-fetch',

  inputSchema: WebFetchInputSchema,

  description: async input => `Fetch content from ${input.url}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'network' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: WebFetchInput): ValidationResult => {
    try {
      new URL(input.url);
      return { behavior: 'allow' };
    } catch {
      return {
        behavior: 'deny',
        message: 'Invalid URL format',
        reason: 'invalid_url'
      };
    }
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: WebFetchInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<WebFetchOutput>> => {
    const httpProvider = context.httpProvider ?? new DefaultHttpProvider();

    const response = await httpProvider.fetch(input.url, {
      headers: { Accept: 'text/html,application/json,text/plain,*/*' },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      return {
        data: {
          content: `HTTP ${response.status}: ${response.statusText}`,
          mimeType: 'text/plain',
          statusCode: response.status,
          bytes: 0,
          url: response.url || input.url
        }
      };
    }

    const contentType = response.headers.get('content-type') ?? 'text/plain';
    const body = await response.text();
    const bytes = body.length;

    // 处理内容
    let content: string;
    if (input.raw) {
      content = body;
    } else if (contentType.includes('html')) {
      content = httpProvider.htmlToMarkdown(body, response.url || input.url);
    } else {
      content = body;
    }

    // 如果有prompt，提取特定信息
    if (input.prompt && !input.raw) {
      // 简化提取：只截断到合理大小
      const maxLen = 100_000;
      if (content.length > maxLen) {
        content = `${content.slice(0, maxLen)}\n\n...(content truncated)`;
      }
    }

    return {
      data: {
        content,
        mimeType: contentType.split(';')[0].trim(),
        statusCode: response.status,
        bytes,
        url: response.url || input.url
      }
    };
  },

  toAutoClassifierInput: (input: WebFetchInput) => ({
    toolName: 'web_fetch',
    input,
    safetyLabel: 'network',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
