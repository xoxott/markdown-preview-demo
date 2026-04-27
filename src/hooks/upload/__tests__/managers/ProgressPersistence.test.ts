/** ProgressPersistence 测试 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressPersistence } from '../../managers/ProgressPersistence';
import type { CachedProgressData } from '../../managers/ProgressPersistence';
import type { CacheManager } from '../../managers/CacheManager';
import type { ChunkInfo, FileTask } from '../../types';
import { ChunkStatus, UploadStatus } from '../../types';

describe('ProgressPersistence', () => {
  let persistence: ProgressPersistence;
  let cacheManager: CacheManager;
  let cacheData: Map<string, CachedProgressData>;

  const createMockTask = (id: string, options?: Partial<FileTask>): FileTask => ({
    id,
    file: new File(['content'], 'test.txt', { type: 'text/plain' }),
    status: UploadStatus.PAUSED,
    progress: 50,
    speed: 0,
    chunks: [
      {
        index: 0,
        start: 0,
        end: 1024,
        size: 1024,
        blob: null,
        status: ChunkStatus.SUCCESS,
        retryCount: 0,
        etag: 'etag-0',
        hash: 'hash-0'
      },
      {
        index: 1,
        start: 1024,
        end: 2048,
        size: 1024,
        blob: null,
        status: ChunkStatus.PENDING,
        retryCount: 0
      }
    ],
    uploadedChunks: 1,
    totalChunks: 2,
    retryCount: 0,
    startTime: null,
    endTime: null,
    pausedTime: 1000,
    resumeTime: 0,
    uploadedSize: 1024,
    result: null,
    error: null,
    fileMD5: 'md5-test',
    options: {},
    ...options
  });

  beforeEach(() => {
    cacheData = new Map();

    cacheManager = {
      set: vi.fn((key: string, value: CachedProgressData) => {
        cacheData.set(key, value);
      }),
      get: vi.fn((key: string) => cacheData.get(key) || null),
      delete: vi.fn((key: string) => {
        cacheData.delete(key);
      })
    } as unknown as CacheManager;

    persistence = new ProgressPersistence(cacheManager);
  });

  describe('saveTaskProgress', () => {
    it('应该保存任务进度到缓存', () => {
      const task = createMockTask('task-1');

      persistence.saveTaskProgress(task);

      expect(cacheManager.set).toHaveBeenCalledWith('progress_task-1', expect.any(Object));
      const savedData = cacheData.get('progress_task-1');
      expect(savedData).toBeDefined();
      expect(savedData!.taskId).toBe('task-1');
      expect(savedData!.fileName).toBe('test.txt');
      expect(savedData!.progress).toBe(50);
      expect(savedData!.status).toBe(UploadStatus.PAUSED);
      expect(savedData!.uploadedChunks).toBe(1);
      expect(savedData!.totalChunks).toBe(2);
      expect(savedData!.uploadedSize).toBe(1024);
      expect(savedData!.pausedTime).toBe(1000);
    });

    it('应该保存分片信息', () => {
      const task = createMockTask('task-1');

      persistence.saveTaskProgress(task);

      const savedData = cacheData.get('progress_task-1');
      expect(savedData!.chunks).toHaveLength(2);
      expect(savedData!.chunks![0].index).toBe(0);
      expect(savedData!.chunks![0].status).toBe(ChunkStatus.SUCCESS);
      expect(savedData!.chunks![0].etag).toBe('etag-0');
      expect(savedData!.chunks![0].hash).toBe('hash-0');
    });

    it('应该处理无分片的任务', () => {
      const task = createMockTask('task-2', { chunks: [] });

      persistence.saveTaskProgress(task);

      const savedData = cacheData.get('progress_task-2');
      expect(savedData!.chunks).toEqual([]);
    });

    it('应该处理无 chunks 属性的任务', () => {
      const task: FileTask = {
        id: 'task-3',
        file: new File(['content'], 'test.txt', { type: 'text/plain' }),
        status: UploadStatus.PAUSED,
        progress: 30,
        speed: 0,
        chunks: undefined as unknown as ChunkInfo[],
        uploadedChunks: 0,
        totalChunks: 0,
        retryCount: 0,
        startTime: null,
        endTime: null,
        pausedTime: 0,
        resumeTime: 0,
        uploadedSize: 0,
        result: null,
        error: null,
        fileMD5: '',
        options: {}
      };

      persistence.saveTaskProgress(task);

      const savedData = cacheData.get('progress_task-3');
      expect(savedData!.chunks).toEqual([]);
    });
  });

  describe('restoreTaskProgress', () => {
    it('应该在缓存不存在时直接返回', () => {
      const task = createMockTask('no-cache-task');

      persistence.restoreTaskProgress(task);

      // 任务属性不应被修改
      expect(task.uploadedChunks).toBe(1);
      expect(task.progress).toBe(50);
      expect(task.uploadedSize).toBe(1024);
    });

    it('应该在文件名不匹配时忽略缓存', () => {
      const task = createMockTask('task-mismatch');
      // 缓存不同文件名
      cacheData.set('progress_task-mismatch', {
        taskId: 'task-mismatch',
        fileName: 'different.txt',
        fileSize: task.file.size,
        uploadedChunks: 2,
        progress: 100,
        uploadedSize: 2048
      });

      persistence.restoreTaskProgress(task);

      // 不应恢复不匹配的数据
      expect(task.uploadedChunks).toBe(1);
      expect(task.progress).toBe(50);
    });

    it('应该在文件大小不匹配时忽略缓存', () => {
      const task = createMockTask('task-size-mismatch');
      cacheData.set('progress_task-size-mismatch', {
        taskId: 'task-size-mismatch',
        fileName: 'test.txt',
        fileSize: 99999, // 不同大小
        uploadedChunks: 2,
        progress: 100,
        uploadedSize: 2048
      });

      persistence.restoreTaskProgress(task);

      expect(task.uploadedChunks).toBe(1);
      expect(task.progress).toBe(50);
    });

    it('应该在匹配时恢复进度数据', () => {
      const task = createMockTask('task-restore');
      // 保存缓存数据
      cacheData.set('progress_task-restore', {
        taskId: 'task-restore',
        fileName: 'test.txt',
        fileSize: task.file.size,
        uploadedChunks: 2,
        totalChunks: 2,
        uploadedSize: 2048,
        progress: 100,
        status: UploadStatus.PAUSED,
        pausedTime: 2000,
        chunks: [
          {
            index: 0,
            start: 0,
            end: 1024,
            size: 1024,
            status: ChunkStatus.SUCCESS,
            etag: 'etag-0',
            hash: 'hash-0'
          },
          {
            index: 1,
            start: 1024,
            end: 2048,
            size: 1024,
            status: ChunkStatus.SUCCESS,
            etag: 'etag-1',
            hash: 'hash-1'
          }
        ]
      });

      persistence.restoreTaskProgress(task);

      expect(task.uploadedChunks).toBe(2);
      expect(task.uploadedSize).toBe(2048);
      expect(task.progress).toBe(100);
    });

    it('应该恢复匹配的分片状态', () => {
      const task = createMockTask('task-chunks');
      cacheData.set('progress_task-chunks', {
        taskId: 'task-chunks',
        fileName: 'test.txt',
        fileSize: task.file.size,
        uploadedChunks: 1,
        progress: 50,
        chunks: [
          {
            index: 0,
            start: 0,
            end: 1024,
            size: 1024,
            status: ChunkStatus.SUCCESS,
            etag: 'etag-0',
            hash: 'hash-0'
          },
          { index: 1, start: 1024, end: 2048, size: 1024, status: ChunkStatus.UPLOADING }
        ]
      });

      persistence.restoreTaskProgress(task);

      expect(task.chunks![0].status).toBe(ChunkStatus.SUCCESS);
      expect(task.chunks![0].etag).toBe('etag-0');
      expect(task.chunks![0].hash).toBe('hash-0');
    });

    it('应该忽略范围不匹配的分片缓存', () => {
      const task = createMockTask('task-range-mismatch');
      cacheData.set('progress_task-range-mismatch', {
        taskId: 'task-range-mismatch',
        fileName: 'test.txt',
        fileSize: task.file.size,
        uploadedChunks: 1,
        progress: 50,
        chunks: [
          // 分片范围不匹配：缓存中 start/end 与当前不同
          { index: 0, start: 100, end: 200, size: 100, status: ChunkStatus.SUCCESS }
        ]
      });

      persistence.restoreTaskProgress(task);

      // 分片 0 的范围不匹配，不应恢复其状态
      expect(task.chunks![0].status).toBe(ChunkStatus.SUCCESS); // 原始状态保持不变
    });

    it('应该处理缓存中缺少 chunks 字段的情况', () => {
      const task = createMockTask('task-no-chunks-cache');
      cacheData.set('progress_task-no-chunks-cache', {
        taskId: 'task-no-chunks-cache',
        fileName: 'test.txt',
        fileSize: task.file.size,
        uploadedChunks: 2,
        progress: 100,
        uploadedSize: 2048
        // 无 chunks 字段
      });

      persistence.restoreTaskProgress(task);

      expect(task.uploadedChunks).toBe(2);
      expect(task.uploadedSize).toBe(2048);
      expect(task.progress).toBe(100);
    });

    it('应该处理缓存数据缺少可选字段的情况', () => {
      const task = createMockTask('task-partial-cache');
      cacheData.set('progress_task-partial-cache', {
        taskId: 'task-partial-cache',
        fileName: 'test.txt',
        fileSize: task.file.size
        // 缺少 uploadedChunks, progress, uploadedSize
      });

      persistence.restoreTaskProgress(task);

      expect(task.uploadedChunks).toBe(0); // 默认值 0
      expect(task.uploadedSize).toBe(0); // 默认值 0
      expect(task.progress).toBe(0); // 默认值 0
    });
  });

  describe('clearTaskProgress', () => {
    it('应该清除指定任务的进度缓存', () => {
      persistence.clearTaskProgress('task-1');

      expect(cacheManager.delete).toHaveBeenCalledWith('progress_task-1');
    });

    it('应该使用正确的 key 格式', () => {
      persistence.clearTaskProgress('my-task-id');

      expect(cacheManager.delete).toHaveBeenCalledWith('progress_my-task-id');
    });
  });

  describe('save 和 restore 配合', () => {
    it('应该能保存后恢复完整的进度数据', () => {
      const task = createMockTask('full-cycle');

      // 保存
      persistence.saveTaskProgress(task);

      // 模拟新任务（重置进度）
      const newTask = createMockTask('full-cycle', {
        uploadedChunks: 0,
        uploadedSize: 0,
        progress: 0
      });

      // 恢复
      persistence.restoreTaskProgress(newTask);

      expect(newTask.uploadedChunks).toBe(1);
      expect(newTask.uploadedSize).toBe(1024);
      expect(newTask.progress).toBe(50);
    });
  });
});
