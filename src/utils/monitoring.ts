/**
 * 监控相关的工具函数
 */

/**
 * 格式化字节数为可读格式
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * 格式化运行时间（秒）为可读格式
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}秒`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0 && parts.length === 0) parts.push(`${secs}秒`);

  return parts.join(' ') || '0秒';
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number | string, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(decimals)}%`;
}

/**
 * 格式化 CPU 时间（微秒）为可读格式
 */
export function formatCpuTime(microseconds: number): string {
  if (microseconds < 1000) {
    return `${microseconds}μs`;
  }
  if (microseconds < 1000000) {
    return `${(microseconds / 1000).toFixed(2)}ms`;
  }
  return `${(microseconds / 1000000).toFixed(2)}s`;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: string | number | Date): string {
  const date = typeof timestamp === 'string' || typeof timestamp === 'number'
    ? new Date(timestamp)
    : timestamp;

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * 计算内存使用百分比
 */
export function calculateMemoryUsagePercent(used: number, total: number): number {
  if (total === 0) return 0;
  return (used / total) * 100;
}

/**
 * 获取内存使用状态颜色
 */
export function getMemoryUsageColor(percent: number): string {
  if (percent < 50) return '#18a058'; // 绿色
  if (percent < 80) return '#f0a020'; // 橙色
  return '#d03050'; // 红色
}

/**
 * 获取 CPU 使用状态颜色
 */
export function getCpuUsageColor(percent: number): string {
  if (percent < 50) return '#18a058'; // 绿色
  if (percent < 80) return '#f0a020'; // 橙色
  return '#d03050'; // 红色
}

