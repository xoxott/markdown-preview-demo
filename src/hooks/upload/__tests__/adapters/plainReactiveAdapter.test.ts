/** plainReactiveAdapter 测试 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlainReactiveAdapter, resetSharedPoller } from '../../adapters/plainReactiveAdapter';

describe('plainReactiveAdapter', () => {
  const pollInterval = 50;
  let adapter: ReturnType<typeof createPlainReactiveAdapter>;

  beforeEach(() => {
    resetSharedPoller();
    vi.useFakeTimers();
    adapter = createPlainReactiveAdapter({ isDev: true, pollInterval });
  });

  afterEach(() => {
    resetSharedPoller();
    vi.useRealTimers();
  });

  describe('ref', () => {
    it('应该创建带初始值的 ref', () => {
      const r = adapter.ref(42);
      expect(r.value).toBe(42);
    });

    it('应该允许修改 ref 值', () => {
      const r = adapter.ref('hello');
      r.value = 'world';
      expect(r.value).toBe('world');
    });
  });

  describe('computed', () => {
    it('应该每次访问重新计算', () => {
      const r = adapter.ref(1);
      const c = adapter.computed(() => r.value * 2);
      expect(c.value).toBe(2);
      r.value = 3;
      expect(c.value).toBe(6);
    });

    it('设置 computed 值应该无效', () => {
      const c = adapter.computed(() => 42);
      c.value = 100;
      expect(c.value).toBe(42);
    });
  });

  describe('watch', () => {
    it('应该在原始值变化时触发回调', () => {
      const r = adapter.ref(0);
      const cb = vi.fn();
      adapter.watch(r, cb);

      r.value = 1;
      vi.advanceTimersByTime(pollInterval * 2);

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(1, 0);
    });

    it('应该在函数源变化时触发回调', () => {
      const r = adapter.ref(10);
      const cb = vi.fn();
      adapter.watch(() => r.value + 5, cb);

      r.value = 20;
      vi.advanceTimersByTime(pollInterval * 2);

      expect(cb).toHaveBeenCalledWith(25, 15);
    });

    it('immediate 选项应该立即触发', () => {
      const r = adapter.ref('a');
      const cb = vi.fn();
      adapter.watch(r, cb, { immediate: true });

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith('a', 'a');
    });

    it('stop 应该停止轮询', () => {
      const r = adapter.ref(0);
      const cb = vi.fn();
      const stop = adapter.watch(r, cb);

      stop();
      r.value = 1;
      vi.advanceTimersByTime(pollInterval * 2);

      expect(cb).not.toHaveBeenCalled();
    });

    it('应该检测 Map 的就地修改', () => {
      const r = adapter.ref(new Map<string, number>());
      const cb = vi.fn();
      adapter.watch(r, cb);

      r.value.set('key', 1);
      vi.advanceTimersByTime(pollInterval * 2);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('应该检测数组的就地修改', () => {
      const r = adapter.ref<number[]>([]);
      const cb = vi.fn();
      adapter.watch(r, cb);

      r.value.push(1);
      vi.advanceTimersByTime(pollInterval * 2);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('应该检测对象的就地修改', () => {
      const r = adapter.ref({ count: 0 });
      const cb = vi.fn();
      adapter.watch(r, cb);

      r.value.count = 5;
      vi.advanceTimersByTime(pollInterval * 2);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('多个 watcher 应该共享同一个轮询器', () => {
      const r1 = adapter.ref(0);
      const r2 = adapter.ref('a');
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      adapter.watch(r1, cb1);
      adapter.watch(r2, cb2);

      r1.value = 1;
      r2.value = 'b';
      vi.advanceTimersByTime(pollInterval * 2);

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('值未变化时不应该触发回调', () => {
      const r = adapter.ref(5);
      const cb = vi.fn();
      adapter.watch(r, cb);

      vi.advanceTimersByTime(pollInterval * 3);

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('onUnmounted', () => {
    it('应该注册卸载回调', () => {
      const cb = vi.fn();
      adapter.onUnmounted(cb);
      // 仅验证注册不报错，实际调用由调用方负责
    });
  });

  describe('isDev', () => {
    it('应该返回 isDev 标志', () => {
      expect(adapter.isDev()).toBe(true);
    });

    it('默认 isDev 为 false', () => {
      resetSharedPoller();
      const prodAdapter = createPlainReactiveAdapter({ isDev: false });
      expect(prodAdapter.isDev()).toBe(false);
    });
  });

  describe('nextTick', () => {
    it('应该在微任务中执行回调', async () => {
      const cb = vi.fn();
      await adapter.nextTick(cb);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
