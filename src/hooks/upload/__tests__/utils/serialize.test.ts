/** serialize 工具测试 */
import { describe, expect, it } from 'vitest';
import {
  serializeBlob,
  serializeError,
  serializeFile,
  serializeMergeResponse,
  serializeTask
} from '../../utils/serialize';
import { UploadError } from '../../types/error';
import { ErrorType } from '../../utils/retry';
import { UploadStatus } from '../../types';

describe('serialize 工具', () => {
  describe('serializeError', () => {
    it('应该对 null/undefined 返回 null', () => {
      expect(serializeError(null)).toBeNull();
      expect(serializeError(undefined)).toBeNull();
    });

    it('应该序列化 plain Error 的 name, message, stack', () => {
      const error = new Error('test error');
      const result = serializeError(error);
      expect(result!.name).toBe('Error');
      expect(result!.message).toBe('test error');
      expect(result!.stack).toBeTruthy();
    });

    it('应该对 UploadError 使用 toJSON()', () => {
      const error = new UploadError('upload failed', ErrorType.NETWORK_ERROR);
      const result = serializeError(error);
      expect(result!.name).toBe('UploadError');
      expect(result!.errorType).toBe(ErrorType.NETWORK_ERROR);
    });
  });

  describe('serializeFile', () => {
    it('应该对 undefined 返回 undefined', () => {
      expect(serializeFile(undefined)).toBeUndefined();
    });

    it('应该提取 File 元数据', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = serializeFile(file);
      expect(result!.name).toBe('test.txt');
      expect(result!.size).toBe(7);
      expect(result!.type).toBe('text/plain');
      expect(result!.lastModified).toBeDefined();
    });
  });

  describe('serializeBlob', () => {
    it('应该对 null 返回 null', () => {
      expect(serializeBlob(null)).toBeNull();
    });

    it('应该提取 Blob 元数据', () => {
      const blob = new Blob(['data'], { type: 'text/plain' });
      const result = serializeBlob(blob);
      expect(result!.size).toBe(4);
      expect(result!.type).toBe('text/plain');
    });
  });

  describe('serializeTask', () => {
    it('应该产生可 JSON.stringify 的输出（无空对象）', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const task = {
        id: 'test-1',
        file,
        originalFile: undefined,
        status: UploadStatus.PENDING,
        progress: 50,
        speed: 1024,
        uploadedSize: 100,
        uploadedChunks: 1,
        totalChunks: 2,
        retryCount: 0,
        startTime: Date.now(),
        endTime: null,
        pausedTime: 0,
        resumeTime: 0,
        fileMD5: 'abc123',
        result: null,
        error: new Error('some error'),
        chunkErrors: [],
        options: { priority: 'normal' } as any,
        chunks: [
          {
            index: 0,
            start: 0,
            end: 100,
            size: 100,
            blob: new Blob(['x'], { type: 'text/plain' }),
            status: 'success',
            retryCount: 0,
            error: undefined,
            etag: 'etag-1',
            hash: undefined,
            result: undefined,
            uploadTime: 100
          }
        ]
      } as any;

      const serialized = serializeTask(task);
      const json = JSON.stringify(serialized);
      expect(json).toBeTruthy();

      // file 不应该是 '{}'
      const parsed = JSON.parse(json);
      expect(parsed.file.name).toBe('test.txt');
      expect(parsed.file.size).toBe(7);
      expect(JSON.stringify(parsed.file)).not.toBe('{}');

      // error 不应该是 '{}'
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('some error');
      expect(JSON.stringify(parsed.error)).not.toBe('{}');

      // chunks[0].blob 不应该出现（已排除）
      expect(parsed.chunks[0].blob).toBeUndefined();
    });
  });

  describe('serializeMergeResponse', () => {
    it('应该排除 originalFile 字段', () => {
      const response = {
        success: true,
        fileUrl: 'http://example.com/file',
        fileId: '123',
        fileName: 'test.txt',
        fileSize: 100,
        uploadTime: 500
      };
      const result = serializeMergeResponse(response);
      expect(result.success).toBe(true);
      expect(result.fileUrl).toBe('http://example.com/file');
      expect('originalFile' in result).toBe(false);
    });
  });
});
