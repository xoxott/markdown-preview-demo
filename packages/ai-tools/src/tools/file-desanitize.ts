/**
 * fileDesanitize — 处理API sanitized字符串
 *
 * Anthropic API 会将某些内容替换为sanitized标记：
 *
 * - <fnr> → 函数/方法名引用标记
 * - [antml:](antml:) → Anthropic内部标记
 *
 * FileEdit 需要将这些标记还原，否则匹配会失败
 */

/** 已知 sanitized 标记及其还原规则 */
const SANITIZED_MARKERS: readonly (readonly [string, string])[] = [
  ['<fnr>', ''],
  ['</fnr>', ''],
  ['<antml:parameter>', ''],
  ['</antml:parameter>', '']
];

/**
 * desanitizeContent — 还原API sanitized标记
 *
 * 将 <fnr> 等标记从内容中移除，使匹配能正常工作
 */
export function desanitizeContent(content: string): string {
  let result = content;
  for (const [marker, replacement] of SANITIZED_MARKERS) {
    result = result.replaceAll(marker, replacement);
  }
  return result;
}

/** containsSanitizedMarkers — 检测内容是否含sanitized标记 */
export function containsSanitizedMarkers(content: string): boolean {
  for (const [marker] of SANITIZED_MARKERS) {
    if (content.includes(marker)) return true;
  }
  return false;
}
