/**
 * UploadController 测试
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { UploadController } from '../../controllers/UploadController';
import type { FileTask } from '../../types';
import { UploadStatus } from '../../types';

describe('UploadController', () => {
  let controller: UploadController;
  let mockTask: FileTask;

  beforeEach(() => {
    controller = new UploadController();
    mockTask = {
      id: 'test-id',
      file: new File(['content'], 'test.txt', { type: 'text/plain' }),
      originalFile: undefined,
      status: UploadStatus.UPLOADING,
      progress: 50,
      speed: 0,
      chunks: [],
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

    controller.setTaskGetter((taskId: string) => {
      return taskId === 'test-id' ? mockTask : undefined;
    });
  });

  describe('pause', () => {
    it('应该暂停任务', () => {
      controller.pause('test-id');
      expect(mockTask.status).toBe(UploadStatus.PAUSED);
      expect(controller.pausedTasks.has('test-id')).toBe(true);
    });

    it('应该忽略不存在的任务', () => {
      controller.pause('nonexistent');
      expect(controller.pausedTasks.has('nonexistent')).toBe(false);
    });
  });

  describe('resume', () => {
    it('应该恢复任务', () => {
      mockTask.status = UploadStatus.PAUSED;
      controller.pausedTasks.add('test-id');
      controller.resume('test-id');
      expect(mockTask.status).toBe(UploadStatus.PENDING);
      expect(controller.pausedTasks.has('test-id')).toBe(false);
    });
  });

  describe('cancel', () => {
    it('应该取消任务', () => {
      controller.cancel('test-id');
      expect(mockTask.status).toBe(UploadStatus.CANCELLED);
    });
  });

  describe('pauseAll', () => {
    it('应该暂停所有任务', () => {
      controller.pauseAll();
      expect(controller.isPaused.value).toBe(true);
    });
  });

  describe('resumeAll', () => {
    it('应该恢复所有任务', () => {
      // 设置任务状态为暂停
      const task = {
        id: 'test-id',
        file: new File(['content'], 'test.txt'),
        status: UploadStatus.PAUSED
      } as any;
      controller.setTaskGetter((id) => id === 'test-id' ? task : undefined);
      
      controller.isPaused.value = true;
      controller.pausedTasks.add('test-id');
      controller.resumeAll();
      expect(controller.isPaused.value).toBe(false);
      expect(controller.pausedTasks.has('test-id')).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('应该取消所有任务', () => {
      controller.createAbortController('test-id');
      controller.cancelAll();
      expect(controller.pausedTasks.size).toBe(0);
    });
  });

  describe('createAbortController', () => {
    it('应该创建 AbortController', () => {
      const abortController = controller.createAbortController('test-id');
      expect(abortController).toBeInstanceOf(AbortController);
    });
  });
});

