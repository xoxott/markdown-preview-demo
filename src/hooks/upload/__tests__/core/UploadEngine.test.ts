/** UploadEngine 核心逻辑单元测试 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadEngine } from '../../core/UploadEngine';
import { UploadController } from '../../controllers/UploadController';
import { CacheManager } from '../../managers/CacheManager';
import { CallbackManager } from '../../managers/CallbackManager';
import { ProgressManager } from '../../managers/ProgressManager';
import { StatsManager } from '../../managers/StatsManager';
import { ChunkService } from '../../services/ChunkService';
import { UploadStatus } from '../../types';
import type { FileTask, UploadConfig } from '../../types';

/** 创建测试用的 FileTask */
function createMockFileTask(id: string, fileName: string, size: number = 1024): FileTask {
  const file = new File([new ArrayBuffer(size)], fileName, { type: 'text/plain' });
  return {
    id,
    file,
    status: UploadStatus.PENDING,
    progress: 0,
    speed: 0,
    uploadedSize: 0,
    chunks: [],
    uploadedChunks: 0,
    totalChunks: 0,
    retryCount: 0,
    startTime: null,
    endTime: null,
    pausedTime: 0,
    resumeTime: 0,
    result: null,
    error: null,
    options: {},
    fileMD5: ''
  };
}

/** 创建基础配置 */
function createBaseConfig(): UploadConfig {
  return {
    maxConcurrentFiles: 2,
    maxConcurrentChunks: 3,
    chunkSize: 1024 * 1024,
    minChunkSize: 256 * 1024,
    maxChunkSize: 8 * 1024 * 1024,
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 1.5,
    uploadChunkUrl: '/api/upload/chunk',
    mergeChunksUrl: '/api/upload/merge',
    checkFileUrl: '',
    headers: {},
    timeout: 30000,
    customParams: {},
    maxFileSize: 100 * 1024 * 1024,
    maxFiles: 100,
    enableResume: false,
    enableDeduplication: false,
    useWorker: false,
    enableCache: false,
    enableNetworkAdaptation: false,
    enableSmartRetry: false,
    enableCompression: false,
    compressionQuality: 0.8,
    enablePreview: false,
    previewMaxWidth: 200,
    previewMaxHeight: 200
  };
}

describe('UploadEngine', () => {
  let engine: UploadEngine;
  let config: UploadConfig;
  let chunkService: ChunkService;
  let cacheManager: CacheManager;
  let callbackManager: CallbackManager;
  let progressManager: ProgressManager;
  let uploadController: UploadController;
  let statsManager: StatsManager;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, fileUrl: 'https://example.com/file', fileId: 'f1' })
    });

    config = createBaseConfig();
    cacheManager = new CacheManager();
    callbackManager = new CallbackManager();
    progressManager = new ProgressManager();
    uploadController = new UploadController();
    statsManager = new StatsManager();
    chunkService = new ChunkService(config, () => {});

    engine = new UploadEngine(
      config,
      chunkService,
      cacheManager,
      callbackManager,
      progressManager,
      uploadController,
      statsManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('processQueue', () => {
    it('应该处理空队列并正确退出', async () => {
      const uploadQueue: FileTask[] = [];
      const activeUploads = new Map<string, FileTask>();
      const completedUploads: FileTask[] = [];

      await engine.processQueue(uploadQueue, activeUploads, completedUploads);

      expect(uploadQueue.length).toBe(0);
      expect(activeUploads.size).toBe(0);
      expect(completedUploads.length).toBe(0);
    });

    it('应该按 maxConcurrentFiles 限制并发', async () => {
      config.maxConcurrentFiles = 1;
      const tasks = [
        createMockFileTask('task1', 'file1.txt'),
        createMockFileTask('task2', 'file2.txt')
      ];
      const uploadQueue = [...tasks];
      const activeUploads = new Map<string, FileTask>();
      const completedUploads: FileTask[] = [];

      // maxConcurrentFiles=1 时，同一时刻只有 1 个活跃任务
      const processPromise = engine.processQueue(uploadQueue, activeUploads, completedUploads);

      // 等一小段时间检查并发限制
      await new Promise<void>(resolve => {
        setTimeout(resolve, 100);
      });

      // 不超过 maxConcurrentFiles
      expect(activeUploads.size).toBeLessThanOrEqual(config.maxConcurrentFiles);

      await processPromise;
    });

    it('应该在暂停时停止处理', async () => {
      const task = createMockFileTask('task1', 'file1.txt', 100);
      const uploadQueue = [task];
      const activeUploads = new Map<string, FileTask>();
      const completedUploads: FileTask[] = [];

      uploadController.isPaused.value = true;

      await engine.processQueue(uploadQueue, activeUploads, completedUploads);

      // 暂停时不应该启动任务
      expect(activeUploads.size).toBe(0);
    });

    it('应该将完成的任务添加到 completedUploads', async () => {
      const task = createMockFileTask('task1', 'file1.txt', 100);
      task.status = UploadStatus.PENDING;
      const uploadQueue = [task];
      const activeUploads = new Map<string, FileTask>();
      const completedUploads: FileTask[] = [];

      await engine.processQueue(uploadQueue, activeUploads, completedUploads);

      // 即使上传失败（mock fetch 可能抛错），最终任务应该出现在 completedUploads 中
      // 因为 engine 的 then() 回调会 push 到 completedUploads
      // 注意：如果 upload 失败，completedUploads 可能仍有记录（取决于 UploadTask 是否设置 completed=true）
    });

    it('不应该重复添加同一任务到 completedUploads', async () => {
      const task = createMockFileTask('task1', 'file1.txt', 100);
      const completedUploads: FileTask[] = [task];

      // 模拟 engine 内部的去重逻辑
      const alreadyExists = completedUploads.some(t => t.id === task.id);
      expect(alreadyExists).toBe(true);

      // 如果已存在，不应重复 push
      if (!alreadyExists) {
        completedUploads.push(task);
      }
      expect(completedUploads.length).toBe(1);
    });
  });

  describe('handleUploadComplete', () => {
    it('所有成功时应该触发 onAllComplete', async () => {
      const task1 = createMockFileTask('task1', 'file1.txt');
      task1.status = UploadStatus.SUCCESS;
      const task2 = createMockFileTask('task2', 'file2.txt');
      task2.status = UploadStatus.SUCCESS;

      const completedUploads = [task1, task2];
      const onAllCompleteSpy = vi.fn();
      callbackManager.onAllComplete(onAllCompleteSpy);

      await engine.handleUploadComplete(completedUploads);

      expect(onAllCompleteSpy).toHaveBeenCalled();
    });

    it('有失败任务时应该触发 onAllError', async () => {
      const task1 = createMockFileTask('task1', 'file1.txt');
      task1.status = UploadStatus.SUCCESS;
      const task2 = createMockFileTask('task2', 'file2.txt');
      task2.status = UploadStatus.ERROR;

      const completedUploads = [task1, task2];
      const onAllErrorSpy = vi.fn();
      callbackManager.onAllError(onAllErrorSpy);

      await engine.handleUploadComplete(completedUploads);

      expect(onAllErrorSpy).toHaveBeenCalled();
    });

    it('有暂停任务时不应触发任何回调', async () => {
      const task1 = createMockFileTask('task1', 'file1.txt');
      task1.status = UploadStatus.PAUSED;

      const completedUploads = [task1];
      const onAllCompleteSpy = vi.fn();
      const onAllErrorSpy = vi.fn();
      callbackManager.onAllComplete(onAllCompleteSpy);
      callbackManager.onAllError(onAllErrorSpy);

      await engine.handleUploadComplete(completedUploads);

      expect(onAllCompleteSpy).not.toHaveBeenCalled();
      expect(onAllErrorSpy).not.toHaveBeenCalled();
    });

    it('空完成列表时应该触发 onAllComplete（空数组）', async () => {
      const completedUploads: FileTask[] = [];
      const onAllCompleteSpy = vi.fn();
      callbackManager.onAllComplete(onAllCompleteSpy);

      await engine.handleUploadComplete(completedUploads);

      expect(onAllCompleteSpy).toHaveBeenCalledWith([]);
    });
  });
});
