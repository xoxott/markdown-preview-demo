/** Zod v4 → JSON Schema 转换（基于 z.toJSONSchema 内置方法） */

import { toJSONSchema } from 'zod';
import type { z } from 'zod';

/**
 * 将 Zod schema 转换为 JSON Schema
 *
 * 使用 Zod v4 内置的 toJSONSchema 方法，无需第三方库。 清理 Anthropic 不接受的元字段（如 $schema）。
 *
 * @param schema Zod v4 schema 对象
 * @returns 清理后的 JSON Schema（Record<string, unknown>）
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const result = toJSONSchema(schema);
  // 清理 Anthropic 不接受的元字段
  // Anthropic 要求 input_schema 不包含 $schema 声明
  const cleaned = { ...result };
  delete cleaned.$schema;
  return cleaned;
}
