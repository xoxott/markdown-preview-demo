/**
 * 带超时的 fetch 包装器
 */

/**
 * 带超时的 fetch 请求
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 60000, ...fetchOptions } = options;

  // 如果已经有 signal，使用现有的
  let signal = fetchOptions.signal;
  let timeoutId: NodeJS.Timeout | null = null;
  let abortController: AbortController | null = null;

  // 如果没有 signal，创建一个新的
  if (!signal) {
    abortController = new AbortController();
    signal = abortController.signal;
    fetchOptions.signal = signal;
  }

  // 设置超时
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort();
      } else if (signal && 'abort' in signal) {
        // 如果 signal 是 AbortSignal，尝试通过 controller 中止
        // 注意：AbortSignal 没有公开的 controller 属性，但某些实现可能有
        // 这里仅作为后备方案
        try {
          const controller = (signal as AbortSignal & { controller?: AbortController }).controller;
          if (controller) {
            controller.abort();
          }
        } catch {
          // 忽略错误，继续抛出超时错误
        }
      }
    }, timeout);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return response;
  } catch (error: unknown) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 如果是超时导致的中止，抛出超时错误
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError' && timeoutId) {
      const timeoutError = new Error(`请求超时 (${timeout}ms)`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }

    throw error;
  }
}

/**
 * 构建请求体（统一处理 FormData 和 JSON）
 */
export function buildRequestBody(
  data: FormData | Record<string, unknown>
): { body: string | FormData; headers: Record<string, string> } {
  const isFormData = data instanceof FormData;

  return {
    body: isFormData ? data : JSON.stringify(data),
    headers: isFormData ? {} : { 'Content-Type': 'application/json' }
  };
}

