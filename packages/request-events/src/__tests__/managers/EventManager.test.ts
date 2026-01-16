/**
 * EventManager 测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventManager } from '../../managers/EventManager';
import type {
  RequestStartEventData,
  RequestSuccessEventData,
  RequestErrorEventData,
  RequestCompleteEventData,
} from '../../types';

describe('EventManager', () => {
  let manager: EventManager;

  beforeEach(() => {
    manager = new EventManager();
  });

  describe('on', () => {
    it('应该能够监听事件', () => {
      let called = false;
      const handler = (): void => {
        called = true;
      };

      manager.on('request:start', handler);
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });

      expect(called).toBe(true);
    });

    it('应该能够添加多个监听器', () => {
      let callCount = 0;
      const handler1 = (): void => {
        callCount++;
      };
      const handler2 = (): void => {
        callCount++;
      };

      manager.on('request:start', handler1);
      manager.on('request:start', handler2);
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });

      expect(callCount).toBe(2);
    });

    it('应该能够监听不同类型的事件', () => {
      let startCalled = false;
      let successCalled = false;
      let errorCalled = false;
      let completeCalled = false;

      manager.on('request:start', () => {
        startCalled = true;
      });
      manager.on('request:success', () => {
        successCalled = true;
      });
      manager.on('request:error', () => {
        errorCalled = true;
      });
      manager.on('request:complete', () => {
        completeCalled = true;
      });

      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });
      manager.emit('request:success', {
        config: { url: '/api/users', method: 'GET' },
        result: 'success',
        timestamp: Date.now(),
        duration: 100,
      });
      manager.emit('request:error', {
        config: { url: '/api/users', method: 'GET' },
        error: new Error('Test error'),
        timestamp: Date.now(),
        duration: 100,
      });
      manager.emit('request:complete', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
        duration: 100,
        success: true,
      });

      expect(startCalled).toBe(true);
      expect(successCalled).toBe(true);
      expect(errorCalled).toBe(true);
      expect(completeCalled).toBe(true);
    });
  });

  describe('off', () => {
    it('应该能够取消监听事件', () => {
      let called = false;
      const handler = (): void => {
        called = true;
      };

      manager.on('request:start', handler);
      manager.off('request:start', handler);
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });

      expect(called).toBe(false);
    });

    it('应该只取消指定的监听器', () => {
      let callCount = 0;
      const handler1 = (): void => {
        callCount++;
      };
      const handler2 = (): void => {
        callCount++;
      };

      manager.on('request:start', handler1);
      manager.on('request:start', handler2);
      manager.off('request:start', handler1);
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });

      expect(callCount).toBe(1);
    });

    it('应该能够取消不存在的监听器', () => {
      const handler = (): void => {
        // 不应该被调用
      };

      manager.off('request:start', handler);
      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });

  describe('removeAllListeners', () => {
    it('应该能够移除指定事件的所有监听器', () => {
      let callCount = 0;
      const handler1 = (): void => {
        callCount++;
      };
      const handler2 = (): void => {
        callCount++;
      };

      manager.on('request:start', handler1);
      manager.on('request:start', handler2);
      manager.on('request:success', handler1);
      manager.removeAllListeners('request:start');
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });
      manager.emit('request:success', {
        config: { url: '/api/users', method: 'GET' },
        result: 'success',
        timestamp: Date.now(),
        duration: 100,
      });

      expect(callCount).toBe(1); // 只有 success 事件的监听器被调用
    });

    it('应该能够移除所有事件的所有监听器', () => {
      let callCount = 0;
      const handler = (): void => {
        callCount++;
      };

      manager.on('request:start', handler);
      manager.on('request:success', handler);
      manager.removeAllListeners();
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });
      manager.emit('request:success', {
        config: { url: '/api/users', method: 'GET' },
        result: 'success',
        timestamp: Date.now(),
        duration: 100,
      });

      expect(callCount).toBe(0);
    });
  });

  describe('emit', () => {
    it('应该能够触发事件并传递数据', () => {
      let receivedData: RequestStartEventData | null = null;
      const handler = (data: RequestStartEventData): void => {
        receivedData = data;
      };

      manager.on('request:start', handler);
      const eventData: RequestStartEventData = {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      };
      manager.emit('request:start', eventData);

      expect(receivedData).toEqual(eventData);
    });

    it('应该能够触发成功事件并传递数据', () => {
      let receivedData: RequestSuccessEventData<string> | null = null;
      const handler = <T = unknown>(data: RequestSuccessEventData<T>): void => {
        receivedData = data as RequestSuccessEventData<string>;
      };

      manager.on('request:success', handler);
      const eventData: RequestSuccessEventData<string> = {
        config: { url: '/api/users', method: 'GET' },
        result: 'success',
        timestamp: Date.now(),
        duration: 100,
      };
      manager.emit('request:success', eventData);

      expect(receivedData).toEqual(eventData);
    });

    it('应该能够触发错误事件并传递数据', () => {
      let receivedData: RequestErrorEventData | null = null;
      const handler = (data: RequestErrorEventData): void => {
        receivedData = data;
      };

      manager.on('request:error', handler);
      const error = new Error('Test error');
      const eventData: RequestErrorEventData = {
        config: { url: '/api/users', method: 'GET' },
        error,
        timestamp: Date.now(),
        duration: 100,
      };
      manager.emit('request:error', eventData);

      expect(receivedData).toEqual(eventData);
    });

    it('应该能够触发完成事件并传递数据', () => {
      let receivedData: RequestCompleteEventData | null = null;
      const handler = (data: RequestCompleteEventData): void => {
        receivedData = data;
      };

      manager.on('request:complete', handler);
      const eventData: RequestCompleteEventData = {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
        duration: 100,
        success: true,
      };
      manager.emit('request:complete', eventData);

      expect(receivedData).toEqual(eventData);
    });

    it('应该在没有监听器时不抛出错误', () => {
      expect(() => {
        manager.emit('request:start', {
          config: { url: '/api/users', method: 'GET' },
          timestamp: Date.now(),
        });
      }).not.toThrow();
    });

    it('应该静默处理监听器中的错误', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = (): void => {
        throw new Error('Handler error');
      };

      manager.on('request:start', handler);
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('应该继续执行其他监听器即使某个监听器出错', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let callCount = 0;
      const handler1 = (): void => {
        throw new Error('Handler error');
      };
      const handler2 = (): void => {
        callCount++;
      };

      manager.on('request:start', handler1);
      manager.on('request:start', handler2);
      manager.emit('request:start', {
        config: { url: '/api/users', method: 'GET' },
        timestamp: Date.now(),
      });

      expect(callCount).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('listenerCount', () => {
    it('应该返回指定事件的监听器数量', () => {
      expect(manager.listenerCount('request:start')).toBe(0);

      manager.on('request:start', () => {});
      expect(manager.listenerCount('request:start')).toBe(1);

      manager.on('request:start', () => {});
      expect(manager.listenerCount('request:start')).toBe(2);

      manager.on('request:success', () => {});
      expect(manager.listenerCount('request:start')).toBe(2);
      expect(manager.listenerCount('request:success')).toBe(1);
    });

    it('应该在移除监听器后更新数量', () => {
      const handler = (): void => {};

      manager.on('request:start', handler);
      expect(manager.listenerCount('request:start')).toBe(1);

      manager.off('request:start', handler);
      expect(manager.listenerCount('request:start')).toBe(0);
    });
  });

  describe('eventNames', () => {
    it('应该返回所有已注册的事件类型', () => {
      expect(manager.eventNames()).toEqual([]);

      manager.on('request:start', () => {});
      expect(manager.eventNames()).toContain('request:start');

      manager.on('request:success', () => {});
      expect(manager.eventNames()).toContain('request:start');
      expect(manager.eventNames()).toContain('request:success');
    });

    it('应该在移除所有监听器后更新事件类型列表', () => {
      manager.on('request:start', () => {});
      manager.on('request:success', () => {});
      expect(manager.eventNames().length).toBe(2);

      manager.removeAllListeners('request:start');
      expect(manager.eventNames()).not.toContain('request:start');
      expect(manager.eventNames()).toContain('request:success');

      manager.removeAllListeners();
      expect(manager.eventNames()).toEqual([]);
    });
  });
});

