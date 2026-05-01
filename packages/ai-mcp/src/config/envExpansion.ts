/**
 * MCP 环境变量扩展
 *
 * 在 MCP 服务器配置字符串中展开环境变量 支持 ${VAR} 和 ${VAR:-default} 语法
 *
 * 基于 Claude Code services/mcp/envExpansion.ts 提取
 */

/**
 * 在字符串中展开环境变量
 *
 * 处理 ${VAR} 和 ${VAR:-default} 语法：
 *
 * - ${VAR} → 替换为 process.env[VAR]，未定义则保留原样
 * - ${VAR:-default} → 替换为 process.env[VAR]，未定义则使用 default
 *
 * @param value 包含环境变量引用的字符串
 * @param env 环境变量对象（默认为 process.env）
 * @returns expanded: 展开后的字符串, missingVars: 缺失的环境变量列表
 */
export function expandEnvVarsInString(
  value: string,
  env: Record<string, string | undefined> = process.env
): {
  expanded: string;
  missingVars: string[];
} {
  const missingVars: string[] = [];

  const expanded = value.replace(/\$\{([^}]+)\}/g, (match, varContent) => {
    // 以 :- 分割支持默认值（限制为2部分以保留默认值中的 :-）
    const [varName, defaultValue] = varContent.split(':-', 2);
    const envValue = env[varName];

    if (envValue !== undefined) {
      return envValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // 记录缺失变量用于错误报告
    missingVars.push(varName);
    // 未找到则保留原样（允许调试但会报告为错误）
    return match;
  });

  return {
    expanded,
    missingVars
  };
}
