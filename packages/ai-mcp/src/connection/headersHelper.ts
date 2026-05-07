/**
 * HeadersHelper — MCP SSE/HTTP 服务器的动态认证头部生成
 *
 * N37: 对齐 CC headersHelper.ts 执行配置中指定的脚本生成动态认证头部（如临时token）。
 */

export interface HeadersHelperConfig {
  readonly enabled: boolean;
  readonly scriptPath?: string;
  readonly scriptTimeoutMs: number;
}

export const DEFAULT_HEADERS_HELPER_CONFIG: HeadersHelperConfig = {
  enabled: false,
  scriptTimeoutMs: 5000
};

/** HeadersHelperFn — 宿主注入的脚本执行函数 */
export type HeadersHelperFn = (
  scriptPath: string,
  timeoutMs: number
) => Promise<Record<string, string>>;

/** executeHeadersHelper — 执行头部生成脚本 */
export async function executeHeadersHelper(
  config: HeadersHelperConfig,
  executeFn: HeadersHelperFn
): Promise<Record<string, string>> {
  if (!config.enabled || !config.scriptPath) return {};

  try {
    return await executeFn(config.scriptPath, config.scriptTimeoutMs);
  } catch {
    return {};
  }
}
