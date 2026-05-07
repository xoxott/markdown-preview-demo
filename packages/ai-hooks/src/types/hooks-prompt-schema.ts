/**
 * Hooks prompt 协议 Zod Schema
 *
 * N40: 对齐 CC types/hooks.ts 的 Zod schema 定义 PromptRequest/Response 的验证 schema。
 */

import { z } from 'zod/v4';

/** PromptRequest Schema */
export const PromptRequestSchema = z.strictObject({
  hookEvent: z.string().min(1),
  prompt: z.string().min(1),
  requestId: z.string().optional()
});

export type PromptRequest = z.infer<typeof PromptRequestSchema>;

/** PromptResponse Schema */
export const PromptResponseSchema = z.strictObject({
  response: z.string(),
  cancelled: z.boolean().default(false),
  requestId: z.string().optional()
});

export type PromptResponse = z.infer<typeof PromptResponseSchema>;

/** SyncHookResponse Schema */
export const SyncHookResponseSchema = z.union([
  z.string(),
  z.strictObject({
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    exitCode: z.number().default(0)
  })
]);

export type SyncHookResponse = z.infer<typeof SyncHookResponseSchema>;
