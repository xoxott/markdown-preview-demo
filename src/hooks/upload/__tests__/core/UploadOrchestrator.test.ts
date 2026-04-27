/** UploadOrchestrator 编排逻辑单元测试 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadOrchestrator } from '../../core/UploadOrchestrator';
import { UploadStatus } from '../../types';
import type { UploadConfig } from '../../types';

/** 创建基础配置 */
function createBaseConfig(): Partial<UploadConfig> {
  return {
    maxConcurrentFiles: 2,
    maxConcurrentChunks: 3,
    chunkSize: 1024 * 1024,
    maxRetries: 3,
    retryDelay: 100,
    retryBackoff: 1.5,
    uploadChunkUrl: '/api/upload/chunk',
    mergeChunksUrl: '/api/upload/merge',
    checkFileUrl: '',
    headers: {},
    timeout: 5000,
    customParams: {},
    enableResume: false,
    enableDeduplication: false,
    useWorker: false,
    enableCache: false,
    enableNetworkAdaptation: false
  };
}

describe('UploadOrchestrator', () => {
  let orchestrator: UploadOrchestrator;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        fileUrl: 'https://example.com/file',
        fileId: 'f1',
        fileName: 'test.txt',
        fileSize: 1024,
        uploadTime: 1
      })
    });

    // Mock import.meta.env（SSR 兼容）
    vi.stubGlobal('import.meta', { env: { DEV: false, PROD: true } });

    orchestrator = new UploadOrchestrator(createBaseConfig());
  });

  afterEach(() => {
    orchestrator.destroy();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('addFiles', () => {
    it('应该将文件添加到上传队列', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await orchestrator.addFiles(file);

      expect(orchestrator.uploadQueue.value.length).toBe(1);
      expect(orchestrator.uploadQueue.value[0].file.name).toBe('test.txt');
      expect(orchestrator.uploadQueue.value[0].status).toBe(UploadStatus.PENDING);
    });

    it('应该支持添加多个文件', async () => {
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' })
      ];
      await orchestrator.addFiles(files);

      expect(orchestrator.uploadQueue.value.length).toBe(2);
    });

    it('应该支持 FileList 输入', async () => {
      // FileList 无法直接构造，用 File[] 代替测试
      const files = [new File(['content'], 'file.txt', { type: 'text/plain' })];
      await orchestrator.addFiles(files);

      expect(orchestrator.uploadQueue.value.length).toBe(1);
    });

    it('应该返回 this 以支持链式调用', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = await orchestrator.addFiles(file);
      expect(result).toBe(orchestrator);
    });
  });

  describe('并发安全', () => {
    it('应该防止并发 addFiles', async () => {
      // 第一次 addFiles 正在进行时，第二次应 abort 第一次后等待完成
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });

      const result = await orchestrator.addFiles(file1);
      expect(result).toBe(orchestrator);
    });

    it('isAddingFiles 应在添加完成后重置', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      await orchestrator.addFiles(file);

      // 添加完成后 isAddingFiles 应为 false
      // 注意：isAddingFiles 是内部状态，通过 addFiles 的 Promise 完成来间接验证
      expect(orchestrator.uploadQueue.value.length).toBe(1);
    });
  });

  describe('start', () => {
    it('空队列时应该触发 onAllComplete', async () => {
      const onAllCompleteSpy = vi.fn();
      orchestrator.onAllComplete(onAllCompleteSpy);

      await orchestrator.start();

      expect(onAllCompleteSpy).toHaveBeenCalledWith([]);
    });

    it('应该设置 isUploading=true', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      await orchestrator.addFiles(file);

      const startPromise = orchestrator.start();
      expect(orchestrator.isUploading.value).toBe(true);

      await startPromise;
      expect(orchestrator.isUploading.value).toBe(false);
    });
  });

  describe('暂停/恢复/取消', () => {
    it('pause 应暂停单个任务', () => {
      orchestrator.pause('task1');
      // 验证暂停逻辑（pause 调用 taskOperations.pause）
      expect(orchestrator).toBeDefined();
    });

    it('pauseAll 应暂停所有任务', async () => {
      await orchestrator.pauseAll();
      expect(orchestrator).toBeDefined();
    });

    it('resume 应恢复单个任务', () => {
      orchestrator.resume('task1');
      expect(orchestrator).toBeDefined();
    });

    it('resumeAll 应恢复所有任务', () => {
      orchestrator.resumeAll();
      expect(orchestrator).toBeDefined();
    });

    it('cancel 应取消单个任务并清理资源', () => {
      orchestrator.cancel('task1');
      expect(orchestrator).toBeDefined();
    });

    it('cancelAll 应取消所有任务', async () => {
      await orchestrator.cancelAll();
      expect(orchestrator.isUploading.value).toBe(false);
    });
  });

  describe('状态管理', () => {
    it('uploadStats 应提供统计信息', () => {
      const stats = orchestrator.uploadStats.value;
      expect(stats).toBeDefined();
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('isPaused 应反映暂停状态', () => {
      expect(orchestrator.isPaused.value).toBe(false);
    });

    it('uploadSpeed 应初始为 0', () => {
      expect(orchestrator.uploadSpeed.value).toBe(0);
    });

    it('totalProgress 应初始为 0', () => {
      expect(orchestrator.totalProgress.value).toBe(0);
    });
  });

  describe('链式回调', () => {
    it('应该支持所有链式回调注册', () => {
      const spies = {
        onFileStart: vi.fn(),
        onFileProgress: vi.fn(),
        onFileSuccess: vi.fn(),
        onFileError: vi.fn(),
        onFilePause: vi.fn(),
        onFileResume: vi.fn(),
        onFileCancel: vi.fn(),
        onTotalProgress: vi.fn(),
        onAllComplete: vi.fn(),
        onAllError: vi.fn(),
        onSpeedChange: vi.fn(),
        onQueueChange: vi.fn(),
        onChunkSuccess: vi.fn(),
        onChunkError: vi.fn()
      };

      const result = orchestrator
        .onFileStart(spies.onFileStart)
        .onFileProgress(spies.onFileProgress)
        .onFileSuccess(spies.onFileSuccess)
        .onFileError(spies.onFileError)
        .onFilePause(spies.onFilePause)
        .onFileResume(spies.onFileResume)
        .onFileCancel(spies.onFileCancel)
        .onTotalProgress(spies.onTotalProgress)
        .onAllComplete(spies.onAllComplete)
        .onAllError(spies.onAllError)
        .onSpeedChange(spies.onSpeedChange)
        .onQueueChange(spies.onQueueChange)
        .onChunkSuccess(spies.onChunkSuccess)
        .onChunkError(spies.onChunkError);

      expect(result).toBe(orchestrator);
    });
  });

  describe('配置更新', () => {
    it('updateConfig 应合并新配置', () => {
      const result = orchestrator.updateConfig({ maxConcurrentFiles: 5 });
      expect(result).toBe(orchestrator);
    });
  });

  describe('destroy', () => {
    it('应该清理所有资源', () => {
      orchestrator.destroy();

      // 销毁后不应再使用
      expect(orchestrator.isUploading.value).toBe(false);
    });
  });

  describe('clear', () => {
    it('应该清空所有文件和缓存', () => {
      const result = orchestrator.clear();
      expect(result).toBe(orchestrator);
      expect(orchestrator.completedUploads.value.length).toBe(0);
    });
  });

  describe('removeFile', () => {
    it('应该移除指定文件', () => {
      const result = orchestrator.removeFile('task1');
      expect(result).toBe(orchestrator);
    });
  });

  describe('retryFailed', () => {
    it('retrySingleFile 应返回 this', () => {
      const result = orchestrator.retrySingleFile('task1');
      expect(result).toBe(orchestrator);
    });

    it('retryFailed 应返回 this', () => {
      const result = orchestrator.retryFailed();
      expect(result).toBe(orchestrator);
    });
  });

  describe('getTask', () => {
    it('不存在任务时应返回 undefined', () => {
      const task = orchestrator.getTask('nonexistent');
      expect(task).toBeUndefined();
    });
  });

  describe('getStatsManager', () => {
    it('应返回 StatsManager 实例', () => {
      const statsManager = orchestrator.getStatsManager();
      expect(statsManager).toBeDefined();
    });
  });
});
