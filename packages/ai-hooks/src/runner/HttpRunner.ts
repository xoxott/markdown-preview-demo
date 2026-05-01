/** HttpRunner — type='http' 的 HTTP POST 请求 Runner */

import type { EnvProvider, HookRunner, HttpClient, HttpResponse, SsrfGuard } from '../types/runner';
import type { HookDefinition, HookExecutionContext, HookResult } from '../types/hooks';
import type { HookInput } from '../types/input';
import { DEFAULT_HTTP_TIMEOUT } from '../constants';
import { isPrivateIp } from '../utils/ssrfGuard';
import { sanitizeHeaderValue } from '../utils/sanitizeHeader';

/**
 * HttpRunner — HTTP POST 请求 Runner
 *
 * 安全防护层：
 *
 * 1. SSRF 检查 — 私有 IP 阻断
 * 2. Env 变量白名单插值 — 防止环境变量泄露
 * 3. Header 清洗 — 防止 CRLF header injection
 *
 * 执行流程：
 *
 * 1. SSRF 检查: url hostname → 私有 IP 则 blocking
 * 2. Env 变量插值: headers 中 ${env:VAR_NAME} 仅替换白名单变量
 * 3. Header 清洗: sanitizeHeaderValue 剥离 CR/LF/NUL
 * 4. HttpClient.post() 发送请求
 * 5. 结果映射: HTTP 200 + body.ok → success/blocking, 其他 → non_blocking_error
 */
export class HttpRunner implements HookRunner {
  readonly runnerType = 'http' as const;
  private readonly httpClient: HttpClient;
  private readonly ssrfGuard?: SsrfGuard;
  private readonly envProvider?: EnvProvider;

  constructor(httpClient: HttpClient, ssrfGuard?: SsrfGuard, envProvider?: EnvProvider) {
    this.httpClient = httpClient;
    this.ssrfGuard = ssrfGuard;
    this.envProvider = envProvider;
  }

  async run(
    hook: HookDefinition,
    input: HookInput,
    context: HookExecutionContext
  ): Promise<HookResult> {
    const url = hook.url!;
    const timeout = hook.timeout ?? DEFAULT_HTTP_TIMEOUT;

    // Step 1: SSRF 检查
    const hostname = this.extractHostname(url);
    if (hostname && (this.ssrfGuard?.isPrivateIp(hostname) ?? isPrivateIp(hostname))) {
      return {
        outcome: 'blocking',
        stopReason: `SSRF 防护阻断: ${hostname} 是私有 IP 地址`,
        preventContinuation: true
      };
    }

    // Step 2: Env 变量插值 + Step 3: Header 清洗
    const sanitizedHeaders = this.processHeaders(hook.headers ?? {}, hook.allowedEnvVars ?? []);

    // Step 4: HTTP POST
    const response = await this.httpClient.post(url, input, {
      headers: sanitizedHeaders,
      signal: context.abortSignal,
      timeout
    });

    // Step 5: 结果映射
    return this.mapResponseToResult(response);
  }

  /** 提取 URL hostname */
  private extractHostname(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return undefined;
    }
  }

  /** Env 变量插值 + Header 清洗 */
  private processHeaders(
    headers: Record<string, string>,
    allowedEnvVars: readonly string[]
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      // Env 变量插值: ${env:VAR_NAME}
      const interpolated = this.interpolateEnvVars(value, allowedEnvVars);
      // Header 清洗: 剥离 CR/LF/NUL
      result[key] = sanitizeHeaderValue(interpolated);
    }

    return result;
  }

  /** ${env:VAR_NAME} 插值 — 仅白名单变量被替换 */
  private interpolateEnvVars(value: string, allowedEnvVars: readonly string[]): string {
    return value.replace(/\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, varName) => {
      if (allowedEnvVars.length === 0 || !allowedEnvVars.includes(varName)) {
        // 不在白名单 → 替换为空字符串（防止泄露）
        return '';
      }

      // 在白名单 → 从 EnvProvider 获取值
      const envValue = this.envProvider?.getEnv(varName);
      return envValue ?? '';
    });
  }

  /** HTTP 响应映射到 HookResult */
  private mapResponseToResult(response: HttpResponse): HookResult {
    // HTTP 错误 → non_blocking_error
    if (response.error && response.statusCode === 0) {
      return {
        outcome: 'non_blocking_error',
        error: response.error,
        preventContinuation: false
      };
    }

    // HTTP 200 + body.ok=true → success
    const body = response.body as Record<string, unknown> | undefined;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body && typeof body.ok === 'boolean') {
        if (body.ok) {
          return {
            outcome: 'success',
            additionalContext: (body.reason as string | undefined) ?? undefined
          };
        }
        // body.ok=false → blocking
        return {
          outcome: 'blocking',
          stopReason: (body.reason as string) || `HTTP hook 决策为 ok=false`,
          preventContinuation: true
        };
      }

      // 无 ok 字段 → success（默认允许）
      return { outcome: 'success' };
    }

    // HTTP 非 2xx → non_blocking_error
    return {
      outcome: 'non_blocking_error',
      error: `HTTP ${response.statusCode}: ${response.error ?? 'unknown error'}`,
      preventContinuation: false
    };
  }
}
