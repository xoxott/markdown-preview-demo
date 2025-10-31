/* eslint-disable no-plusplus */
import SparkMD5 from 'spark-md5';

// ==================== 常量定义 ====================
const CONSTANTS = {
  CHUNK_SIZE: 2 * 1024 * 1024, // 2MB per chunk for MD5 calculation
  SIZE_UNITS: ['B', 'KB', 'MB', 'GB', 'TB', 'PB','EB', 'ZB', 'YB'] as const,
  SIZE_MULTIPLIER: 1024,
  TIME_UNITS: {
    MINUTE: 60,
    HOUR: 3600,
    DAY: 86400,
  },
  UNIT_MAP: {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5,
  } as const,
} as const;

// ==================== ID 生成 ====================
/**
 * 生成唯一ID
 * @param prefix - ID前缀
 * @returns 唯一ID字符串
 */
export function generateId(prefix: string = 'upload'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const counter = generateId.counter = (generateId.counter || 0) + 1;
  return `${prefix}_${timestamp}_${random}_${counter}`;
}
generateId.counter = 0;

/**
 * 生成 UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==================== 文件大小处理 ====================
/**
 * 字符串格式大小转字节数
 * @param size - 字符串格式大小（如 '2MB'）或数字
 * @returns 字节数
 * @example
 * parseSize('2MB') // 2097152
 * parseSize('1.5GB') // 1610612736
 * parseSize(1024) // 1024
 */
export function parseSize(size: string | number): number {
  if (typeof size === 'number') {
    return Math.max(0, size);
  }

  const trimmedSize = size.trim().toUpperCase();
  const match = trimmedSize.match(/^([\d.]+)\s*([A-Z]+)?$/);
  
  if (!match) {
    console.warn(`无效的大小格式: ${size}`);
    return 0;
  }

  const [, numStr, unit = 'B'] = match;
  const num = Number.parseFloat(numStr);

  if (Number.isNaN(num) || num < 0) {
    console.warn(`无效的数字: ${numStr}`);
    return 0;
  }

  const multiplier = CONSTANTS.UNIT_MAP[unit as keyof typeof CONSTANTS.UNIT_MAP];
  
  if (!multiplier) {
    console.warn(`未知的单位: ${unit}`);
    return num;
  }

  return Math.floor(num * multiplier);
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @param decimals - 小数位数，默认2
 * @returns 格式化后的字符串
 * @example
 * formatFileSize(1024) // '1 KB'
 * formatFileSize(1536, 1) // '1.5 KB'
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Invalid';
  if (!Number.isFinite(bytes)) return 'Invalid';

  const k = CONSTANTS.SIZE_MULTIPLIER;
  const dm = Math.max(0, decimals);

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    CONSTANTS.SIZE_UNITS.length - 1 // 防止数组越界
  );

  const safeIndex = Math.max(0, i);

  const size = bytes / Math.pow(k, safeIndex);
   if (!Number.isFinite(size)) {
    return `${bytes} B`;
  }
  
  return `${size.toFixed(dm)} ${CONSTANTS.SIZE_UNITS[i]}`;
}

/**
 * 批量格式化文件大小
 */
export function formatFileSizes(bytesArray: number[], decimals: number = 2): string[] {
  return bytesArray.map(bytes => formatFileSize(bytes, decimals));
}

// ==================== 速度格式化 ====================
/**
 * 格式化速度（增强版）
 * @param bytesPerSecond - 每秒字节数
 * @param decimals - 小数位数
 * @returns 格式化后的速度字符串
 */
export function formatSpeed(bytesPerSecond: number, decimals: number = 2): string {
  // 边界检查
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond < 0) {
    return '0 B/s';
  }
  
  if (bytesPerSecond === 0) return '0 B/s';
  
  try {
    const formatted = formatFileSize(bytesPerSecond, decimals);
    // 再次检查格式化结果
    if (formatted === 'Invalid') {
      return '0 B/s';
    }
    return `${formatted}/s`;
  } catch (error) {
    console.error('格式化速度失败:', error);
    return '0 B/s';
  }
}

/**
 * 计算平均速度
 */
export function calculateAverageSpeed(totalBytes: number, totalTimeMs: number): number {
  if (totalTimeMs <= 0) return 0;
  return (totalBytes / totalTimeMs) * 1000; // 转换为 bytes/second
}

// ==================== 时间格式化 ====================
/**
 * 格式化时间
 * @param seconds - 秒数
 * @param detailed - 是否显示详细信息
 * @returns 格式化后的时间字符串
 * @example
 * formatTime(65) // '1m 5s'
 * formatTime(3665) // '1h 1m 5s'
 * formatTime(90, true) // '1 分钟 30 秒'
 */
export function formatTime(seconds: number, detailed: boolean = false): string {
  if (seconds < 0) return 'Invalid';
  if (seconds === 0) return '0s';

  const hours = Math.floor(seconds / CONSTANTS.TIME_UNITS.HOUR);
  const minutes = Math.floor((seconds % CONSTANTS.TIME_UNITS.HOUR) / CONSTANTS.TIME_UNITS.MINUTE);
  const secs = Math.floor(seconds % CONSTANTS.TIME_UNITS.MINUTE);

  if (detailed) {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} 小时`);
    if (minutes > 0) parts.push(`${minutes} 分钟`);
    if (secs > 0) parts.push(`${secs} 秒`);
    return parts.join(' ') || '0 秒';
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * 格式化剩余时间（更友好的显示）
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return '计算中...';
  if (seconds === 0) return '即将完成';
  if (seconds < 1) return '不到 1 秒';
  if (seconds > CONSTANTS.TIME_UNITS.DAY) return '超过 1 天';
  
  return `剩余 ${formatTime(seconds)}`;
}

// ==================== 延迟工具 ====================
/**
 * 延迟执行
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
};

/**
 * 带取消功能的延迟
 */
export function cancellableDelay(ms: number): {
  promise: Promise<void>;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout;
  let rejectFn: (reason?: any) => void;

  const promise = new Promise<void>((resolve, reject) => {
    rejectFn = reject;
    timeoutId = setTimeout(resolve, ms);
  });

  const cancel = () => {
    clearTimeout(timeoutId);
    rejectFn(new Error('Delay cancelled'));
  };

  return { promise, cancel };
}

// ==================== 媒体文件处理 ====================
/**
 * 获取媒体文件的时长
 * @param file - 媒体文件
 * @returns 时长（秒）
 */
export function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio');
    const media = document.createElement(isAudio ? 'audio' : 'video') as HTMLMediaElement;
    
    media.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      media.remove();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('获取媒体时长超时'));
    }, 10000); // 10秒超时

    media.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(media.duration);
    };

    media.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error('无法读取媒体文件时长'));
    };

    media.src = url;
  });
}

/**
 * 获取视频的分辨率
 */
export function getVideoResolution(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    video.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = () => {
      cleanup();
      resolve({
        width: video.videoWidth,
        height: video.videoHeight
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('无法读取视频分辨率'));
    };

    video.src = url;
  });
}

// ==================== 浏览器检测 ====================
/**
 * 检测是否为 Safari 锁定模式
 * Safari 浏览器开启锁定模式无法获取到文件对象
 */
export function isSafariLockMode(): boolean {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const fileReaderMissing = typeof FileReader === 'undefined';
  return isSafari && fileReaderMissing;
}

/**
 * 检测浏览器类型
 */
export function detectBrowser(): {
  name: string;
  version: string;
  isMobile: boolean;
} {
  const ua = navigator.userAgent;
  
  let name = 'Unknown';
  let version = 'Unknown';
  
  if (ua.includes('Firefox/')) {
    name = 'Firefox';
    version = ua.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    name = 'Chrome';
    version = ua.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    name = 'Safari';
    version = ua.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Edg/')) {
    name = 'Edge';
    version = ua.match(/Edg\/([\d.]+)/)?.[1] || 'Unknown';
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return { name, version, isMobile };
}

// ==================== MD5 计算 ====================
/**
 * 计算文件 MD5（使用 SparkMD5，支持大文件分片计算）
 * @param file - 文件对象
 * @param onProgress - 进度回调
 * @returns MD5 字符串
 */
export async function calculateFileMD5(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();
    const chunkSize = CONSTANTS.CHUNK_SIZE;
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    const loadNext = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      
      fileReader.readAsArrayBuffer(file.slice(start, end));
    };

    fileReader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        spark.append(arrayBuffer);
        currentChunk++;

        // 更新进度
        if (onProgress) {
          const progress = Math.round((currentChunk / chunks) * 100);
          onProgress(progress);
        }

        if (currentChunk < chunks) {
          loadNext();
        } else {
          const md5 = spark.end();
          resolve(md5);
        }
      } catch (error) {
        reject(new Error(`MD5 计算失败: ${(error as Error).message}`));
      }
    };

    fileReader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    // 开始读取第一个分片
    loadNext();
  });
}

/**
 * 批量计算文件 MD5
 * @param files - 文件数组
 * @param onProgress - 总体进度回调
 * @returns MD5 数组
 */
export async function calculateFilesMD5(
  files: File[],
  onProgress?: (progress: number, currentFile: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const md5 = await calculateFileMD5(files[i], (fileProgress) => {
      if (onProgress) {
        const overallProgress = ((i + fileProgress / 100) / total) * 100;
        onProgress(overallProgress, i + 1, total);
      }
    });
    results.push(md5);
  }

  return results;
}

/**
 * 计算字符串的 MD5
 */
export function calculateStringMD5(str: string): string {
  return SparkMD5.hash(str);
}

/**
 * 计算文件 SHA-256（使用 Web Crypto API）
 */
export async function calculateFileSHA256(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const chunkSize = CONSTANTS.CHUNK_SIZE;
  const chunks = Math.ceil(file.size / chunkSize);
  const hashBuffer: Uint8Array[] = [];

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const arrayBuffer = await chunk.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', arrayBuffer);
    hashBuffer.push(new Uint8Array(hash));

    if (onProgress) {
      onProgress(Math.round(((i + 1) / chunks) * 100));
    }
  }

  // 合并所有哈希
  const totalLength = hashBuffer.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const arr of hashBuffer) {
    combined.set(arr, offset);
    offset += arr.length;
  }

  // 最终哈希
  const finalHash = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(finalHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ==================== 文件验证 ====================
/**
 * 验证文件类型
 */
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

/**
 * 验证文件大小
 */
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

// ==================== 文件信息提取 ====================
/**
 * 获取文件扩展名
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * 获取文件名（不含扩展名）
 */
export function getFileNameWithoutExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}

/**
 * 获取文件的完整信息
 */
export async function getFileInfo(file: File): Promise<{
  name: string;
  nameWithoutExt: string;
  extension: string;
  size: number;
  sizeFormatted: string;
  type: string;
  lastModified: number;
  lastModifiedDate: Date;
  md5?: string;
  duration?: number;
}> {
  const info = {
    name: file.name,
    nameWithoutExt: getFileNameWithoutExtension(file.name),
    extension: getFileExtension(file.name),
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    type: file.type,
    lastModified: file.lastModified,
    lastModifiedDate: new Date(file.lastModified),
  };

  return info;
}

// ==================== 节流防抖 ====================
/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// ==================== 导出所有工具 ====================
export const FileUtils = {
  // 大小处理
  parseSize,
  formatFileSize,
  formatFileSizes,
  formatSpeed,
  calculateAverageSpeed,
  
  // 时间处理
  formatTime,
  formatRemainingTime,
  delay,
  cancellableDelay,
  
  // ID 生成
  generateId,
  generateUUID,
  
  // 媒体处理
  getMediaDuration,
  getVideoResolution,
  
  // 浏览器检测
  isSafariLockMode,
  detectBrowser,
  
  // Hash 计算
  calculateFileMD5,
  calculateFilesMD5,
  calculateStringMD5,
  calculateFileSHA256,
  
  // 文件验证
  validateFileType,
  validateFileSize,
  
  // 文件信息
  getFileExtension,
  getFileNameWithoutExtension,
  getFileInfo,
  
  // 性能优化
  throttle,
  debounce,
};