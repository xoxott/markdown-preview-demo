/** TaskOperations 测试 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskOperations } from '../../managers/TaskOperations';
import type { UploadConfig, FileTask } from '../../types';
import { ChunkStatus, UploadStatus } from '../../types';
import type { UploadController } from '../../controllers/UploadController';
import type { CallbackManager } from '../../managers/CallbackManager';
import type { ProgressPersistence } from '../../managers/ProgressPersistence';
import type { TaskStateManager } from '../../managers/TaskStateManager';
import type { QueueManager } from '../../managers/QueueManager';
import type { ProgressManager } from '../../managers/ProgressManager';

describe('TaskOperations', () => {
  let operations: TaskOperations;
  let config: UploadConfig;
  let uploadController: UploadController;
  let callbackManager: CallbackManager;
  let progressPersistence: ProgressPersistence;
  let taskStateManager: TaskStateManager;
  let queueManager: QueueManager;
  let progressManager: ProgressManager;

  const defaultConfig: UploadConfig = {
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
    enableNetworkAdaptation: false,
    compressionQuality: 0.8,
    previewMaxWidth: 200,
    previewMaxHeight: 200
  };

  const createMockTask = (
    id: string,
    status: UploadStatus,
    options?: Partial<FileTask>
  ): FileTask => ({
    id,
    file: new File(['content'], `${id}.txt`, { type: 'text/plain' }),
    status,
    progress: 50,
    speed: 100,
    chunks: [
      {
        index: 0,
        start: 0,
        end: 1024,
        size: 1024,
        blob: null,
        status: ChunkStatus.SUCCESS,
        retryCount: 0
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
    startTime: Date.now() - 5000,
    endTime: null,
    pausedTime: 0,
    resumeTime: 0,
    uploadedSize: 1024,
    result: null,
    error: null,
    fileMD5: '',
    options: { priority: 'normal' },
    ...options
  });

  beforeEach(() => {
    config = { ...defaultConfig };

    uploadController = {
      pause: vi.fn(),
      resume: vi.fn(),
      resumeAll: vi.fn(),
      cancel: vi.fn(),
      cancelAll: vi.fn(),
      isPaused: { value: false }
    } as unknown as UploadController;

    callbackManager = {
      emit: vi.fn()
    } as unknown as CallbackManager;

    progressPersistence = {
      saveTaskProgress: vi.fn(),
      restoreTaskProgress: vi.fn(),
      clearTaskProgress: vi.fn()
    } as unknown as ProgressPersistence;

    taskStateManager = {
      uploadQueue: { value: [] },
      activeUploads: { value: new Map<string, FileTask>() },
      completedUploads: { value: [] },
      getTask: vi.fn(),
      getAllTasks: vi.fn().mockReturnValue([]),
      removeFile: vi.fn(),
      clear: vi.fn(),
      addToQueue: vi.fn(),
      addToActive: vi.fn()
    } as unknown as TaskStateManager;

    queueManager = {
      sort: vi.fn()
    } as unknown as QueueManager;

    progressManager = {
      getAverageSpeed: vi.fn().mockReturnValue(0)
    } as unknown as ProgressManager;

    operations = new TaskOperations(
      config,
      uploadController,
      callbackManager,
      progressPersistence,
      taskStateManager,
      queueManager,
      progressManager
    );
  });

  describe('pause', () => {
    it('应该在任务不存在时直接返回', () => {
      taskStateManager.getTask = vi.fn().mockReturnValue(undefined);

      operations.pause('nonexistent', () => true);

      expect(uploadController.pause).not.toHaveBeenCalled();
    });

    it('应该暂停正在上传的任务', () => {
      const task = createMockTask('task-1', UploadStatus.UPLOADING);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.pause('task-1', () => true);

      expect(uploadController.pause).toHaveBeenCalledWith('task-1');
      expect(task.status).toBe(UploadStatus.PAUSED);
      expect(task.pausedTime).toBeGreaterThan(0);
      expect(callbackManager.emit).toHaveBeenCalledWith('onFilePause', task);
    });

    it('应该在暂停时更新已上传分片数', () => {
      const task = createMockTask('task-1', UploadStatus.UPLOADING, {
        chunks: [
          {
            index: 0,
            start: 0,
            end: 1024,
            size: 1024,
            blob: null,
            status: ChunkStatus.SUCCESS,
            retryCount: 0
          },
          {
            index: 1,
            start: 1024,
            end: 2048,
            size: 1024,
            blob: null,
            status: ChunkStatus.SUCCESS,
            retryCount: 0
          },
          {
            index: 2,
            start: 2048,
            end: 3072,
            size: 1024,
            blob: null,
            status: ChunkStatus.UPLOADING,
            retryCount: 0
          }
        ],
        totalChunks: 3
      });
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.pause('task-1', () => true);

      expect(task.uploadedChunks).toBe(2); // 只有 SUCCESS 的分片计入
      expect(task.progress).toBe(Math.round((2 / 3) * 100)); // 67%
    });

    it('应该在启用断点续传和缓存时保存进度', () => {
      config.enableResume = true;
      config.enableCache = true;
      const task = createMockTask('task-1', UploadStatus.UPLOADING);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.pause('task-1', () => true);

      expect(progressPersistence.saveTaskProgress).toHaveBeenCalledWith(task);
    });

    it('应该在未启用断点续传或缓存时不保存进度', () => {
      config.enableResume = false;
      const task = createMockTask('task-1', UploadStatus.UPLOADING);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.pause('task-1', () => true);

      expect(progressPersistence.saveTaskProgress).not.toHaveBeenCalled();
    });

    it('应该对非 UPLOADING 状态的任务不更新状态', () => {
      const task = createMockTask('task-1', UploadStatus.PENDING);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.pause('task-1', () => true);

      // controller 的 pause 会被调用，但任务状态不会变为 PAUSED
      expect(uploadController.pause).toHaveBeenCalledWith('task-1');
      expect(task.status).toBe(UploadStatus.PENDING); // 状态不变
      expect(callbackManager.emit).not.toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('应该在任务不存在时直接返回', () => {
      taskStateManager.getTask = vi.fn().mockReturnValue(undefined);

      operations.resume('nonexistent', () => false, vi.fn());

      expect(uploadController.resume).not.toHaveBeenCalled();
    });

    it('应该在任务非 PAUSED 状态时直接返回', () => {
      const task = createMockTask('task-1', UploadStatus.UPLOADING);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.resume('task-1', () => false, vi.fn());

      expect(uploadController.resume).not.toHaveBeenCalled();
    });

    it('应该恢复暂停的任务', () => {
      const task = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);
      taskStateManager.uploadQueue.value = [];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      const startUpload = vi.fn();

      operations.resume('task-1', () => false, startUpload);

      expect(uploadController.resume).toHaveBeenCalledWith('task-1');
      expect(task.status).toBe(UploadStatus.PENDING);
      expect(task.pausedTime).toBe(0);
      expect(callbackManager.emit).toHaveBeenCalledWith('onFileResume', task);
    });

    it('应该在启用断点续传时恢复进度', () => {
      config.enableResume = true;
      config.enableCache = true;
      const task = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.resume('task-1', () => false, vi.fn());

      expect(progressPersistence.restoreTaskProgress).toHaveBeenCalledWith(task);
    });

    it('应该从已完成列表中移除恢复的任务', () => {
      const task = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);
      taskStateManager.completedUploads.value = [task];
      taskStateManager.uploadQueue.value = [];
      taskStateManager.activeUploads.value = new Map();

      operations.resume('task-1', () => false, vi.fn());

      expect(taskStateManager.completedUploads.value).toHaveLength(0);
    });

    it('应该在未上传时调用 startUpload', () => {
      const task = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);
      taskStateManager.uploadQueue.value = [];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      const startUpload = vi.fn();
      const isUploading = vi.fn().mockReturnValue(false);

      operations.resume('task-1', isUploading, startUpload);

      expect(startUpload).toHaveBeenCalled();
    });

    it('应该在上传中时不调用 startUpload', () => {
      const task = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);
      taskStateManager.uploadQueue.value = [];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      const startUpload = vi.fn();
      const isUploading = vi.fn().mockReturnValue(true);

      operations.resume('task-1', isUploading, startUpload);

      expect(startUpload).not.toHaveBeenCalled();
    });

    it('应该将恢复的任务添加到队列（如果不在队列和活动中）', () => {
      const task = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);
      taskStateManager.uploadQueue.value = [];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      operations.resume('task-1', () => false, vi.fn());

      expect(taskStateManager.uploadQueue.value[0]).toBe(task);
    });

    it('不应该重复添加已在队列中的任务', () => {
      const task = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);
      taskStateManager.uploadQueue.value = [task];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      operations.resume('task-1', () => false, vi.fn());

      // 不应重复添加
      expect(taskStateManager.uploadQueue.value.length).toBe(1);
    });
  });

  describe('pauseAll', () => {
    it('应该暂停所有上传中和待上传的任务', () => {
      const uploadingTask = createMockTask('task-1', UploadStatus.UPLOADING);
      const pendingTask = createMockTask('task-2', UploadStatus.PENDING);
      const completedTask = createMockTask('task-3', UploadStatus.SUCCESS);

      taskStateManager.uploadQueue.value = [pendingTask, completedTask];
      taskStateManager.activeUploads.value = new Map([['task-1', uploadingTask]]);
      taskStateManager.completedUploads.value = [completedTask];

      operations.pauseAll();

      expect(uploadController.isPaused.value).toBe(true);
      // 应为上传中和待上传的任务调用 pause
      expect(uploadController.pause).toHaveBeenCalledWith('task-1');
      expect(uploadController.pause).toHaveBeenCalledWith('task-2');
      expect(uploadController.pause).not.toHaveBeenCalledWith('task-3');
    });

    it('应该在启用断点续传时保存所有暂停任务的进度', () => {
      config.enableResume = true;
      config.enableCache = true;
      const uploadingTask = createMockTask('task-1', UploadStatus.UPLOADING);
      const pendingTask = createMockTask('task-2', UploadStatus.PENDING);

      taskStateManager.uploadQueue.value = [pendingTask];
      taskStateManager.activeUploads.value = new Map([['task-1', uploadingTask]]);
      taskStateManager.completedUploads.value = [];

      operations.pauseAll();

      expect(progressPersistence.saveTaskProgress).toHaveBeenCalledTimes(2);
    });

    it('应该为每个暂停的任务触发 onFilePause 回调', () => {
      const uploadingTask = createMockTask('task-1', UploadStatus.UPLOADING);
      const pendingTask = createMockTask('task-2', UploadStatus.PENDING);

      taskStateManager.uploadQueue.value = [pendingTask];
      taskStateManager.activeUploads.value = new Map([['task-1', uploadingTask]]);
      taskStateManager.completedUploads.value = [];

      operations.pauseAll();

      expect(callbackManager.emit).toHaveBeenCalledWith('onFilePause', uploadingTask);
      expect(callbackManager.emit).toHaveBeenCalledWith('onFilePause', pendingTask);
    });
  });

  describe('resumeAll', () => {
    it('应该在无暂停任务时直接返回', () => {
      taskStateManager.uploadQueue.value = [];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      operations.resumeAll(() => false, vi.fn());

      expect(uploadController.resumeAll).not.toHaveBeenCalled();
    });

    it('应该恢复所有暂停的任务', () => {
      const pausedTask1 = createMockTask('task-1', UploadStatus.PAUSED);
      const pausedTask2 = createMockTask('task-2', UploadStatus.PAUSED);
      const completedTask = createMockTask('task-3', UploadStatus.SUCCESS);

      taskStateManager.uploadQueue.value = [pausedTask1];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [pausedTask2, completedTask];

      operations.resumeAll(() => false, vi.fn());

      expect(uploadController.resume).toHaveBeenCalledWith('task-1');
      expect(uploadController.resume).toHaveBeenCalledWith('task-2');
      expect(uploadController.resumeAll).toHaveBeenCalled();
      expect(callbackManager.emit).toHaveBeenCalledWith('onFileResume', pausedTask1);
      expect(callbackManager.emit).toHaveBeenCalledWith('onFileResume', pausedTask2);
    });

    it('应该在启用断点续传时恢复进度', () => {
      config.enableResume = true;
      config.enableCache = true;
      const pausedTask = createMockTask('task-1', UploadStatus.PAUSED);

      taskStateManager.uploadQueue.value = [pausedTask];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      operations.resumeAll(() => false, vi.fn());

      expect(progressPersistence.restoreTaskProgress).toHaveBeenCalledWith(pausedTask);
    });

    it('应该在未上传时调用 startUpload', () => {
      const pausedTask = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.uploadQueue.value = [pausedTask];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      const startUpload = vi.fn();
      operations.resumeAll(() => false, startUpload);

      expect(startUpload).toHaveBeenCalled();
    });

    it('应该排序队列', () => {
      const pausedTask = createMockTask('task-1', UploadStatus.PAUSED);
      taskStateManager.uploadQueue.value = [pausedTask];
      taskStateManager.activeUploads.value = new Map();
      taskStateManager.completedUploads.value = [];

      operations.resumeAll(() => false, vi.fn());

      expect(queueManager.sort).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('应该在任务不存在时直接返回', () => {
      taskStateManager.getTask = vi.fn().mockReturnValue(undefined);

      operations.cancel('nonexistent');

      expect(uploadController.cancel).not.toHaveBeenCalled();
    });

    it('应该取消任务', () => {
      const task = createMockTask('task-1', UploadStatus.UPLOADING);
      taskStateManager.getTask = vi.fn().mockReturnValue(task);

      operations.cancel('task-1');

      expect(uploadController.cancel).toHaveBeenCalledWith('task-1');
      expect(task.status).toBe(UploadStatus.CANCELLED);
      expect(task.endTime).toBeGreaterThan(0);
      expect(taskStateManager.removeFile).toHaveBeenCalledWith('task-1');
      expect(callbackManager.emit).toHaveBeenCalledWith('onFileCancel', task);
    });
  });

  describe('cancelAll', () => {
    it('应该取消所有任务', () => {
      const allTasks = [
        createMockTask('task-1', UploadStatus.UPLOADING),
        createMockTask('task-2', UploadStatus.PENDING)
      ];
      taskStateManager.getAllTasks = vi.fn().mockReturnValue(allTasks);

      operations.cancelAll();

      expect(uploadController.cancelAll).toHaveBeenCalled();
      // 所有任务状态应变为 CANCELLED
      expect(allTasks[0].status).toBe(UploadStatus.CANCELLED);
      expect(allTasks[1].status).toBe(UploadStatus.CANCELLED);
      expect(taskStateManager.clear).toHaveBeenCalled();
    });
  });

  describe('retrySingleFile', () => {
    it('应该在任务不存在或非 ERROR 状态时直接返回', () => {
      const successTask = createMockTask('task-1', UploadStatus.SUCCESS);
      taskStateManager.completedUploads.value = [successTask];

      operations.retrySingleFile('task-1', () => false, vi.fn());

      expect(queueManager.sort).not.toHaveBeenCalled();
    });

    it('应该在任务 ID 不匹配时直接返回', () => {
      const errorTask = createMockTask('task-1', UploadStatus.ERROR);
      taskStateManager.completedUploads.value = [errorTask];

      operations.retrySingleFile('nonexistent', () => false, vi.fn());

      expect(taskStateManager.completedUploads.value.length).toBe(1);
    });

    it('应该重试失败的任务', () => {
      const errorTask = createMockTask('task-1', UploadStatus.ERROR);
      taskStateManager.completedUploads.value = [errorTask];
      taskStateManager.uploadQueue.value = [];

      const startUpload = vi.fn();

      operations.retrySingleFile('task-1', () => false, startUpload);

      // 任务应从已完成列表中移除
      expect(taskStateManager.completedUploads.value).toHaveLength(0);
      // 任务应被添加到队列
      expect(taskStateManager.uploadQueue.value).toContain(errorTask);
      // 任务状态应为 PENDING
      expect(errorTask.status).toBe(UploadStatus.PENDING);
      expect(errorTask.options.priority).toBe('high');
      expect(queueManager.sort).toHaveBeenCalled();
    });

    it('应该在未上传时调用 startUpload', () => {
      const errorTask = createMockTask('task-1', UploadStatus.ERROR);
      taskStateManager.completedUploads.value = [errorTask];
      taskStateManager.uploadQueue.value = [];

      const startUpload = vi.fn();
      operations.retrySingleFile('task-1', () => false, startUpload);

      expect(startUpload).toHaveBeenCalled();
    });

    it('应该在上传中时不调用 startUpload', () => {
      const errorTask = createMockTask('task-1', UploadStatus.ERROR);
      taskStateManager.completedUploads.value = [errorTask];
      taskStateManager.uploadQueue.value = [];

      const startUpload = vi.fn();
      operations.retrySingleFile('task-1', () => true, startUpload);

      expect(startUpload).not.toHaveBeenCalled();
    });

    it('应该重置分片状态（当启用网络自适应时）', () => {
      config.enableNetworkAdaptation = true;
      const errorTask = createMockTask('task-1', UploadStatus.ERROR, {
        chunks: [
          {
            index: 0,
            start: 0,
            end: 1024,
            size: 1024,
            blob: null,
            status: ChunkStatus.ERROR,
            retryCount: 2
          }
        ]
      });
      taskStateManager.completedUploads.value = [errorTask];
      taskStateManager.uploadQueue.value = [];

      operations.retrySingleFile('task-1', () => false, vi.fn());

      // 分片应被重置为 PENDING（非 SUCCESS 且 enableResume=true）
      expect(errorTask.chunks![0].status).toBe(ChunkStatus.PENDING);
    });
  });

  describe('retryFailed', () => {
    it('应该在无失败任务时直接返回', () => {
      taskStateManager.completedUploads.value = [];

      operations.retryFailed(() => false, vi.fn());

      expect(queueManager.sort).not.toHaveBeenCalled();
    });

    it('应该重试所有失败的任务', () => {
      const errorTask1 = createMockTask('task-1', UploadStatus.ERROR);
      const errorTask2 = createMockTask('task-2', UploadStatus.ERROR);
      const successTask = createMockTask('task-3', UploadStatus.SUCCESS);

      taskStateManager.completedUploads.value = [errorTask1, errorTask2, successTask];
      taskStateManager.uploadQueue.value = [];

      operations.retryFailed(() => false, vi.fn());

      // 失败的任务应被添加到队列
      expect(taskStateManager.uploadQueue.value).toContain(errorTask1);
      expect(taskStateManager.uploadQueue.value).toContain(errorTask2);
      // 失败任务状态应为 PENDING
      expect(errorTask1.status).toBe(UploadStatus.PENDING);
      expect(errorTask2.status).toBe(UploadStatus.PENDING);
      expect(queueManager.sort).toHaveBeenCalled();
    });

    it('应该从已完成列表中过滤掉重试的任务', () => {
      const errorTask = createMockTask('task-1', UploadStatus.ERROR);
      const successTask = createMockTask('task-2', UploadStatus.SUCCESS);

      taskStateManager.completedUploads.value = [errorTask, successTask];
      taskStateManager.uploadQueue.value = [];

      operations.retryFailed(() => false, vi.fn());

      // 只有非 PENDING 状态的任务保留在 completedUploads
      expect(taskStateManager.completedUploads.value).not.toContain(errorTask);
      expect(taskStateManager.completedUploads.value).toContain(successTask);
    });

    it('应该在未上传且有任务时调用 startUpload', () => {
      const errorTask = createMockTask('task-1', UploadStatus.ERROR);
      taskStateManager.completedUploads.value = [errorTask];
      taskStateManager.uploadQueue.value = [];

      const startUpload = vi.fn();
      operations.retryFailed(() => false, startUpload);

      expect(startUpload).toHaveBeenCalled();
    });

    it('应该在上传中时不调用 startUpload', () => {
      const errorTask = createMockTask('task-1', UploadStatus.ERROR);
      taskStateManager.completedUploads.value = [errorTask];
      taskStateManager.uploadQueue.value = [];

      const startUpload = vi.fn();
      operations.retryFailed(() => true, startUpload);

      expect(startUpload).not.toHaveBeenCalled();
    });
  });
});
