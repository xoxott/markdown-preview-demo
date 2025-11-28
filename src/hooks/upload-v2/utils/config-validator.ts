/**
 * 配置验证工具
 */
import type { UploadConfig } from '../types';
import { CONSTANTS } from '../constants';
import { logger } from './logger';

/** 配置验证结果 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * 验证上传配置
 */
export function validateConfig(config: Partial<UploadConfig>): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // 必需配置检查
  if (!config.uploadChunkUrl) {
    errors.push('uploadChunkUrl 是必需的配置项');
  } else if (!isValidUrl(config.uploadChunkUrl)) {
    errors.push('uploadChunkUrl 必须是有效的 URL');
  }

  if (!config.mergeChunksUrl) {
    errors.push('mergeChunksUrl 是必需的配置项');
  } else if (!isValidUrl(config.mergeChunksUrl)) {
    errors.push('mergeChunksUrl 必须是有效的 URL');
  }

  // 并发配置验证
  if (config.maxConcurrentFiles !== undefined) {
    if (config.maxConcurrentFiles < 1) {
      errors.push('maxConcurrentFiles 必须大于 0');
    } else if (config.maxConcurrentFiles > 10) {
      warnings.push('maxConcurrentFiles 超过 10 可能导致性能问题，建议设置为 3-6');
    }
  }

  if (config.maxConcurrentChunks !== undefined) {
    if (config.maxConcurrentChunks < 1) {
      errors.push('maxConcurrentChunks 必须大于 0');
    } else if (config.maxConcurrentChunks > 20) {
      warnings.push('maxConcurrentChunks 超过 20 可能导致网络拥塞，建议设置为 4-12');
    }
  }

  // 分片大小验证
  if (config.chunkSize !== undefined) {
    if (config.chunkSize < CONSTANTS.UPLOAD.MIN_CHUNK_SIZE) {
      errors.push(`chunkSize 不能小于 ${CONSTANTS.UPLOAD.MIN_CHUNK_SIZE / 1024}KB`);
    } else if (config.chunkSize > CONSTANTS.UPLOAD.MAX_CHUNK_SIZE) {
      errors.push(`chunkSize 不能大于 ${CONSTANTS.UPLOAD.MAX_CHUNK_SIZE / 1024 / 1024}MB`);
    } else if (config.chunkSize < 512 * 1024) {
      warnings.push('chunkSize 小于 512KB 可能导致上传效率降低');
    }
  }

  // 超时配置验证
  if (config.timeout !== undefined) {
    if (config.timeout < 1000) {
      warnings.push('timeout 小于 1 秒可能导致频繁超时');
    } else if (config.timeout > 300000) {
      warnings.push('timeout 超过 5 分钟可能过长');
    }
  }

  // 重试配置验证
  if (config.maxRetries !== undefined) {
    if (config.maxRetries < 0) {
      errors.push('maxRetries 不能为负数');
    } else if (config.maxRetries > 10) {
      warnings.push('maxRetries 超过 10 可能导致长时间重试');
    }
  }

  // 文件大小限制验证
  if (config.maxFileSize !== undefined) {
    if (config.maxFileSize < 0) {
      errors.push('maxFileSize 不能为负数');
    } else if (config.maxFileSize > 10 * 1024 * 1024 * 1024) {
      warnings.push('maxFileSize 超过 10GB，请确保服务器支持大文件上传');
    }
  }

  // 文件数量限制验证
  if (config.maxFiles !== undefined) {
    if (config.maxFiles < 1) {
      errors.push('maxFiles 必须大于 0');
    } else if (config.maxFiles > 1000) {
      warnings.push('maxFiles 超过 1000 可能导致内存问题');
    }
  }

  // 网络自适应建议
  if (config.enableNetworkAdaptation === false) {
    suggestions.push('建议启用 enableNetworkAdaptation 以获得更好的上传体验');
  }

  // Worker 使用建议
  if (config.useWorker === false && config.enableDeduplication) {
    suggestions.push('启用 useWorker 可以提升大文件 MD5 计算性能');
  }

  // 断点续传建议
  if (config.enableResume === false) {
    suggestions.push('建议启用 enableResume 以支持断点续传');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * 验证 URL（支持完整 URL 和相对路径）
 */
function isValidUrl(url: string): boolean {
  // 空字符串不是有效 URL
  if (!url || url.trim() === '') {
    return false;
  }

  // 尝试作为完整 URL 验证
  try {
    new URL(url);
    return true;
  } catch {
    // 如果不是完整 URL，检查是否为有效的相对路径
    // 相对路径应该以 / 开头，或者以 ./ 或 ../ 开头
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }
    return false;
  }
}

/**
 * 验证并输出配置问题（开发环境）
 */
export function validateAndWarnConfig(config: Partial<UploadConfig>): void {
  const result = validateConfig(config);

  if (result.errors.length > 0) {
    logger.error('配置验证失败', { errors: result.errors });
    throw new Error(`配置验证失败: ${result.errors.join(', ')}`);
  }

  if (result.warnings.length > 0) {
    logger.warn('配置警告', { warnings: result.warnings });
  }

  if (result.suggestions.length > 0 && import.meta.env.DEV) {
    logger.info('配置建议', { suggestions: result.suggestions });
  }
}

