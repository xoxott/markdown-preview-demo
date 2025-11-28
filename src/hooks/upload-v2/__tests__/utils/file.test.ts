/**
 * 文件工具函数测试
 */
import { describe, expect, it } from 'vitest';
import {
  getFileExtension,
  getFileNameWithoutExtension
} from '../../utils/file';
import {
  generateId,
  generateUUID
} from '../../utils/id';
import {
  delay,
  cancellableDelay
} from '../../utils/delay';
import {
  throttle,
  debounce
} from '../../utils/throttle';

describe('文件工具函数', () => {
  describe('generateId', () => {
    it('应该生成唯一ID', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      expect(id1).not.toBe(id2);
      expect(id1).toContain('test');
    });

    it('应该使用默认前缀', () => {
      const id = generateId();
      expect(id).toContain('upload');
    });
  });

  describe('generateUUID', () => {
    it('应该生成UUID格式的字符串', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('应该生成不同的UUID', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('delay', () => {
    it('应该延迟指定时间', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('cancellableDelay', () => {
    it('应该可以取消延迟', async () => {
      const { promise, cancel } = cancellableDelay(1000);
      cancel();
      await expect(promise).rejects.toThrow('Delay cancelled');
    });
  });

  describe('getFileExtension', () => {
    it('应该正确获取文件扩展名', () => {
      expect(getFileExtension('test.txt')).toBe('txt');
      expect(getFileExtension('test.js')).toBe('js');
      expect(getFileExtension('test.min.js')).toBe('js');
      expect(getFileExtension('test')).toBe('');
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('应该正确获取不含扩展名的文件名', () => {
      expect(getFileNameWithoutExtension('test.txt')).toBe('test');
      expect(getFileNameWithoutExtension('test.min.js')).toBe('test.min');
      expect(getFileNameWithoutExtension('test')).toBe('test');
    });
  });

  describe('throttle', () => {
    it('应该限制函数调用频率', async () => {
      let callCount = 0;
      const throttled = throttle(() => {
        callCount++;
      }, 100);

      throttled();
      throttled();
      throttled();

      expect(callCount).toBe(1);

      await delay(150);
      throttled();
      expect(callCount).toBe(2);
    });
  });

  describe('debounce', () => {
    it('应该延迟函数执行', async () => {
      let callCount = 0;
      const debounced = debounce(() => {
        callCount++;
      }, 100);

      debounced();
      debounced();
      debounced();

      expect(callCount).toBe(0);

      await delay(150);
      expect(callCount).toBe(1);
    });
  });
});

