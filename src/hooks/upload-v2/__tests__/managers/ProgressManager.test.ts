/**
 * ProgressManager 测试
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { ProgressManager } from '../../managers/ProgressManager';
import type { FileTask, ChunkInfo } from '../../types';
import { ChunkStatus, UploadStatus } from '../../types';

describe('ProgressManager', () => {
  let manager: ProgressManager;

  beforeEach(() => {
    manager = new ProgressManager();
  });

  describe('updateFileProgress', () => {
    it('应该更新文件进度', () => {
      const task: FileTask = {
        id: '1',
        file: new File(['content'], 'test.txt', { type: 'text/plain' }),
        originalFile: undefined,
        status: UploadStatus.UPLOADING,
        progress: 0,
        speed: 0,
        chunks: [],
        uploadedChunks: 2,
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
        options: {}
      };

      manager.updateFileProgress(task);
      expect(task.progress).toBe(50);
    });
  });

  describe('updateChunkProgress', () => {
    it('应该更新分片进度', () => {
      const chunk: ChunkInfo = {
        index: 0,
        start: 0,
        end: 1024,
        size: 1024,
        blob: new Blob(['content']),
        status: ChunkStatus.SUCCESS,
        retryCount: 0,
        hash: undefined
      };

      manager.updateChunkProgress(chunk, 1024, 100);
      expect(manager.uploadSpeed.value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateTotalProgress', () => {
    it('应该更新总进度', () => {
      const tasks: FileTask[] = [
        {
          id: '1',
          file: new File(['content'], 'test1.txt', { type: 'text/plain' }),
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
        },
        {
          id: '2',
          file: new File(['content'], 'test2.txt', { type: 'text/plain' }),
          originalFile: undefined,
          status: UploadStatus.UPLOADING,
          progress: 100,
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

      manager.updateTotalProgress(tasks);
      expect(manager.totalProgress.value).toBe(75);
    });

    it('应该处理空任务列表', () => {
      manager.updateTotalProgress([]);
      expect(manager.totalProgress.value).toBe(0);
    });
  });

  describe('calculateStats', () => {
    it('应该计算统计信息', () => {
      const uploadQueue: FileTask[] = [];
      const activeUploads = new Map<string, FileTask>();
      const completedUploads: FileTask[] = [
        {
          id: '1',
          file: new File(['content'], 'test.txt', { type: 'text/plain' }),
          originalFile: undefined,
          status: UploadStatus.SUCCESS,
          progress: 100,
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

      const stats = manager.calculateStats(uploadQueue, activeUploads, completedUploads);
      expect(stats.completed).toBe(1);
      expect(stats.total).toBe(1);
    });
  });

  describe('reset', () => {
    it('应该重置进度管理器', () => {
      manager.totalProgress.value = 50;
      manager.uploadSpeed.value = 100;
      manager.reset();
      expect(manager.totalProgress.value).toBe(0);
      expect(manager.uploadSpeed.value).toBe(0);
    });
  });
});

