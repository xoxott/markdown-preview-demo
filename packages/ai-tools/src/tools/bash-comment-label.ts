/**
 * Bash 注释标签提取器
 *
 * 对齐 CC tools/BashTool/commentLabel.ts，如果 bash 命令首行是 `# 注释`（非 `#!` shebang）， 提取去除前缀的注释文本作为 UI
 * 上的简洁标签。
 */

/**
 * 提取 bash 命令首行的注释作为标签（非 verbose 模式下展示）
 *
 * @example
 *   extractBashCommentLabel('# Update dependencies\nnpm install');
 *   // => 'Update dependencies'
 *
 *   extractBashCommentLabel('#!/bin/bash\necho hi');
 *   // => undefined
 *
 * @param command bash 命令文本
 * @returns 注释文本（已去除 `#` 前缀），如果首行非注释或为 shebang 返回 undefined
 */
export function extractBashCommentLabel(command: string): string | undefined {
  const nl = command.indexOf('\n');
  const firstLine = (nl === -1 ? command : command.slice(0, nl)).trim();
  if (!firstLine.startsWith('#') || firstLine.startsWith('#!')) {
    return undefined;
  }
  return firstLine.replace(/^#+\s*/, '') || undefined;
}
