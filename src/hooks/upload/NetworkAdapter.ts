import { CONSTANTS } from './constants';
import type { UploadConfig } from './type';

/** 网络适配器，用于根据当前网络状态动态调整上传配置。 主要用于控制同时上传的文件数量、分片数量和分片大小，以适配不同网络环境。 */
export default class NetworkAdapter {
  // 网络状态历史记录
  private speedHistory: number[] = [];
  private maxHistorySize = 10;

  // 当前网络状态
  private currentNetworkInfo: {
    type: string;
    downlink: number;
    rtt: number;
    effectiveType: string;
    saveData: boolean;
  } = {
    type: 'unknown',
    downlink: 10,
    rtt: 100,
    effectiveType: '4g',
    saveData: false
  };

  // 自适应配置缓存
  private adaptiveConfig: {
    chunkSize: number;
    maxConcurrentFiles: number;
    maxConcurrentChunks: number;
    retryDelay: number;
    timeout: number;
    lastUpdate: number;
  };

  constructor(private config: UploadConfig) {
    // 初始化自适应配置
    this.adaptiveConfig = {
      chunkSize: config.chunkSize,
      maxConcurrentFiles: config.maxConcurrentFiles,
      maxConcurrentChunks: config.maxConcurrentChunks,
      retryDelay: config.retryDelay,
      timeout: config.timeout,
      lastUpdate: Date.now()
    };

    // 监听网络变化
    this.initNetworkListener();
  }

  /** 初始化网络监听器 */
  private initNetworkListener(): void {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    if (connection) {
      // 更新初始网络信息
      this.updateNetworkInfo(connection);

      // 监听网络变化
      connection.addEventListener('change', () => {
        this.updateNetworkInfo(connection);
        this.recalculateAdaptiveConfig();
      });
    }
  }

  /** 更新网络信息 */
  private updateNetworkInfo(connection: any): void {
    this.currentNetworkInfo = {
      type: connection.type || 'unknown',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      effectiveType: connection.effectiveType || '4g',
      saveData: connection.saveData || false
    };
  }

  /** 根据浏览器提供的网络信息适配上传策略 */
  adaptToConnection(connection: any): void {
    this.updateNetworkInfo(connection);
    this.recalculateAdaptiveConfig();

    // 更新主配置
    this.config.maxConcurrentFiles = this.adaptiveConfig.maxConcurrentFiles;
    this.config.maxConcurrentChunks = this.adaptiveConfig.maxConcurrentChunks;
    this.config.chunkSize = this.adaptiveConfig.chunkSize;
  }

  /** 重新计算自适应配置 */
  private recalculateAdaptiveConfig(): void {
    const { effectiveType, downlink, rtt, saveData } = this.currentNetworkInfo;

    // 基础配置映射
    const baseConfigs = {
      'slow-2g': {
        files: 1,
        chunks: 2,
        chunkSize: 256 * 1024, // 256KB
        retryDelay: 5000,
        timeout: 60000,
        maxConcurrentFiles: 10,
        maxConcurrentChunks: 10
      },
      '2g': {
        files: 1,
        chunks: 2,
        chunkSize: 512 * 1024, // 512KB
        retryDelay: 3000,
        timeout: 45000,
        maxConcurrentFiles: 10,
        maxConcurrentChunks: 10
      },
      '3g': {
        files: 2,
        chunks: 4,
        chunkSize: 1024 * 1024, // 1MB
        retryDelay: 2000,
        timeout: 30000,
        maxConcurrentFiles: 10,
        maxConcurrentChunks: 10
      },
      '4g': {
        files: 3,
        chunks: 6,
        chunkSize: 2 * 1024 * 1024, // 2MB
        retryDelay: 1000,
        timeout: 20000,
        maxConcurrentFiles: 10,
        maxConcurrentChunks: 10
      },
      '5g': {
        files: 4,
        chunks: 8,
        chunkSize: 4 * 1024 * 1024, // 4MB
        retryDelay: 500,
        timeout: 15000,
        maxConcurrentFiles: 10,
        maxConcurrentChunks: 10
      }
    };

    // 获取基础配置
    const config = baseConfigs[effectiveType as keyof typeof baseConfigs] || baseConfigs['4g'];

    // 根据具体网络指标微调
    if (downlink < 1) {
      // 下行速度小于 1 Mbps，降低并发
      config.files = Math.max(1, config.files - 1);
      config.chunks = Math.max(2, config.chunks - 2);
      config.chunkSize = Math.max(256 * 1024, config.chunkSize / 2);
    } else if (downlink > 10) {
      // 下行速度大于 10 Mbps，增加并发
      config.files = Math.min(6, config.files + 1);
      config.chunks = Math.min(12, config.chunks + 2);
      config.chunkSize = Math.min(8 * 1024 * 1024, config.chunkSize * 2);
    }

    // RTT（往返时延）调整
    if (rtt > 300) {
      // 高延迟，减少并发，增加超时
      config.chunks = Math.max(2, config.chunks - 1);
      config.timeout *= 1.5;
    } else if (rtt < 50) {
      // 低延迟，可以增加并发
      config.chunks = Math.min(12, config.chunks + 1);
    }

    // 省流模式调整
    if (saveData) {
      config.files = 1;
      config.chunks = Math.min(2, config.chunks);
      config.chunkSize = Math.min(512 * 1024, config.chunkSize);
    }

    // 根据历史速度进一步调整
    if (this.speedHistory.length > 0) {
      const avgSpeed = this.getAverageSpeed();
      if (avgSpeed < 100) {
        // 历史平均速度很慢
        config.chunkSize = Math.min(512 * 1024, config.chunkSize);
        config.chunks = Math.min(3, config.chunks);
      } else if (avgSpeed > 1000) {
        // 历史平均速度很快
        config.chunkSize = Math.min(8 * 1024 * 1024, config.chunkSize * 1.5);
        config.chunks = Math.min(10, config.chunks + 1);
      }
    }

    // 确保不超过用户设置的最大值
    config.files = Math.min(config.files, this.config.maxConcurrentFiles);
    config.chunks = Math.min(config.chunks, this.config.maxConcurrentChunks);
    config.chunkSize = Math.max(
      this.config.minChunkSize || CONSTANTS.UPLOAD.MIN_CHUNK_SIZE,
      Math.min(this.config.maxChunkSize || CONSTANTS.UPLOAD.MAX_CHUNK_SIZE, config.chunkSize)
    );

    // 更新自适应配置
    this.adaptiveConfig = {
      ...config,
      lastUpdate: Date.now()
    };
  }

  /**
   * 获取自适应配置
   *
   * @returns 根据网络状况计算的最优配置
   */
  getAdaptiveConfig(): {
    chunkSize: number;
    maxConcurrentFiles: number;
    maxConcurrentChunks: number;
    retryDelay: number;
    timeout: number;
    networkQuality: 'good' | 'fair' | 'poor';
    recommendedStrategy: string;
  } {
    // 如果配置超过5秒未更新，重新计算
    if (Date.now() - this.adaptiveConfig.lastUpdate > 5000) {
      this.recalculateAdaptiveConfig();
    }

    const quality = this.evaluateNetworkQuality();
    const strategy = this.getRecommendedStrategy(quality);

    return {
      ...this.adaptiveConfig,
      networkQuality: quality,
      recommendedStrategy: strategy
    };
  }

  /** 评估网络质量 */
  private evaluateNetworkQuality(): 'good' | 'fair' | 'poor' {
    const { effectiveType, downlink, rtt } = this.currentNetworkInfo;
    const avgSpeed = this.getAverageSpeed();

    // 综合评分
    let score = 0;

    // 网络类型评分
    const typeScores = { 'slow-2g': 0, '2g': 1, '3g': 2, '4g': 3, '5g': 4 };
    score += (typeScores[effectiveType as keyof typeof typeScores] || 3) * 2;

    // 下行速度评分
    if (downlink > 10) score += 3;
    else if (downlink > 5) score += 2;
    else if (downlink > 1) score += 1;

    // RTT评分
    if (rtt < 100) score += 2;
    else if (rtt < 200) score += 1;

    // 历史速度评分
    if (avgSpeed > 500) score += 3;
    else if (avgSpeed > 200) score += 2;
    else if (avgSpeed > 100) score += 1;

    // 计算最终质量
    if (score >= 10) return 'good';
    if (score >= 5) return 'fair';
    return 'poor';
  }

  /** 获取推荐的上传策略 */
  private getRecommendedStrategy(quality: 'good' | 'fair' | 'poor'): string {
    const strategies = {
      good: '高并发大分片策略：建议使用较大分片(2-4MB)，多并发上传',
      fair: '均衡策略：建议使用中等分片(1MB)，适度并发',
      poor: '保守策略：建议使用小分片(256-512KB)，低并发，启用断点续传'
    };
    return strategies[quality];
  }

  /** 根据当前上传速度评估网络质量 */
  getNetworkQuality(speed: number): 'good' | 'fair' | 'poor' {
    // 添加到历史记录
    this.addSpeedToHistory(speed);

    if (speed > CONSTANTS.NETWORK.QUALITY_THRESHOLDS.GOOD) return 'good';
    if (speed > CONSTANTS.NETWORK.QUALITY_THRESHOLDS.FAIR) return 'fair';
    return 'poor';
  }

  /** 添加速度到历史记录 */
  private addSpeedToHistory(speed: number): void {
    this.speedHistory.push(speed);
    if (this.speedHistory.length > this.maxHistorySize) {
      this.speedHistory.shift();
    }
  }

  /** 获取历史平均速度 */
  private getAverageSpeed(): number {
    if (this.speedHistory.length === 0) return 0;
    const sum = this.speedHistory.reduce((a, b) => a + b, 0);
    return sum / this.speedHistory.length;
  }

  /** 根据网络质量获取可同时上传的分片数 */
  getConcurrentChunks(quality: 'good' | 'fair' | 'poor'): number {
    const qualityMap = {
      poor: CONSTANTS.CONCURRENT.POOR_NETWORK,
      fair: CONSTANTS.CONCURRENT.FAIR_NETWORK,
      good: CONSTANTS.CONCURRENT.GOOD_NETWORK
    };
    return Math.min(this.adaptiveConfig.maxConcurrentChunks, qualityMap[quality]);
  }

  /** 更新上传速度并重新评估网络 */
  updateSpeed(speed: number): void {
    this.addSpeedToHistory(speed);

    // 如果速度变化较大，触发配置重算
    const avgSpeed = this.getAverageSpeed();
    if (Math.abs(speed - avgSpeed) / avgSpeed > 0.5) {
      this.recalculateAdaptiveConfig();
    }
  }

  /** 获取网络状态摘要 */
  getNetworkSummary(): {
    type: string;
    quality: 'good' | 'fair' | 'poor';
    downlink: number;
    rtt: number;
    averageSpeed: number;
    recommendation: string;
  } {
    const quality = this.evaluateNetworkQuality();
    return {
      type: this.currentNetworkInfo.effectiveType,
      quality,
      downlink: this.currentNetworkInfo.downlink,
      rtt: this.currentNetworkInfo.rtt,
      averageSpeed: this.getAverageSpeed(),
      recommendation: this.getRecommendedStrategy(quality)
    };
  }

  /** 手动触发网络适配 */
  triggerAdaptation(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.adaptToConnection(connection);
    }
  }

  /** 更新配置 */
  updateConfig(newConfig: UploadConfig): void {
    this.config = newConfig;
    this.recalculateAdaptiveConfig();
  }

  /** 重置网络适配器 */
  reset(): void {
    this.speedHistory = [];
    this.adaptiveConfig.lastUpdate = 0;
    this.recalculateAdaptiveConfig();
  }
}

// 导出网络信息类型
export interface NetworkInfo {
  type: string;
  downlink: number;
  rtt: number;
  effectiveType: string;
  saveData: boolean;
}

export interface AdaptiveConfig {
  chunkSize: number;
  maxConcurrentFiles: number;
  maxConcurrentChunks: number;
  retryDelay: number;
  timeout: number;
  networkQuality: 'good' | 'fair' | 'poor';
  recommendedStrategy: string;
}
