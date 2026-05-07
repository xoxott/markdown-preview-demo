/**
 * BriefTool (SendUserMessage) — 用户友好消息发送工具
 *
 * 对齐 CC tools/BriefTool/BriefTool.ts，主要区别：
 *
 * 1. SendMessage 是 agent 间路由（teammate/coordinator）；Brief 是 user 面向，用户在 UI 中阅读。
 * 2. Brief 支持附件（图片/diff/日志），用户可以预览。
 * 3. 区分 normal/proactive 状态 — proactive 触发推送通知。
 *
 * 支持文件附件：path、size、isImage、可选 file_uuid（远程上传后的标识）
 */

import { z } from 'zod';
import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ToolUseContext } from '@suga/ai-tool-core';

export const BRIEF_TOOL_NAME = 'SendUserMessage';
export const LEGACY_BRIEF_TOOL_NAME = 'Brief';

export const BRIEF_TOOL_DESCRIPTION = 'Send a message to the user';

export const BRIEF_TOOL_PROMPT = `Send a message the user will read. Text outside this tool is visible in the detail view, but most won't open it — the answer lives here.

\`message\` supports markdown. \`attachments\` takes file paths (absolute or cwd-relative) for images, diffs, logs.

\`status\` labels intent: 'normal' when replying to what they just asked; 'proactive' when you're initiating — a scheduled task finished, a blocker surfaced during background work, you need input on something they haven't asked about. Set it honestly; downstream routing uses it.`;

// ============================================================
// Schema
// ============================================================

export const BriefAttachmentSchema = z.object({
  path: z.string(),
  size: z.number(),
  isImage: z.boolean(),
  fileUuid: z.string().optional()
});

export const BriefInputSchema = z.object({
  message: z.string().min(1).describe('The message for the user. Supports markdown formatting.'),
  attachments: z
    .array(z.string())
    .optional()
    .describe('Optional file paths (absolute or relative to cwd) to attach.'),
  status: z
    .enum(['normal', 'proactive'])
    .describe(
      "Use 'proactive' when surfacing something the user hasn't asked for and needs to see now. Use 'normal' when replying to something the user just said."
    )
});

export type BriefInput = z.infer<typeof BriefInputSchema>;
export type BriefAttachment = z.infer<typeof BriefAttachmentSchema>;

export interface BriefOutput {
  readonly message: string;
  readonly attachments?: readonly BriefAttachment[];
  readonly sentAt?: string;
  readonly status: 'normal' | 'proactive';
}

// ============================================================
// 附件解析器（由宿主提供）
// ============================================================

/** 附件解析 Provider */
export interface BriefAttachmentResolver {
  /**
   * 验证附件路径是否存在且可读
   *
   * @returns 错误信息，验证通过返回 null
   */
  validate(rawPaths: readonly string[]): Promise<string | null>;
  /** 解析附件 — 读取 size、识别 isImage、可选上传到远端获取 fileUuid */
  resolve(rawPaths: readonly string[]): Promise<readonly BriefAttachment[]>;
}

// ============================================================
// 工具
// ============================================================

interface BriefContext {
  readonly briefAttachmentResolver?: BriefAttachmentResolver;
  readonly briefSink?: (output: BriefOutput) => void | Promise<void>;
}

export const briefTool = buildTool({
  name: BRIEF_TOOL_NAME,
  description: async () => BRIEF_TOOL_DESCRIPTION,
  inputSchema: BriefInputSchema,
  isReadOnly: () => true,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'readonly',
  async call(input: BriefInput, context: ToolUseContext): Promise<ToolResult<BriefOutput>> {
    const briefCtx = context as ToolUseContext & BriefContext;

    let attachments: readonly BriefAttachment[] | undefined;
    if (input.attachments && input.attachments.length > 0) {
      const resolver = briefCtx.briefAttachmentResolver;
      if (resolver) {
        const validationError = await resolver.validate(input.attachments);
        if (validationError) {
          return {
            data: {
              message: input.message,
              status: input.status,
              sentAt: new Date().toISOString()
            },
            error: validationError
          };
        }
        attachments = await resolver.resolve(input.attachments);
      } else {
        attachments = input.attachments.map(path => ({
          path,
          size: 0,
          isImage: /\.(png|jpe?g|gif|webp|svg)$/i.test(path)
        }));
      }
    }

    const output: BriefOutput = {
      message: input.message,
      attachments,
      status: input.status,
      sentAt: new Date().toISOString()
    };

    if (briefCtx.briefSink) {
      await briefCtx.briefSink(output);
    }

    return { data: output };
  }
});
