/**
 * 网络自适应工具函数
 */
import { CONSTANTS } from '../constants';

/** 网络自适应配置 */
export interface NetworkAdaptationConfig {
  lastAdjustTime: number;
  adjustInterval: number;
  speedHistory: number[];
  speedHistorySize: number;
}

/**
 * 创建网络自适应配置
 */
export function createNetworkAdaptationConfig(
  adjustInterval: number = CONSTANTS.NETWORK.ADJUST_INTERVAL,
  speedHistorySize: number = CONSTANTS.NETWORK.ADAPTATION.SPEED_HISTORY_SIZE
): NetworkAdaptationConfig {
  return {
    lastAdjustTime: 0,
    adjustInterval,
    speedHistory: [],
    speedHistorySize
  };
}

/**
 * 更新速度历史
 */
export function updateSpeedHistory(
  config: NetworkAdaptationConfig,
  speed: number
): void {
  config.speedHistory.push(speed);
  if (config.speedHistory.length > config.speedHistorySize) {
    config.speedHistory.shift();
  }
}

/**
 * 计算平均速度
 */
export function calculateAverageSpeed(config: NetworkAdaptationConfig): number {
  if (config.speedHistory.length === 0) return 0;
  return config.speedHistory.reduce((sum, s) => sum + s, 0) / config.speedHistory.length;
}

/**
 * 检查是否可以调整
 */
export function canAdjust(config: NetworkAdaptationConfig): boolean {
  const now = Date.now();
  return now - config.lastAdjustTime >= config.adjustInterval;
}

/**
 * 更新调整时间
 */
export function updateAdjustTime(config: NetworkAdaptationConfig): void {
  config.lastAdjustTime = Date.now();
}

