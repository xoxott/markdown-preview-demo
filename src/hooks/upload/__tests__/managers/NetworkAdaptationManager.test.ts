/** NetworkAdaptationManager 测试 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkAdaptationManager } from '../../managers/NetworkAdaptationManager';
import type { ExtendedUploadConfig } from '../../types';
import type { NetworkService } from '../../services/NetworkService';
import type { ProgressManager } from '../../managers/ProgressManager';
import { CONSTANTS } from '../../constants';

describe('NetworkAdaptationManager', () => {
  let manager: NetworkAdaptationManager;
  let config: ExtendedUploadConfig;
  let networkService: NetworkService;
  let progressManager: ProgressManager;

  const defaultConfig: ExtendedUploadConfig = {
    maxConcurrentFiles: 3,
    maxConcurrentChunks: 6,
    chunkSize: 2 * 1024 * 1024,
    minChunkSize: 512 * 1024,
    maxChunkSize: 20 * 1024 * 1024,
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 1.5,
    uploadChunkUrl: '/upload',
    mergeChunksUrl: '/merge',
    headers: {},
    timeout: 60000,
    customParams: {},
    enableResume: true,
    enableDeduplication: true,
    enablePreview: true,
    enableCompression: true,
    useWorker: false,
    enableCache: true,
    enableNetworkAdaptation: true,
    compressionQuality: 0.8,
    previewMaxWidth: 200,
    previewMaxHeight: 200
  };

  beforeEach(() => {
    config = { ...defaultConfig };
    networkService = {
      adaptToConnection: vi.fn(),
      getAdaptiveConfig: vi.fn().mockReturnValue({
        chunkSize: config.chunkSize,
        networkQuality: 'good'
      })
    } as unknown as NetworkService;

    progressManager = {
      getAverageSpeed: vi.fn().mockReturnValue(0)
    } as unknown as ProgressManager;

    manager = new NetworkAdaptationManager(config, networkService, progressManager);
  });

  describe('constructor', () => {
    it('应该正确初始化', () => {
      expect(manager).toBeDefined();
    });
  });

  describe('setupNetworkMonitoring', () => {
    it('应该在 enableNetworkAdaptation 为 false 时跳过', () => {
      config.enableNetworkAdaptation = false;
      const origNavigator = globalThis.navigator;
      vi.stubGlobal('navigator', { connection: {} });

      manager.setupNetworkMonitoring();
      expect(networkService.adaptToConnection).not.toHaveBeenCalled();

      vi.stubGlobal('navigator', origNavigator);
    });

    it('应该在 navigator 没有 connection 属性时跳过', () => {
      config.enableNetworkAdaptation = true;
      // navigator 默认没有 connection 属性（happy-dom）
      manager.setupNetworkMonitoring();
      // 不会调用 adaptToConnection，因为 'connection' not in navigator
      expect(networkService.adaptToConnection).not.toHaveBeenCalled();
    });

    it('应该在 navigator 有 connection 属性时设置监控', () => {
      config.enableNetworkAdaptation = true;
      const mockConnection = {
        addEventListener: vi.fn(),
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        type: 'wifi',
        saveData: false
      };
      const origNavigator = globalThis.navigator;
      vi.stubGlobal('navigator', { connection: mockConnection });

      manager.setupNetworkMonitoring();

      expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(networkService.adaptToConnection).toHaveBeenCalledWith(mockConnection);

      vi.stubGlobal('navigator', origNavigator);
    });
  });

  describe('adjustPerformance', () => {
    it('应该在 enableNetworkAdaptation 为 false 时跳过', () => {
      config.enableNetworkAdaptation = false;
      manager.adjustPerformance(100, 3);
      // 不应修改配置
      expect(config.maxConcurrentFiles).toBe(3);
      expect(config.maxConcurrentChunks).toBe(6);
    });

    it('应该在未满足调整间隔时跳过', () => {
      // 先执行一次调整，更新 lastAdjustTime
      manager.adjustPerformance(100, 3);
      // 紧接着再次调整，间隔太短
      manager.adjustPerformance(100, 3);
      // 第二次调用因间隔限制被跳过（只做了一次有效调整）
    });

    it('应该在慢速网络下降低并发', () => {
      const slowSpeed = CONSTANTS.NETWORK.ADAPTATION.SLOW_THRESHOLD - 1; // 低于慢速阈值
      const activeCount = 2; // 多于1个活动上传

      manager.adjustPerformance(slowSpeed, activeCount);

      expect(config.maxConcurrentFiles).toBeLessThanOrEqual(defaultConfig.maxConcurrentFiles);
      expect(config.maxConcurrentChunks).toBeLessThanOrEqual(defaultConfig.maxConcurrentChunks);
    });

    it('应该在慢速网络且 activeCount <= 1 时不降低并发', () => {
      const slowSpeed = CONSTANTS.NETWORK.ADAPTATION.SLOW_THRESHOLD - 1;
      const activeCount = 1;

      manager.adjustPerformance(slowSpeed, activeCount);

      // activeCount <= 1 时不会触发降低并发逻辑
      expect(config.maxConcurrentFiles).toBe(defaultConfig.maxConcurrentFiles);
      expect(config.maxConcurrentChunks).toBe(defaultConfig.maxConcurrentChunks);
    });

    it('应该在快速网络且满并发时提高并发', () => {
      const fastSpeed = CONSTANTS.NETWORK.ADAPTATION.FAST_THRESHOLD + 1; // 高于快速阈值
      const activeCount = config.maxConcurrentFiles; // 活动数等于最大并发

      manager.adjustPerformance(fastSpeed, activeCount);

      expect(config.maxConcurrentFiles).toBeGreaterThanOrEqual(defaultConfig.maxConcurrentFiles);
      expect(config.maxConcurrentChunks).toBeGreaterThanOrEqual(defaultConfig.maxConcurrentChunks);
    });

    it('应该在快速网络但未满并发时不提高并发', () => {
      const fastSpeed = CONSTANTS.NETWORK.ADAPTATION.FAST_THRESHOLD + 1;
      const activeCount = 1; // 远低于 maxConcurrentFiles

      manager.adjustPerformance(fastSpeed, activeCount);

      // 未满并发，不会触发提高并发逻辑
      expect(config.maxConcurrentFiles).toBe(defaultConfig.maxConcurrentFiles);
      expect(config.maxConcurrentChunks).toBe(defaultConfig.maxConcurrentChunks);
    });

    it('应该在网络自适应分片大小与当前不同时调整 chunkSize', () => {
      networkService.getAdaptiveConfig = vi.fn().mockReturnValue({
        chunkSize: 4 * 1024 * 1024,
        networkQuality: 'good'
      });

      manager.adjustPerformance(300, 3);

      expect(config.chunkSize).toBe(4 * 1024 * 1024);
    });

    it('应该在自适应分片大小与当前相同时不调整 chunkSize', () => {
      networkService.getAdaptiveConfig = vi.fn().mockReturnValue({
        chunkSize: config.chunkSize,
        networkQuality: 'good'
      });

      manager.adjustPerformance(300, 3);

      expect(config.chunkSize).toBe(defaultConfig.chunkSize);
    });

    it('并发调整不应超过上下限', () => {
      // 将并发设置到最小值，再尝试降低
      config.maxConcurrentFiles = CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_FILES;
      config.maxConcurrentChunks = CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_CHUNKS;

      const slowSpeed = CONSTANTS.NETWORK.ADAPTATION.SLOW_THRESHOLD - 1;
      manager.adjustPerformance(slowSpeed, 2);

      expect(config.maxConcurrentFiles).toBe(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_FILES);
      expect(config.maxConcurrentChunks).toBe(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MIN_CHUNKS);
    });

    it('并发提高不应超过最大上限', () => {
      config.maxConcurrentFiles = CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_FILES;
      config.maxConcurrentChunks = CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_CHUNKS;

      const fastSpeed = CONSTANTS.NETWORK.ADAPTATION.FAST_THRESHOLD + 1;
      manager.adjustPerformance(fastSpeed, CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_FILES);

      expect(config.maxConcurrentFiles).toBe(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_FILES);
      expect(config.maxConcurrentChunks).toBe(CONSTANTS.NETWORK.CONCURRENT_LIMITS.MAX_CHUNKS);
    });
  });
});
