/**
 * ID 生成工具函数
 */

/**
 * 生成唯一ID
 *
 * @param prefix - ID前缀
 * @returns 唯一ID字符串
 */
export function generateId(prefix: string = 'upload'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const counter = (generateId.counter = (generateId.counter || 0) + 1);
  return `${prefix}_${timestamp}_${random}_${counter}`;
}
generateId.counter = 0;

/**
 * 生成 UUID v4
 *
 * @returns UUID 字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

