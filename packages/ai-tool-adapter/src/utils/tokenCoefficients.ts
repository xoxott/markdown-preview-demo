/** Token 估算系数常量 — ai-tool-adapter 内部使用的独立副本 */

/** Token 估算 block 类型系数常量 */
export const TOKEN_ESTIMATE_COEFFICIENTS = {
  /** 普通文本 chars/token 比率 */
  textRatio: 4,
  /** JSON 内容 chars/token 比率（更密集） */
  jsonRatio: 2,
  /** 保守系数 padding（乘数） */
  conservativePadding: 4 / 3,
  /** tool_use block 固定开销 tokens */
  toolUseOverhead: 50,
  /** image block 估算 tokens */
  imageTokenEstimate: 2000
} as const;

/** 检测内容是否像 JSON（更密集的 token 化） */
export function looksLikeJson(text: string): boolean {
  return (
    text.startsWith('{') || text.startsWith('[') || text.includes('"":') || text.includes('":{')
  );
}
