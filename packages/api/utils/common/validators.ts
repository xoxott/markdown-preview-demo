/**
 * 配置验证工具函数
 * 提供类型安全的配置验证，提前发现配置错误
 */

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`配置验证失败: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

/**
 * 验证请求选项配置
 */
export function validateRequestOptions(options?: {
  baseURL?: string;
  timeout?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (options === undefined || options === null) {
    return { valid: true, errors: [] };
  }

  if (options.baseURL !== undefined) {
    if (typeof options.baseURL !== 'string') {
      errors.push('baseURL 必须是字符串类型');
    } else if (options.baseURL.trim() === '') {
      errors.push('baseURL 不能为空字符串');
    }
  }

  if (options.timeout !== undefined) {
    if (typeof options.timeout !== 'number') {
      errors.push('timeout 必须是数字类型');
    } else if (options.timeout < 0) {
      errors.push('timeout 必须大于或等于 0');
    } else if (!Number.isFinite(options.timeout)) {
      errors.push('timeout 必须是有效数字');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证并抛出错误（如果验证失败）
 */
export function assertRequestOptions(options?: { baseURL?: string; timeout?: number }): void {
  const result = validateRequestOptions(options);
  if (!result.valid) {
    throw new ValidationError(result.errors);
  }
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    // 相对路径也是有效的
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }
    // 绝对 URL
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证 HTTP 方法
 */
export function isValidHttpMethod(
  method: string,
): method is 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' {
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
  return validMethods.includes(method.toUpperCase() as (typeof validMethods)[number]);
}
