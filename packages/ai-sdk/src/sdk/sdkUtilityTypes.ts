/**
 * sdkUtilityTypes.ts — SDK实用类型
 *
 * 无法用Zod schema表达的纯手写类型。
 */

/** 非空使用量统计 — 保证所有数值字段非空（对齐Claude Code NonNullableUsage） */
export interface NonNullableUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens: number;
  readonly cache_read_input_tokens: number;
  readonly server_tool_use: {
    readonly web_search_requests: number;
    readonly web_fetch_requests: number;
  };
  readonly iterations: number;
}
