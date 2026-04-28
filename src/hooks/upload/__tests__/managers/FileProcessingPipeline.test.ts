/** FileProcessingPipeline 测试 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileProcessingPipeline } from '../../managers/FileProcessingPipeline';
import type { FileService } from '../../services/FileService';
import type { TaskService } from '../../services/TaskService';
import type { ProgressManager } from '../../managers/ProgressManager';
import type { TaskStateManager } from '../../managers/TaskStateManager';
import type { QueueManager } from '../../managers/QueueManager';
import type { FileTask, FileUploadOptions } from '../../types';
import { UploadStatus } from '../../types';

describe('FileProcessingPipeline', () => {
  let pipeline: FileProcessingPipeline;
  let fileService: FileService;
  let taskService: TaskService;
  let progressManager: ProgressManager;
  let taskStateManager: TaskStateManager;
  let queueManager: QueueManager;

  beforeEach(() => {
    fileService = {
      validate: vi.fn(),
      processFile: vi.fn(),
      compressFile: vi.fn(),
      generatePreview: vi.fn(),
      calculateMD5: vi.fn()
    } as unknown as FileService;

    taskService = {
      createTask: vi.fn(),
      isDuplicate: vi.fn()
    } as unknown as TaskService;

    progressManager = {
      getAverageSpeed: vi.fn().mockReturnValue(0)
    } as unknown as ProgressManager;

    taskStateManager = {
      uploadQueue: { value: [] },
      activeUploads: { value: new Map<string, FileTask>() },
      completedUploads: { value: [] },
      getAllTasks: vi.fn().mockReturnValue([]),
      addToQueue: vi.fn()
    } as unknown as TaskStateManager;

    queueManager = {
      sort: vi.fn(),
      isDuplicate: vi.fn().mockReturnValue(false)
    } as unknown as QueueManager;

    pipeline = new FileProcessingPipeline(
      fileService,
      taskService,
      progressManager,
      taskStateManager,
      queueManager
    );
  });

  describe('normalizeFiles', () => {
    it('应该将单个 File 转为数组', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = pipeline.normalizeFiles(file);
      expect(result).toEqual([file]);
    });

    it('应该将 FileList 转为数组', () => {
      // 模拟 FileList（在 vitest/happy-dom 中无法直接构造 FileList）
      const file1 = new File(['a'], 'a.txt', { type: 'text/plain' });
      const file2 = new File(['b'], 'b.txt', { type: 'text/plain' });
      // 使用 DataTransfer 模拟 FileList
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file1);
      dataTransfer.items.add(file2);
      const fileList = dataTransfer.files;
      const result = pipeline.normalizeFiles(fileList);
      expect(result).toHaveLength(2);
    });

    it('应该直接返回数组', () => {
      const files = [
        new File(['a'], 'a.txt', { type: 'text/plain' }),
        new File(['b'], 'b.txt', { type: 'text/plain' })
      ];
      const result = pipeline.normalizeFiles(files);
      expect(result).toEqual(files);
    });

    it('应该对不支持的类型抛出错误', () => {
      expect(() => pipeline.normalizeFiles('invalid' as unknown as File[])).toThrow(
        '不支持的文件类型'
      );
      expect(() => pipeline.normalizeFiles(123 as unknown as File[])).toThrow('不支持的文件类型');
    });
  });

  describe('processFiles', () => {
    const defaultOptions: FileUploadOptions = { priority: 'normal' };
    const createMockTask = (id: string): FileTask => ({
      id,
      file: new File(['content'], `${id}.txt`, { type: 'text/plain' }),
      status: UploadStatus.PENDING,
      progress: 0,
      speed: 0,
      chunks: [],
      uploadedChunks: 0,
      totalChunks: 4,
      retryCount: 0,
      startTime: null,
      endTime: null,
      pausedTime: 0,
      resumeTime: 0,
      uploadedSize: 0,
      result: null,
      error: null,
      fileMD5: '',
      options: defaultOptions
    });

    it('应该在所有文件验证失败时直接返回', async () => {
      const files = [new File([''], 'empty.txt', { type: 'text/plain' })];
      fileService.validate = vi
        .fn()
        .mockReturnValue({ valid: [], errors: [{ file: files[0], reason: '文件为空' }] });
      queueManager.isDuplicate = vi.fn().mockReturnValue(false);

      await pipeline.processFiles(files, defaultOptions);

      expect(fileService.validate).toHaveBeenCalledWith(files, 0);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(taskStateManager.addToQueue).not.toHaveBeenCalled();
    });

    it('应该在无验证错误且无有效文件时直接返回', async () => {
      const files: File[] = [];
      fileService.validate = vi.fn().mockReturnValue({ valid: [], errors: [] });

      await pipeline.processFiles(files, defaultOptions);

      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('应该处理有效文件并添加到队列', async () => {
      const file1 = new File(['a'], 'a.txt', { type: 'text/plain' });
      const file2 = new File(['b'], 'b.txt', { type: 'text/plain' });
      const files = [file1, file2];
      const task1 = createMockTask('task-1');
      const task2 = createMockTask('task-2');

      fileService.validate = vi.fn().mockReturnValue({ valid: files, errors: [] });
      queueManager.isDuplicate = vi.fn().mockReturnValue(false);
      fileService.processFile = vi.fn().mockResolvedValue({
        file: file1,
        preview: undefined,
        md5: 'hash1'
      });
      taskService.createTask = vi.fn().mockReturnValueOnce(task1).mockReturnValueOnce(task2);
      progressManager.getAverageSpeed = vi.fn().mockReturnValue(1024); // 1024 KB/s

      await pipeline.processFiles(files, defaultOptions);

      expect(fileService.validate).toHaveBeenCalled();
      expect(queueManager.isDuplicate).toHaveBeenCalled();
      expect(fileService.processFile).toHaveBeenCalledTimes(2);
      expect(taskService.createTask).toHaveBeenCalledTimes(2);
      expect(taskStateManager.addToQueue).toHaveBeenCalledTimes(2);
      expect(queueManager.sort).toHaveBeenCalled();
    });

    it('应该跳过重复文件', async () => {
      const file1 = new File(['a'], 'a.txt', { type: 'text/plain' });
      const files = [file1];

      fileService.validate = vi.fn().mockReturnValue({ valid: files, errors: [] });
      queueManager.isDuplicate = vi.fn().mockReturnValue(true); // 标记为重复

      await pipeline.processFiles(files, defaultOptions);

      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(taskStateManager.addToQueue).not.toHaveBeenCalled();
    });

    it('应该处理文件处理失败的情况', async () => {
      const file1 = new File(['a'], 'a.txt', { type: 'text/plain' });
      const file2 = new File(['b'], 'b.txt', { type: 'text/plain' });
      const files = [file1, file2];
      const task2 = createMockTask('task-2');

      fileService.validate = vi.fn().mockReturnValue({ valid: files, errors: [] });
      queueManager.isDuplicate = vi.fn().mockReturnValue(false);
      // 第一个文件处理失败，第二个成功
      fileService.processFile = vi
        .fn()
        .mockRejectedValueOnce(new Error('处理失败'))
        .mockResolvedValueOnce({
          file: file2,
          preview: undefined,
          md5: 'hash2'
        });
      taskService.createTask = vi.fn().mockReturnValue(task2);

      await pipeline.processFiles(files, defaultOptions);

      // 只有成功的文件会被创建任务并添加到队列
      expect(taskStateManager.addToQueue).toHaveBeenCalledTimes(1);
      expect(queueManager.sort).toHaveBeenCalled();
    });

    it('应该计算已有任务数量（队列 + 活动上传）', async () => {
      const existingTask = createMockTask('existing');
      taskStateManager.uploadQueue.value = [existingTask];
      taskStateManager.activeUploads.value = new Map([['active-1', createMockTask('active-1')]]);

      const file = new File(['a'], 'a.txt', { type: 'text/plain' });
      const files = [file];

      fileService.validate = vi.fn().mockReturnValue({ valid: files, errors: [] });
      queueManager.isDuplicate = vi.fn().mockReturnValue(false);
      fileService.processFile = vi.fn().mockResolvedValue({
        file,
        preview: undefined,
        md5: 'hash'
      });
      taskService.createTask = vi.fn().mockReturnValue(createMockTask('new-task'));

      await pipeline.processFiles(files, defaultOptions);

      // existingCount = 1 (queue) + 1 (active) = 2
      expect(fileService.validate).toHaveBeenCalledWith(files, 2);
    });

    it('应该将平均速度（KB/s）传给 createTask', async () => {
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });
      const files = [file];
      const task = createMockTask('task-1');

      fileService.validate = vi.fn().mockReturnValue({ valid: files, errors: [] });
      queueManager.isDuplicate = vi.fn().mockReturnValue(false);
      fileService.processFile = vi.fn().mockResolvedValue({
        file,
        preview: undefined,
        md5: 'hash'
      });
      taskService.createTask = vi.fn().mockReturnValue(task);
      progressManager.getAverageSpeed = vi.fn().mockReturnValue(1024); // 1024 KB/s

      await pipeline.processFiles(files, defaultOptions);

      // getAverageSpeed() 已返回 KB/s，直接传入
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        defaultOptions,
        1024, // 1024 KB/s
        undefined,
        'hash'
      );
    });
  });
});
