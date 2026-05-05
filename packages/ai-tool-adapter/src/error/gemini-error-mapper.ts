/** Gemini API 错误映射器 — 将 Google Gemini HTTP 错误转换为内部 Error */

import type { GeminiErrorResponse } from '../types/gemini';
import { createAbortError } from './error-mapper';

/** Gemini HTTP 状态码 → 中文错误消息 */
const GEMINI_STATUS_MESSAGES: Record<number, string> = {
  400: '请求参数无效',
  401: '认证失败：API 密钥无效',
  403: '权限不足',
  404: '模型或资源不存在',
  429: '请求频率限制',
  500: 'Gemini 服务内部错误',
  502: 'Gemini 服务网关错误',
  503: 'Gemini 服务不可用'
};

/**
 * 将 Gemini API HTTP 错误映射为内部 Error
 *
 * @param status HTTP 状态码
 * @param body 响应体字符串
 * @returns Error 对象
 */
export function mapGeminiError(status: number, body: string): Error {
  // 尝试解析 JSON 错误响应
  let parsed: GeminiErrorResponse | undefined;
  try {
    parsed = JSON.parse(body);
  } catch {
    // 非 JSON 响应
  }

  // 中断错误
  if (status === 0) {
    return createAbortError('Gemini 请求被中断');
  }

  // 从 parsed 中提取详细信息
  const errorInfo = parsed?.error;
  const statusMessage = GEMINI_STATUS_MESSAGES[status] ?? `Gemini API 错误 (${status})`;

  // 特殊错误类型处理
  if (errorInfo?.status === 'RESOURCE_EXHAUSTED') {
    return new Error(`Gemini 资源耗尽：${errorInfo.message}`);
  }

  if (
    errorInfo?.message?.includes('context length') ||
    errorInfo?.message?.includes('token limit')
  ) {
    return new Error(`上下文长度超出限制：${errorInfo.message}`);
  }

  // 组合错误消息
  if (errorInfo) {
    return new Error(`${statusMessage}：${errorInfo.message} (status: ${errorInfo.status})`);
  }

  return new Error(statusMessage);
}
