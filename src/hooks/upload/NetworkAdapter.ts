import { CONSTANTS } from "./constants";
import { UploadConfig } from "./type";

/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:07:22
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:08:41
 * @FilePath: \markdown-preview-demo\src\hooks\upload\NetworkAdapter.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

// ==================== 工具类：网络适配器 ====================

/**
 * 网络适配器，用于根据当前网络状态动态调整上传配置。
 * 主要用于控制同时上传的文件数量、分片数量和分片大小，以适配不同网络环境。
 */
export default class NetworkAdapter {
  /**
   * @param config - 上传配置对象，用于动态调整上传参数
   */
  constructor(private config: UploadConfig) {}

  /**
   * 根据浏览器提供的网络信息（navigator.connection）适配上传策略。
   * 会修改 `config` 中的 maxConcurrentFiles、maxConcurrentChunks 和 chunkSize。
   * 
   * @param connection - 浏览器的网络连接信息对象（NavigatorConnection 或类似对象）
   *                     主要包含 `downlink`（下行速度，Mbps）和 `effectiveType`（网络类型）
   */
  adaptToConnection(connection: any): void {
    const downlink = connection?.downlink || 1;
    const effectiveType = connection?.effectiveType || '4g';

    const adaptations = {
      'slow-2g': { files: 1, chunks: 2, chunkSize: 512 * 1024 },
      '2g': { files: 1, chunks: 2, chunkSize: 512 * 1024 },
      '3g': { files: 2, chunks: 3, chunkSize: 1024 * 1024 },
      '4g': { files: this.config.maxConcurrentFiles, chunks: this.config.maxConcurrentChunks, chunkSize: this.config.chunkSize },
    };

    const adaptation = adaptations[effectiveType as keyof typeof adaptations] || adaptations['4g'];
    
    this.config.maxConcurrentFiles = adaptation.files;
    this.config.maxConcurrentChunks = adaptation.chunks;
    this.config.chunkSize = Math.min(this.config.chunkSize, adaptation.chunkSize);

    // 对高网络环境但下行速度较慢的情况进行微调
    if (effectiveType === '4g' && downlink < 1) {
      this.config.maxConcurrentFiles = Math.max(1, this.config.maxConcurrentFiles - 1);
      this.config.maxConcurrentChunks = Math.max(2, this.config.maxConcurrentChunks - 2);
    }
  }

  /**
   * 根据当前上传速度评估网络质量
   * 
   * @param speed - 当前上传速度（单位：Mbps）
   * @returns 网络质量等级：'good' | 'fair' | 'poor'
   */
  getNetworkQuality(speed: number): 'good' | 'fair' | 'poor' {
    if (speed > CONSTANTS.NETWORK.QUALITY_THRESHOLDS.GOOD) return 'good';
    if (speed > CONSTANTS.NETWORK.QUALITY_THRESHOLDS.FAIR) return 'fair';
    return 'poor';
  }

  /**
   * 根据网络质量获取可同时上传的分片数
   * 
   * @param quality - 网络质量等级：'good' | 'fair' | 'poor'
   * @returns 可同时上传的最大分片数量（受 config.maxConcurrentChunks 限制）
   */
  getConcurrentChunks(quality: 'good' | 'fair' | 'poor'): number {
    const qualityMap = {
      poor: CONSTANTS.CONCURRENT.POOR_NETWORK,
      fair: CONSTANTS.CONCURRENT.FAIR_NETWORK,
      good: CONSTANTS.CONCURRENT.GOOD_NETWORK,
    };
    return Math.min(this.config.maxConcurrentChunks, qualityMap[quality]);
  }
}
