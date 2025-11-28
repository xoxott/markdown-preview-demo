/**
 * 文件验证工具函数
 */
import { formatFileSize, parseSize } from './format';

/** 验证文件类型 */
export function validateFileType(file: File, acceptedTypes: string[]): boolean {
  if (acceptedTypes.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return acceptedTypes.some(accept => {
    const normalizedAccept = accept.toLowerCase().trim();

    // 扩展名匹配
    if (normalizedAccept.startsWith('.')) {
      return fileName.endsWith(normalizedAccept);
    }

    // MIME 类型匹配
    if (normalizedAccept.includes('/')) {
      // 通配符匹配，如 image/*
      if (normalizedAccept.endsWith('/*')) {
        const category = normalizedAccept.split('/')[0];
        return fileType.startsWith(`${category}/`);
      }
      return fileType === normalizedAccept;
    }

    // 直接扩展名匹配（无点）
    return fileName.endsWith(`.${normalizedAccept}`);
  });
}

/** 验证文件大小 */
export function validateFileSize(
  file: File,
  minSize?: number | string,
  maxSize?: number | string
): { valid: boolean; error?: string } {
  const fileSize = file.size;

  if (minSize !== undefined) {
    const min = typeof minSize === 'string' ? parseSize(minSize) : minSize;
    if (fileSize < min) {
      return {
        valid: false,
        error: `文件大小不能小于 ${formatFileSize(min)}`
      };
    }
  }

  if (maxSize !== undefined) {
    const max = typeof maxSize === 'string' ? parseSize(maxSize) : maxSize;
    if (fileSize > max) {
      return {
        valid: false,
        error: `文件大小不能超过 ${formatFileSize(max)}`
      };
    }
  }

  return { valid: true };
}

