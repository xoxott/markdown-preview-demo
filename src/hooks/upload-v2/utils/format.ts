/**
 * 格式化工具函数
 */

// ==================== 常量定义 ====================
const CONSTANTS = {
  SIZE_UNITS: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] as const,
  SIZE_MULTIPLIER: 1024,
  TIME_UNITS: {
    MINUTE: 60,
    HOUR: 3600,
    DAY: 86400
  },
  UNIT_MAP: {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5
  } as const
} as const;

// ==================== 文件大小处理 ====================
/**
 * 字符串格式大小转字节数
 *
 * @example
 *   parseSize('2MB'); // 2097152
 *   parseSize('1.5GB'); // 1610612736
 *   parseSize(1024); // 1024
 *
 * @param size - 字符串格式大小（如 '2MB'）或数字
 * @returns 字节数
 */
export function parseSize(size: string | number): number {
  if (typeof size === 'number') {
    return Math.max(0, size);
  }

  const trimmedSize = size.trim().toUpperCase();
  const match = trimmedSize.match(/^([\d.]+)\s*([A-Z]+)?$/);

  if (!match) {
    // 开发环境才输出警告
    if (import.meta.env.DEV) {
      console.warn(`无效的大小格式: ${size}`);
    }
    return 0;
  }

  const [, numStr, unit = 'B'] = match;
  const num = Number.parseFloat(numStr);

  if (Number.isNaN(num) || num < 0) {
    if (import.meta.env.DEV) {
      console.warn(`无效的数字: ${numStr}`);
    }
    return 0;
  }

  const multiplier = CONSTANTS.UNIT_MAP[unit as keyof typeof CONSTANTS.UNIT_MAP];

  if (!multiplier) {
    if (import.meta.env.DEV) {
      console.warn(`未知的单位: ${unit}`);
    }
    return num;
  }

  return Math.floor(num * multiplier);
}

/**
 * 格式化文件大小
 *
 * @example
 *   formatFileSize(1024); // '1 KB'
 *   formatFileSize(1536, 1); // '1.5 KB'
 *
 * @param bytes - 字节数
 * @param decimals - 小数位数，默认2
 * @returns 格式化后的字符串
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

  const size = bytes / k ** safeIndex;
  if (!Number.isFinite(size)) {
    return `${bytes} B`;
  }

  return `${size.toFixed(dm)} ${CONSTANTS.SIZE_UNITS[i]}`;
}

/** 批量格式化文件大小 */
export function formatFileSizes(bytesArray: number[], decimals: number = 2): string[] {
  return bytesArray.map(bytes => formatFileSize(bytes, decimals));
}

// ==================== 速度格式化 ====================
/**
 * 格式化速度（增强版）
 *
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
    if (import.meta.env.DEV) {
      console.error('格式化速度失败:', error);
    }
    return '0 B/s';
  }
}

/** 计算平均速度 */
export function calculateAverageSpeed(totalBytes: number, totalTimeMs: number): number {
  if (totalTimeMs <= 0) return 0;
  return (totalBytes / totalTimeMs) * 1000; // 转换为 bytes/second
}

// ==================== 时间格式化 ====================
/**
 * 格式化时间
 *
 * @example
 *   formatTime(65); // '1m 5s'
 *   formatTime(3665); // '1h 1m 5s'
 *   formatTime(90, true); // '1 分钟 30 秒'
 *
 * @param seconds - 秒数
 * @param detailed - 是否显示详细信息
 * @returns 格式化后的时间字符串
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

/** 格式化剩余时间（更友好的显示） */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return '计算中...';
  if (seconds === 0) return '即将完成';
  if (seconds < 1) return '不到 1 秒';
  if (seconds > CONSTANTS.TIME_UNITS.DAY) return '超过 1 天';

  return `剩余 ${formatTime(seconds)}`;
}

