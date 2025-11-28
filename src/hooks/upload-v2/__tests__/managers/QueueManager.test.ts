/**
 * QueueManager 测试
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { QueueManager } from '../../managers/QueueManager';
import type { FileTask } from '../../types';
import { UploadStatus } from '../../types';

describe('QueueManager', () => {
  let manager: QueueManager;

  beforeEach(() => {
    manager = new QueueManager();
  });

  describe('sort', () => {
    it('应该按优先级排序', () => {
      const tasks: FileTask[] = [
        {
          id: '1',
          file: new File(['content'], 'low.txt', { type: 'text/plain' }),
          originalFile: undefined,
          status: UploadStatus.PENDING,
          progress: 0,
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
          options: { priority: 'low' }
        },
        {
          id: '2',
          file: new File(['content'], 'high.txt', { type: 'text/plain' }),
          originalFile: undefined,
          status: UploadStatus.PENDING,
          progress: 0,
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
          options: { priority: 'high' }
        }
      ];

      manager.sort(tasks);
      expect(tasks[0].options.priority).toBe('high');
      expect(tasks[1].options.priority).toBe('low');
    });

    it('应该按文件大小排序（相同优先级）', () => {
      const tasks: FileTask[] = [
        {
          id: '1',
          file: new File(['x'.repeat(2000)], 'large.txt', { type: 'text/plain' }),
          originalFile: undefined,
          status: UploadStatus.PENDING,
          progress: 0,
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
          options: { priority: 'normal' }
        },
        {
          id: '2',
          file: new File(['x'.repeat(1000)], 'small.txt', { type: 'text/plain' }),
          originalFile: undefined,
          status: UploadStatus.PENDING,
          progress: 0,
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
          options: { priority: 'normal' }
        }
      ];

      manager.sort(tasks);
      expect(tasks[0].file.size).toBeLessThan(tasks[1].file.size);
    });
  });

  describe('isDuplicate', () => {
    it('应该检测重复文件', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const tasks: FileTask[] = [
        {
          id: '1',
          file,
          originalFile: undefined,
          status: UploadStatus.PENDING,
          progress: 0,
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
        }
      ];

      expect(manager.isDuplicate(file, tasks)).toBe(true);
      expect(manager.isDuplicate(new File(['other'], 'other.txt', { type: 'text/plain' }), tasks)).toBe(false);
    });
  });
});

