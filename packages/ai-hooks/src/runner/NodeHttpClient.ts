/** NodeHttpClient — HttpClient 的 Node.js fetch 实现 */

import type { HttpClient, HttpPostOptions, HttpResponse } from '../types/runner';

/**
 * NodeHttpClient — 使用 Node.js fetch API 实现 HttpClient
 *
 * 默认超时 10分钟，支持 AbortSignal 中断。
 */
export class NodeHttpClient implements HttpClient {
  async post(url: string, body: unknown, options: HttpPostOptions = {}): Promise<HttpResponse> {
    const { headers, signal, timeout } = options;

    // 超时 AbortController
    const timeoutController = timeout ? new AbortController() : undefined;
    const timeoutId = timeout ? setTimeout(() => timeoutController!.abort(), timeout) : undefined;

    // 级联外部 signal + timeout signal
    const combinedController = new AbortController();

    if (signal) {
      signal.addEventListener('abort', () => combinedController.abort(), { once: true });
      if (signal.aborted) combinedController.abort();
    }

    if (timeoutController) {
      timeoutController.signal.addEventListener('abort', () => combinedController.abort(), {
        once: true
      });
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body),
        signal: combinedController.signal
      });

      const responseBody = await response.text();

      // 尝试 JSON 解析
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }

      return {
        statusCode: response.status,
        body: parsedBody,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (err) {
      if (combinedController.signal.aborted) {
        return {
          statusCode: 0,
          body: null,
          error: timeoutController?.signal.aborted ? '请求超时' : '请求中断'
        };
      }

      return {
        statusCode: 0,
        body: null,
        error: err instanceof Error ? err.message : String(err)
      };
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }
}
