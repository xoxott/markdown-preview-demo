/** 路径/内容规范化工具 — 弯引号替换 + LF 行尾强制 */

/**
 * 规范化 Unicode 弯引号为 ASCII 直引号
 *
 * Claude Code 源码中 FileEditTool 的 curly quote normalization： 用户从网页/文档复制粘贴时，可能带入 Unicode 弯引号， 导致
 * oldString 无法匹配文件中的 ASCII 直引号。
 *
 * 替换映射： \u2018 (') → ' \u2019 (') → ' \u201C (") → " \u201D (") → "
 */
export function normalizeCurlyQuotes(s: string): string {
  return s
    .replace(/\u2018/g, "'") // left single quote
    .replace(/\u2019/g, "'") // right single quote
    .replace(/\u201C/g, '"') // left double quote
    .replace(/\u201D/g, '"'); // right double quote
}

/**
 * 强制 LF 行尾 — 将 CRLF (\r\n) 替换为 LF (\n)
 *
 * Claude Code 源码中 FileWriteTool 的 LF enforcement： 写入文件时统一使用 LF 行尾，避免 CRLF/LF 混合导致编辑匹配失败。
 */
export function enforceLfLineEndings(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

/**
 * 组合规范化管道 — 先弯引号，再 LF 行尾
 *
 * 用于 validateInput 的 updatedInput 返回值， FileWriteTool 和 FileEditTool 的内容规范化。
 */
export function normalizeContent(s: string): string {
  return enforceLfLineEndings(normalizeCurlyQuotes(s));
}
