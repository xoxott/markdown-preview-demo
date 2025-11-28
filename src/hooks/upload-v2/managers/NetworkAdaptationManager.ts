/**
 * 网络自适应管理器
 * 负责网络监控和性能调整
 */
import type { ExtendedUploadConfig } from '../types';
import type { NavigatorWithConnection } from '../types/browser';
import { NetworkService } from '../services/NetworkService';
import { ProgressManager } from './ProgressManager';
import { logger } from '../utils/logger';
import { CONSTANTS } from '../constants';
import {
  createNetworkAdaptationConfig,
  updateSpeedHistory,
  calculateAverageSpeed,
  canAdjust,
  updateAdjustTime,
  type NetworkAdaptationConfig
} from '../utils/network-adaptation';

/**
 * 网络自适应管理器
 */
export class NetworkAdaptationManager {
  private networkAdaptation: NetworkAdaptationConfig;

  constructor(
    private config: ExtendedUploadConfig,
    private networkService: NetworkService,
    private progressManager: ProgressManager
  ) {
    this.networkAdaptation = createNetworkAdaptationConfig(
      CONSTANTS.NETWORK.ADJUST_INTERVAL,
      CONSTANTS.NETWORK.ADAPTATION.SPEED_HISTORY_SIZE
    );
  }

  /**
   * 设置网络监控
   */
  setupNetworkMonitoring(): void {
    if (!this.config.enableNetworkAdaptation || !('connection' in navigator)) return;

    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection) {
      const updateNetworkInfo = () => this.networkService.adaptToConnection(connection);
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }
  }

  /**
   * 调整性能（基于网络状态）
   */
  adjustPerformance(uploadSpeed: number, activeCount: number): void {
    if (!this.config.enableNetworkAdaptation) return;

    // 限制调整频率
    if (!canAdjust(this.networkAdaptation)) {
      return;
    }

    // 使用滑动窗口评估网络状态
    updateSpeedHistory(this.networkAdaptation, uploadSpeed);

    // 计算平均速度
    const avgSpeed = calculateAverageSpeed(this.networkAdaptation);

    // 基于平均速度调整，避免频繁切换
    if (avgSpeed < CONSTANTS.NETWORK.ADAPTATION.SLOW_THRESHOLD && activeCount > 1) {
      const oldFiles = this.config.maxConcurrentFiles;
      const oldChunks = this.config.maxConcurrentChunks;
      this.config.maxConcurrentFiles = Math.max(
        CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_FILES,
        this.config.maxConcurrentFiles - 1
      );
      this.config.maxConcurrentChunks = Math.max(
        CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_CHUNKS,
        this.config.maxConcurrentChunks - 1
      );

      if (oldFiles !== this.config.maxConcurrentFiles || oldChunks !== this.config.maxConcurrentChunks) {
        logger.info('网络自适应：降低并发', {
          avgSpeed,
          maxConcurrentFiles: this.config.maxConcurrentFiles,
          maxConcurrentChunks: this.config.maxConcurrentChunks
        });
      }
    } else if (
      avgSpeed > CONSTANTS.NETWORK.ADAPTATION.FAST_THRESHOLD &&
      activeCount === this.config.maxConcurrentFiles
    ) {
      const oldFiles = this.config.maxConcurrentFiles;
      const oldChunks = this.config.maxConcurrentChunks;
      this.config.maxConcurrentFiles = Math.min(
        CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_FILES,
        this.config.maxConcurrentFiles + 1
      );
      this.config.maxConcurrentChunks = Math.min(
        CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_CHUNKS,
        this.config.maxConcurrentChunks + 1
      );

      if (oldFiles !== this.config.maxConcurrentFiles || oldChunks !== this.config.maxConcurrentChunks) {
        logger.info('网络自适应：提高并发', {
          avgSpeed,
          maxConcurrentFiles: this.config.maxConcurrentFiles,
          maxConcurrentChunks: this.config.maxConcurrentChunks
        });
      }
    }

    const networkConfig = this.networkService.getAdaptiveConfig();
    if (networkConfig.chunkSize && networkConfig.chunkSize !== this.config.chunkSize) {
      const oldChunkSize = this.config.chunkSize;
      this.config.chunkSize = networkConfig.chunkSize;
      logger.info('网络自适应：调整分片大小', {
        oldChunkSize,
        newChunkSize: this.config.chunkSize,
        networkQuality: networkConfig.networkQuality
      });
    }

    updateAdjustTime(this.networkAdaptation);
  }
}

