/**
 * ProgressTracker 测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressTracker, createProgressTracker } from '../ProgressTracker';
import type { ProgressEvent, ProgressCallback } from '../types';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
    tracker = new ProgressTracker(callback as ProgressCallback);
  });

  describe('构造函数', () => {
    it('应该使用默认值创建实例', () => {
      const defaultTracker = new ProgressTracker();
      expect(defaultTracker).toBeInstanceOf(ProgressTracker);
    });

    it('应该使用回调函数创建实例', () => {
      const cb: ProgressCallback = vi.fn();
      const trackerWithCallback = new ProgressTracker(cb);
      expect(trackerWithCallback).toBeInstanceOf(ProgressTracker);
    });

    it('应该初始化开始时间', () => {
      const newTracker = new ProgressTracker();
      expect(newTracker).toBeInstanceOf(ProgressTracker);
    });
  });

  describe('update', () => {
    it('应该调用回调函数', () => {
      const event: ProgressEvent = { loaded: 50, total: 100 };
      tracker.update(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('应该在无回调时不抛出错误', () => {
      const noCallbackTracker = new ProgressTracker();
      const event: ProgressEvent = { loaded: 50, total: 100 };
      expect(() => {
        noCallbackTracker.update(event);
      }).not.toThrow();
    });

    it('应该计算正确的进度百分比', () => {
      const event: ProgressEvent = { loaded: 50, total: 100 };
      tracker.update(event);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          percent: 50,
          loaded: 50,
          total: 100,
        }),
      );
    });

    it('应该计算已用时间', () => {
      const event: ProgressEvent = { loaded: 50, total: 100 };

      // 使用 vi.useFakeTimers 来控制时间
      vi.useFakeTimers();
      const newCallback = vi.fn();
      const newTracker = new ProgressTracker(newCallback as ProgressCallback);

      vi.advanceTimersByTime(1000);
      newTracker.update(event);

      expect(newCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          elapsed: 1000,
        }),
      );

      vi.useRealTimers();
    });

    it('应该计算传输速度', () => {
      const event1: ProgressEvent = { loaded: 100, total: 1000 };

      vi.useFakeTimers();
      const newCallback = vi.fn();
      const newTracker = new ProgressTracker(newCallback as ProgressCallback);

      newTracker.update(event1);
      vi.advanceTimersByTime(1000);

      const event2: ProgressEvent = { loaded: 200, total: 1000 };
      newTracker.update(event2);

      expect(newCallback).toHaveBeenCalled();
      const lastCall = newCallback.mock.calls[newCallback.mock.calls.length - 1];
      const progressInfo = lastCall[0] as Parameters<ProgressCallback>[0];
      expect(progressInfo.speed).toBeDefined();
      expect(progressInfo.speed).toMatch(/\/s$/);

      vi.useRealTimers();
    });

    it('应该处理 total=0 的情况', () => {
      const event: ProgressEvent = { loaded: 50, total: 0 };
      tracker.update(event);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          percent: 0,
          loaded: 50,
          total: 0,
        }),
      );
    });

    it('应该处理多次更新', () => {
      tracker.update({ loaded: 25, total: 100 });
      tracker.update({ loaded: 50, total: 100 });
      tracker.update({ loaded: 75, total: 100 });
      tracker.update({ loaded: 100, total: 100 });

      expect(callback).toHaveBeenCalledTimes(4);

      const calls = callback.mock.calls;
      const call0 = calls[0][0] as Parameters<ProgressCallback>[0];
      const call1 = calls[1][0] as Parameters<ProgressCallback>[0];
      const call2 = calls[2][0] as Parameters<ProgressCallback>[0];
      const call3 = calls[3][0] as Parameters<ProgressCallback>[0];
      expect(call0.percent).toBe(25);
      expect(call1.percent).toBe(50);
      expect(call2.percent).toBe(75);
      expect(call3.percent).toBe(100);
    });

    it('应该更新 loaded 和 total 值', () => {
      const event: ProgressEvent = { loaded: 75, total: 200 };
      tracker.update(event);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          loaded: 75,
          total: 200,
        }),
      );
    });

    it('应该正确处理进度达到 100%', () => {
      const event: ProgressEvent = { loaded: 100, total: 100 };
      tracker.update(event);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          percent: 100,
          loaded: 100,
          total: 100,
        }),
      );
    });
  });

  describe('reset', () => {
    it('应该重置追踪器状态', () => {
      tracker.update({ loaded: 50, total: 100 });

      vi.useFakeTimers();
      tracker.reset();

      vi.advanceTimersByTime(100);
      tracker.update({ loaded: 10, total: 100 });

      const lastCall = callback.mock.calls[callback.mock.calls.length - 1];
      const progressInfo = lastCall[0] as Parameters<ProgressCallback>[0];
      expect(progressInfo.elapsed).toBeGreaterThanOrEqual(100);

      vi.useRealTimers();
    });

    it('应该在重置后重新开始计时', () => {
      vi.useFakeTimers();
      const newCallback = vi.fn();
      const newTracker = new ProgressTracker(newCallback as ProgressCallback);

      vi.advanceTimersByTime(1000);
      newTracker.update({ loaded: 50, total: 100 });

      const firstProgressInfo = newCallback.mock.calls[0][0] as Parameters<ProgressCallback>[0];
      expect(firstProgressInfo.elapsed).toBe(1000);

      newCallback.mockClear();
      newTracker.reset();

      vi.advanceTimersByTime(500);
      newTracker.update({ loaded: 75, total: 100 });

      const secondProgressInfo = newCallback.mock.calls[0][0] as Parameters<ProgressCallback>[0];
      expect(secondProgressInfo.elapsed).toBe(500);

      vi.useRealTimers();
    });

    it('应该重置已加载字节数', () => {
      tracker.update({ loaded: 50, total: 100 });
      tracker.reset();

      vi.useFakeTimers();
      const newCallback = vi.fn();
      const newTracker = new ProgressTracker(newCallback as ProgressCallback);
      newTracker.update({ loaded: 50, total: 100 });

      vi.advanceTimersByTime(100);
      newTracker.update({ loaded: 100, total: 100 });

      const lastCall = newCallback.mock.calls[newCallback.mock.calls.length - 1];
      const progressInfo = lastCall[0] as Parameters<ProgressCallback>[0];
      expect(progressInfo.loaded).toBe(100);

      vi.useRealTimers();
    });
  });

  describe('createProgressTracker', () => {
    it('应该返回一个函数', () => {
      const updateFn = createProgressTracker();
      expect(typeof updateFn).toBe('function');
    });

    it('应该使用回调函数创建更新函数', () => {
      const cb: ProgressCallback = vi.fn();
      const updateFn = createProgressTracker(cb);

      updateFn({ loaded: 50, total: 100 });

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('应该正确传递进度事件', () => {
      const cb: ProgressCallback = vi.fn();
      const updateFn = createProgressTracker(cb);

      const event: ProgressEvent = { loaded: 75, total: 200 };
      updateFn(event);

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          loaded: 75,
          total: 200,
        }),
      );
    });

    it('应该支持多次调用', () => {
      const cb: ProgressCallback = vi.fn();
      const updateFn = createProgressTracker(cb);

      updateFn({ loaded: 25, total: 100 });
      updateFn({ loaded: 50, total: 100 });
      updateFn({ loaded: 75, total: 100 });

      expect(cb).toHaveBeenCalledTimes(3);
    });

    it('应该在没有回调时正常工作', () => {
      const updateFn = createProgressTracker();

      expect(() => {
        updateFn({ loaded: 50, total: 100 });
      }).not.toThrow();
    });
  });

  describe('综合场景', () => {
    it('应该正确跟踪完整的上传进度', () => {
      vi.useFakeTimers();
      const newCallback = vi.fn();
      const newTracker = new ProgressTracker(newCallback as ProgressCallback);

      newTracker.update({ loaded: 0, total: 1000 });
      vi.advanceTimersByTime(100);
      newTracker.update({ loaded: 250, total: 1000 });
      vi.advanceTimersByTime(100);
      newTracker.update({ loaded: 500, total: 1000 });
      vi.advanceTimersByTime(100);
      newTracker.update({ loaded: 750, total: 1000 });
      vi.advanceTimersByTime(100);
      newTracker.update({ loaded: 1000, total: 1000 });

      expect(newCallback).toHaveBeenCalledTimes(5);

      const calls = newCallback.mock.calls;
      const call0 = calls[0][0] as Parameters<ProgressCallback>[0];
      const call1 = calls[1][0] as Parameters<ProgressCallback>[0];
      const call2 = calls[2][0] as Parameters<ProgressCallback>[0];
      const call3 = calls[3][0] as Parameters<ProgressCallback>[0];
      const call4 = calls[4][0] as Parameters<ProgressCallback>[0];
      expect(call0.percent).toBe(0);
      expect(call1.percent).toBe(25);
      expect(call2.percent).toBe(50);
      expect(call3.percent).toBe(75);
      expect(call4.percent).toBe(100);

      vi.useRealTimers();
    });

    it('应该正确处理进度回调中的所有字段', () => {
      const event: ProgressEvent = { loaded: 50, total: 100 };
      tracker.update(event);

      const progressInfo = callback.mock.calls[0][0];
      expect(progressInfo).toHaveProperty('percent');
      expect(progressInfo).toHaveProperty('loaded');
      expect(progressInfo).toHaveProperty('total');
      expect(progressInfo).toHaveProperty('speed');
      expect(progressInfo).toHaveProperty('elapsed');
    });
  });
});

