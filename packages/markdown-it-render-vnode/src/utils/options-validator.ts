/**
 * 选项验证工具模块
 *
 * @module utils/options-validator
 */

import { PERFORMANCE_CONFIG } from '../constants';
import type { FrameworkPluginOptions } from '../types';

/** 验证结果 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误消息 */
  errors: string[];
  /** 规范化后的选项 */
  normalized: FrameworkPluginOptions;
}

/**
 * 验证性能配置
 *
 * @param performance - 性能配置
 * @param errors - 错误数组
 * @returns 规范化后的性能配置
 */
function validatePerformanceConfig(
  performance: FrameworkPluginOptions['performance'],
  errors: string[]
): FrameworkPluginOptions['performance'] {
  if (!performance) {
    return undefined;
  }

  const normalized: FrameworkPluginOptions['performance'] = { ...performance };

  // 验证 cacheSize
  if (performance.cacheSize !== undefined) {
    if (typeof performance.cacheSize !== 'number' || performance.cacheSize < 0) {
      errors.push('performance.cacheSize must be a non-negative number');
    } else {
      // 限制最大值为 10000
      normalized.cacheSize = Math.max(0, Math.min(performance.cacheSize, 10000));
    }
  }

  // 验证 enableCache
  if (performance.enableCache !== undefined && typeof performance.enableCache !== 'boolean') {
    errors.push('performance.enableCache must be a boolean');
  }

  return normalized;
}

/**
 * 验证组件配置
 *
 * @param components - 组件配置
 * @param errors - 错误数组
 */
function validateComponentsConfig(
  components: FrameworkPluginOptions['components'],
  errors: string[]
): void {
  if (!components) {
    return;
  }

  if (typeof components !== 'object') {
    errors.push('components must be an object');
    return;
  }

  // 验证 codeBlock
  if (components.codeBlock !== undefined && typeof components.codeBlock !== 'function') {
    errors.push('components.codeBlock must be a function');
  }

  // 验证 table
  if (components.table !== undefined && typeof components.table !== 'function') {
    errors.push('components.table must be a function');
  }

  // 验证 link
  if (components.link !== undefined && typeof components.link !== 'function') {
    errors.push('components.link must be a function');
  }

  // 验证 image
  if (components.image !== undefined && typeof components.image !== 'function') {
    errors.push('components.image must be a function');
  }
}

/**
 * 验证错误处理配置
 *
 * @param errorHandler - 错误处理配置
 * @param errors - 错误数组
 */
function validateErrorHandlerConfig(
  errorHandler: FrameworkPluginOptions['errorHandler'],
  errors: string[]
): void {
  if (!errorHandler) {
    return;
  }

  if (typeof errorHandler !== 'object') {
    errors.push('errorHandler must be an object');
    return;
  }

  // 验证 mode
  if (errorHandler.mode !== undefined) {
    const validModes = ['silent', 'warn', 'strict'];
    if (!validModes.includes(errorHandler.mode)) {
      errors.push(`errorHandler.mode must be one of: ${validModes.join(', ')}`);
    }
  }

  // 验证 errorPrefix
  if (errorHandler.errorPrefix !== undefined && typeof errorHandler.errorPrefix !== 'string') {
    errors.push('errorHandler.errorPrefix must be a string');
  }
}

/**
 * 验证并规范化插件选项
 *
 * @param options - 原始选项
 * @returns 验证结果
 */
export function validateOptions(options: FrameworkPluginOptions): ValidationResult {
  const errors: string[] = [];
  const normalized: FrameworkPluginOptions = {
    ...options
  };

  // 验证适配器（必需）
  if (!options.adapter) {
    errors.push('adapter is required');
  } else if (typeof options.adapter !== 'object') {
    errors.push('adapter must be an object');
  } else {
    // 验证适配器接口
    const adapter = options.adapter;
    if (typeof adapter.createElement !== 'function') {
      errors.push('adapter.createElement must be a function');
    }
    if (typeof adapter.createText !== 'function') {
      errors.push('adapter.createText must be a function');
    }
    if (typeof adapter.createFragment !== 'function') {
      errors.push('adapter.createFragment must be a function');
    }
    if (typeof adapter.createComment !== 'function') {
      errors.push('adapter.createComment must be a function');
    }
  }

  // 验证性能配置
  normalized.performance = validatePerformanceConfig(options.performance, errors);

  // 验证组件配置
  validateComponentsConfig(options.components, errors);

  // 验证错误处理配置
  validateErrorHandlerConfig(options.errorHandler, errors);

  // 验证自定义规则
  if (options.customRules !== undefined) {
    if (typeof options.customRules !== 'object' || options.customRules === null) {
      errors.push('customRules must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized
  };
}

/**
 * 合并默认选项
 *
 * @param options - 用户选项
 * @returns 合并后的选项
 */
export function mergeDefaultOptions(options: FrameworkPluginOptions): FrameworkPluginOptions {
  return {
    ...options,
    performance: {
      enableCache: PERFORMANCE_CONFIG.ENABLE_VNODE_CACHE,
      cacheSize: PERFORMANCE_CONFIG.CACHE_MAX_SIZE,
      ...options.performance
    }
  };
}

