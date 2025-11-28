/**
 * 浏览器 API 类型声明
 */

/** 网络信息接口（Network Information API） */
export interface NetworkInformation extends EventTarget {
  readonly type: ConnectionType;
  readonly effectiveType: EffectiveConnectionType;
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
  onchange: ((this: NetworkInformation, ev: Event) => unknown) | null;
}

/** 连接类型 */
export type ConnectionType = 
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'mixed'
  | 'none'
  | 'other'
  | 'unknown'
  | 'wifi'
  | 'wimax';

/** 有效连接类型 */
export type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g';

/** 扩展 Navigator 接口 */
export interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

/** 扩展 Window 接口（用于 logger） */
export interface WindowWithLogger extends Window {
  __UPLOAD_LOGGER__?: {
    error: (message: string, context?: Record<string, unknown>, error?: Error) => void;
  };
}

