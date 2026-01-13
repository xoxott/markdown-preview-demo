/**
 * 进度跟踪类型定义
 */

/**
 * 进度事件数据
 */
export interface ProgressEvent {
  /** 已传输字节数 */
  loaded: number;
  /** 总字节数（如果未知则为 0） */
  total: number;
}

/**
 * 进度信息
 */
export interface ProgressInfo {
  /** 进度百分比 (0-100) */
  percent: number;
  /** 已传输字节数 */
  loaded: number;
  /** 总字节数 */
  total: number;
  /** 传输速度（格式化字符串，如 "1.5 MB/s"） */
  speed: string;
  /** 已用时间（毫秒） */
  elapsed: number;
}

/**
 * 进度回调函数
 */
export type ProgressCallback = (progress: ProgressInfo) => void;

