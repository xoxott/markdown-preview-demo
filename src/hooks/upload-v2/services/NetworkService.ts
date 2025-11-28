/**
 * 网络服务
 * 负责网络适配和请求处理
 */
import type { UploadConfig } from '../types';
import type { NetworkInformation, NavigatorWithConnection } from '../types/browser';
import { CONSTANTS } from '../constants';

/**
 * 网络服务
 */
export class NetworkService {
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

    const connection = (navigator as NavigatorWithConnection).connection;
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
  private updateNetworkInfo(connection: NetworkInformation): void {
    this.currentNetworkInfo = {
      type: connection.type || 'unknown',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      effectiveType: connection.effectiveType || '4g',
      saveData: connection.saveData || false
    };
  }

  /** 根据浏览器提供的网络信息适配上传策略 */
  adaptToConnection(connection: NetworkInformation): void {
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
        chunkSize: 256 * 1024,
        retryDelay: 5000,
        timeout: 60000
      },
      '2g': {
        files: 1,
        chunks: 2,
        chunkSize: 512 * 1024,
        retryDelay: 3000,
        timeout: 45000
      },
      '3g': {
        files: 2,
        chunks: 4,
        chunkSize: 1024 * 1024,
        retryDelay: 2000,
        timeout: 30000
      },
      '4g': {
        files: 3,
        chunks: 6,
        chunkSize: 2 * 1024 * 1024,
        retryDelay: 1000,
        timeout: 20000
      },
      '5g': {
        files: 4,
        chunks: 8,
        chunkSize: 4 * 1024 * 1024,
        retryDelay: 500,
        timeout: 15000
      }
    };

    // 获取基础配置
    const config = baseConfigs[effectiveType as keyof typeof baseConfigs] || baseConfigs['4g'];

    // 根据具体网络指标微调
    if (downlink < CONSTANTS.NETWORK.METRICS.DOWNLINK.POOR) {
      config.files = Math.max(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_FILES, config.files - 1);
      config.chunks = Math.max(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_CHUNKS, config.chunks - 2);
      config.chunkSize = Math.max(
        CONSTANTS.NETWORK.CHUNK_SIZE_LIMITS.POOR_MIN,
        config.chunkSize / 2
      );
    } else if (downlink > CONSTANTS.NETWORK.METRICS.DOWNLINK.GOOD) {
      config.files = Math.min(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_FILES, config.files + 1);
      config.chunks = Math.min(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_CHUNKS, config.chunks + 2);
      config.chunkSize = Math.min(
        CONSTANTS.NETWORK.CHUNK_SIZE_LIMITS.GOOD_MAX,
        config.chunkSize * 2
      );
    }

    // RTT 调整
    if (rtt > CONSTANTS.NETWORK.METRICS.RTT.HIGH) {
      config.chunks = Math.max(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_CHUNKS, config.chunks - 1);
      config.timeout *= 1.5;
    } else if (rtt < CONSTANTS.NETWORK.METRICS.RTT.LOW) {
      config.chunks = Math.min(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_CHUNKS, config.chunks + 1);
    }

    // 省流模式调整
    if (saveData) {
      config.files = CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_FILES;
      config.chunks = Math.min(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_CHUNKS, config.chunks);
      config.chunkSize = Math.min(CONSTANTS.NETWORK.CHUNK_SIZE_LIMITS.SAVE_DATA_MAX, config.chunkSize);
    }

    // 确保不超过用户设置的最大值
    config.files = Math.min(config.files, this.config.maxConcurrentFiles);
    config.chunks = Math.min(config.chunks, this.config.maxConcurrentChunks);
    config.chunkSize = Math.max(
      this.config.minChunkSize,
      Math.min(this.config.maxChunkSize, config.chunkSize)
    );

    // 更新自适应配置
    this.adaptiveConfig = {
      ...config,
      maxConcurrentFiles: config.files,
      maxConcurrentChunks: config.chunks,
      lastUpdate: Date.now()
    };
  }

  /**
   * 获取自适应配置
   */
  getAdaptiveConfig(): {
    chunkSize: number;
    maxConcurrentFiles: number;
    maxConcurrentChunks: number;
    retryDelay: number;
    timeout: number;
    networkQuality: 'good' | 'fair' | 'poor';
  } {
    // 如果配置超过5秒未更新，重新计算
    if (Date.now() - this.adaptiveConfig.lastUpdate > 5000) {
      this.recalculateAdaptiveConfig();
    }

    const quality = this.evaluateNetworkQuality();

    return {
      ...this.adaptiveConfig,
      networkQuality: quality
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

  /** 根据当前上传速度评估网络质量 */
  getNetworkQuality(speed: number): 'good' | 'fair' | 'poor' {
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

  /** 更新上传速度并重新评估网络 */
  updateSpeed(speed: number): void {
    this.addSpeedToHistory(speed);

    // 如果速度变化较大，触发配置重算
    const avgSpeed = this.getAverageSpeed();
    if (avgSpeed > 0 && Math.abs(speed - avgSpeed) / avgSpeed > 0.5) {
      this.recalculateAdaptiveConfig();
    }
  }
}

