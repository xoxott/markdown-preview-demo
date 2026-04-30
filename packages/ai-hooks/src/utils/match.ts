/** Hook matcher 匹配工具 — glob 模式匹配 */

/**
 * 判断 matchQuery 是否匹配 matcher 模式
 *
 * 支持三种模式:
 * 1. 精确匹配: matcher = "Bash" → matchQuery "Bash" 匹配
 * 2. 通配符: matcher = "Bash*" → matchQuery "BashTool" 匹配
 * 3. 无 matcher（undefined）: 匹配所有
 */
export function matchesPattern(matchQuery: string, matcher: string | undefined): boolean {
  // 无 matcher → 匹配所有
  if (matcher === undefined) {
    return true;
  }

  // 精确匹配
  if (matcher === matchQuery) {
    return true;
  }

  // 通配符匹配: 将 glob * 转为正则
  if (matcher.includes('*')) {
    const regexStr = matcher
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // 转义特殊字符
      .replace(/\*/g, '.*');                    // * → .*
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(matchQuery);
  }

  return false;
}