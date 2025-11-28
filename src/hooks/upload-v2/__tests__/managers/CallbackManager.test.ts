/**
 * CallbackManager 测试
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { CallbackManager } from '../../managers/CallbackManager';
import type { FileTask } from '../../types';
import { UploadStatus } from '../../types';

describe('CallbackManager', () => {
  let manager: CallbackManager;

  beforeEach(() => {
    manager = new CallbackManager();
  });

  describe('链式调用', () => {
    it('应该支持链式调用设置回调', () => {
      const result = manager
        .onFileStart(() => {})
        .onFileProgress(() => {})
        .onFileSuccess(() => {});
      expect(result).toBe(manager);
    });
  });

  describe('emit', () => {
    it('应该触发回调', async () => {
      const callback = vi.fn();
      manager.onFileStart(callback);

      const task: FileTask = {
        id: '1',
        file: new File(['content'], 'test.txt', { type: 'text/plain' }),
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
      };

      await manager.emit('onFileStart', task);
      expect(callback).toHaveBeenCalledWith(task);
    });

    it('应该处理未设置的回调', async () => {
      await expect(manager.emit('onFileStart', {} as FileTask)).resolves.not.toThrow();
    });
  });

  describe('getCallbacks', () => {
    it('应该返回所有回调的副本', () => {
      manager.onFileStart(() => {});
      const callbacks = manager.getCallbacks();
      expect(callbacks).toHaveProperty('onFileStart');
      expect(callbacks).not.toBe(manager.getCallbacks());
    });
  });
});

