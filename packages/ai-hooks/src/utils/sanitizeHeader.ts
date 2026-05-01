/** Header 值清洗 — 防止 CRLF header injection */

/**
 * sanitizeHeaderValue — 剥离 CR/LF/NUL 字符
 *
 * CRLF header injection 是一种攻击手法：在 HTTP header 值中注入 \r\n 来伪造额外的 header 或 HTTP 响应分割。
 *
 * 此函数剥离以下字符：
 *
 * - \r (CR) — 回车
 * - \n (LF) — 换行
 * - \0 (NUL) — 空字符
 */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/\r/g, '').replace(/\n/g, '').replace(/\0/g, '');
}
