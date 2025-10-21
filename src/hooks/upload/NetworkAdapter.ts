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
export default class NetworkAdapter {
  constructor(private config: UploadConfig) {}

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

    if (effectiveType === '4g' && downlink < 1) {
      this.config.maxConcurrentFiles = Math.max(1, this.config.maxConcurrentFiles - 1);
      this.config.maxConcurrentChunks = Math.max(2, this.config.maxConcurrentChunks - 2);
    }
  }

  getNetworkQuality(speed: number): 'good' | 'fair' | 'poor' {
    if (speed > CONSTANTS.NETWORK.QUALITY_THRESHOLDS.GOOD) return 'good';
    if (speed > CONSTANTS.NETWORK.QUALITY_THRESHOLDS.FAIR) return 'fair';
    return 'poor';
  }

  getConcurrentChunks(quality: 'good' | 'fair' | 'poor'): number {
    const qualityMap = {
      poor: CONSTANTS.CONCURRENT.POOR_NETWORK,
      fair: CONSTANTS.CONCURRENT.FAIR_NETWORK,
      good: CONSTANTS.CONCURRENT.GOOD_NETWORK,
    };
    return Math.min(this.config.maxConcurrentChunks, qualityMap[quality]);
  }
}
