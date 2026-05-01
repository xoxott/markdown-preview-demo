/** 大输出截断工具 — 限制工具输出大小 */

/** 截断结果 */
export interface TruncateResult {
  /** 截断后的内容 */
  readonly content: string;
  /** 是否发生了截断 */
  readonly truncated: boolean;
  /** 原始内容长度 */
  readonly originalSize: number;
}

/**
 * 截断过长输出 — 超过 maxSize 时截断并附加提示
 *
 * 用于 FileReadTool（大文件）和 BashTool（长 stdout/stderr）。 截断时在末尾附加提示信息，告知用户输出被截断。
 *
 * @param output 原始输出字符串
 * @param maxSize 最大字符数限制
 * @returns 截断结果
 */
export function truncateOutput(output: string, maxSize: number): TruncateResult {
  const originalSize = output.length;

  if (originalSize <= maxSize) {
    return { content: output, truncated: false, originalSize };
  }

  const truncationNotice = `\n\n[Output truncated: ${originalSize} chars total, showing ${maxSize} chars]`;
  const availableSize = maxSize - truncationNotice.length;
  const truncatedContent = output.substring(0, Math.max(0, availableSize)) + truncationNotice;

  return {
    content: truncatedContent,
    truncated: true,
    originalSize
  };
}
