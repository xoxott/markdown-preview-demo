import type { UploadConfig } from './type'
/** 智能分片计算器 */
export default class SmartChunkCalculator {
  static calculateOptimalChunkSize(fileSize: number, networkSpeed: number, config: UploadConfig): number {
    const { minChunkSize, maxChunkSize, chunkSize } = config;

    // 基于网络速度调整分片大小
    let optimalSize = chunkSize;

    if (networkSpeed > 0) {
      // 目标：每个分片上传时间在2-5秒之间
      const targetTime = 3; // 3秒
      optimalSize = Math.round(networkSpeed * 1024 * targetTime); // KB/s * 1024 * 秒 = bytes
    }

    // 基于文件大小调整
    if (fileSize < 10 * 1024 * 1024) { // 小于10MB
      optimalSize = Math.min(optimalSize, 1 * 1024 * 1024); // 最大1MB
    } else if (fileSize > 1024 * 1024 * 1024) { // 大于1GB
      optimalSize = Math.max(optimalSize, 5 * 1024 * 1024); // 最小5MB
    }

    // 确保在允许范围内
    return Math.max(minChunkSize, Math.min(maxChunkSize, optimalSize));
  }
}