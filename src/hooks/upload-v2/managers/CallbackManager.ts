/**
 * 回调管理器
 * 负责管理上传过程中的各种回调函数
 */
import type { UploadCallbacks } from '../types';
import type { WindowWithLogger } from '../types/browser';

/** 回调项（支持优先级和一次性回调） */
interface CallbackItem {
  callback: Function;
  priority: number;
  once: boolean;
}

export class CallbackManager {
  private callbacks: UploadCallbacks = {};
  private callbackItems = new Map<keyof UploadCallbacks, CallbackItem[]>();

  /**
   * 注册回调（支持优先级和一次性回调）
   */
  private registerCallback<K extends keyof UploadCallbacks>(
    event: K,
    callback: NonNullable<UploadCallbacks[K]>,
    options: { priority?: number; once?: boolean } = {}
  ): this {
    const { priority = 0, once = false } = options;

    if (!this.callbackItems.has(event)) {
      this.callbackItems.set(event, []);
    }

    const items = this.callbackItems.get(event)!;
    items.push({ callback, priority, once });

    // 按优先级排序（优先级高的先执行）
    items.sort((a, b) => b.priority - a.priority);

    // 保持向后兼容：设置最后一个回调到 callbacks 对象
    this.callbacks[event] = callback;

    return this;
  }

  /**
   * 移除回调
   */
  removeCallback<K extends keyof UploadCallbacks>(
    event: K,
    callback?: NonNullable<UploadCallbacks[K]>
  ): this {
    if (!this.callbackItems.has(event)) {
      return this;
    }

    const items = this.callbackItems.get(event)!;

    if (callback) {
      // 移除特定回调
      const index = items.findIndex(item => item.callback === callback);
      if (index > -1) {
        items.splice(index, 1);
      }
    } else {
      // 移除所有回调
      items.length = 0;
    }

    // 更新 callbacks 对象
    if (items.length > 0) {
      this.callbacks[event] = items[items.length - 1].callback as NonNullable<UploadCallbacks[K]>;
    } else {
      delete this.callbacks[event];
    }

    return this;
  }

  // 链式调用设置回调
  onFileStart(callback: UploadCallbacks['onFileStart'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onFileStart', callback, options);
  }

  onFileProgress(callback: UploadCallbacks['onFileProgress'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onFileProgress', callback, options);
  }

  onFileSuccess(callback: UploadCallbacks['onFileSuccess'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onFileSuccess', callback, options);
  }

  onFileError(callback: UploadCallbacks['onFileError'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onFileError', callback, options);
  }

  onFilePause(callback: UploadCallbacks['onFilePause'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onFilePause', callback, options);
  }

  onFileResume(callback: UploadCallbacks['onFileResume'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onFileResume', callback, options);
  }

  onFileCancel(callback: UploadCallbacks['onFileCancel'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onFileCancel', callback, options);
  }

  onTotalProgress(callback: UploadCallbacks['onTotalProgress'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onTotalProgress', callback, options);
  }

  onAllComplete(callback: UploadCallbacks['onAllComplete'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onAllComplete', callback, options);
  }

  onAllError(callback: UploadCallbacks['onAllError'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onAllError', callback, options);
  }

  onSpeedChange(callback: UploadCallbacks['onSpeedChange'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onSpeedChange', callback, options);
  }

  onQueueChange(callback: UploadCallbacks['onQueueChange'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onQueueChange', callback, options);
  }

  onChunkSuccess(callback: UploadCallbacks['onChunkSuccess'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onChunkSuccess', callback, options);
  }

  onChunkError(callback: UploadCallbacks['onChunkError'], options?: { priority?: number; once?: boolean }): this {
    if (!callback) return this;
    return this.registerCallback('onChunkError', callback, options);
  }

  // 触发回调（支持多个回调和优先级）
  async emit<K extends keyof UploadCallbacks>(
    event: K,
    ...args: Parameters<NonNullable<UploadCallbacks[K]>>
  ): Promise<void> {
    const items = this.callbackItems.get(event);

    if (!items || items.length === 0) {
      // 向后兼容：使用旧的 callbacks
      const callback = this.callbacks[event];
      if (callback) {
        // 使用 Function.apply 来避免扩展参数类型问题
        const typedCallback = callback as (...args: unknown[]) => unknown;
        const result = typedCallback(...args);
        if (result instanceof Promise) {
          await result;
        }
      }
      return;
    }

    // 执行所有回调（按优先级顺序）
    const toRemove: number[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // 使用 Function.apply 来避免扩展参数类型问题
        const typedCallback = item.callback as (...args: unknown[]) => unknown;
        const result = typedCallback(...args);
        if (result instanceof Promise) {
          await result;
        }

        // 如果是一次性回调，标记为移除
        if (item.once) {
          toRemove.push(i);
        }
      } catch (error) {
        // 使用 logger 而不是 console（如果可用）
        if (typeof window !== 'undefined') {
          const windowWithLogger = window as WindowWithLogger;
          if (windowWithLogger.__UPLOAD_LOGGER__) {
            windowWithLogger.__UPLOAD_LOGGER__.error(`回调执行失败 [${event}]`, {}, error instanceof Error ? error : undefined);
          } else {
            console.error(`回调执行失败 [${event}]:`, error);
          }
        } else {
          console.error(`回调执行失败 [${event}]:`, error);
        }
      }
    }

    // 移除一次性回调（从后往前移除，避免索引变化）
    for (let i = toRemove.length - 1; i >= 0; i--) {
      items.splice(toRemove[i], 1);
    }

    // 更新 callbacks 对象（保持向后兼容）
    if (items.length > 0) {
      this.callbacks[event] = items[items.length - 1].callback as any;
    } else {
      delete this.callbacks[event];
    }
  }

  /**
   * 清空所有回调
   */
  clear(): this {
    this.callbacks = {};
    this.callbackItems.clear();
    return this;
  }

  getCallbacks(): UploadCallbacks {
    return { ...this.callbacks };
  }
}

