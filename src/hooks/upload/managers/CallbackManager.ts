import { UploadCallbacks, FileTask, ChunkInfo, UploadStats } from '../type';

/** 回调管理器 */
export class CallbackManager {
  private callbacks: UploadCallbacks = {};

  // 链式调用设置回调
  onFileStart(callback: UploadCallbacks['onFileStart']): this {
    this.callbacks.onFileStart = callback;
    return this;
  }

  onFileProgress(callback: UploadCallbacks['onFileProgress']): this {
    this.callbacks.onFileProgress = callback;
    return this;
  }

  onFileSuccess(callback: UploadCallbacks['onFileSuccess']): this {
    this.callbacks.onFileSuccess = callback;
    return this;
  }

  onFileError(callback: UploadCallbacks['onFileError']): this {
    this.callbacks.onFileError = callback;
    return this;
  }

  onFilePause(callback: UploadCallbacks['onFilePause']): this {
    this.callbacks.onFilePause = callback;
    return this;
  }

  onFileResume(callback: UploadCallbacks['onFileResume']): this {
    this.callbacks.onFileResume = callback;
    return this;
  }

  onFileCancel(callback: UploadCallbacks['onFileCancel']): this {
    this.callbacks.onFileCancel = callback;
    return this;
  }

  onTotalProgress(callback: UploadCallbacks['onTotalProgress']): this {
    this.callbacks.onTotalProgress = callback;
    return this;
  }

  onAllComplete(callback: UploadCallbacks['onAllComplete']): this {
    this.callbacks.onAllComplete = callback;
    return this;
  }

  onAllError(callback: UploadCallbacks['onAllError']): this {
    this.callbacks.onAllError = callback;
    return this;
  }

  onSpeedChange(callback: UploadCallbacks['onSpeedChange']): this {
    this.callbacks.onSpeedChange = callback;
    return this;
  }

  onQueueChange(callback: UploadCallbacks['onQueueChange']): this {
    this.callbacks.onQueueChange = callback;
    return this;
  }

  onChunkSuccess(callback: UploadCallbacks['onChunkSuccess']): this {
    this.callbacks.onChunkSuccess = callback;
    return this;
  }

  onChunkError(callback: UploadCallbacks['onChunkError']): this {
    this.callbacks.onChunkError = callback;
    return this;
  }

  // 触发回调
  async emit<K extends keyof UploadCallbacks>(
    event: K,
    ...args: Parameters<NonNullable<UploadCallbacks[K]>>
  ): Promise<void> {
    const callback = this.callbacks[event];
    if (callback) {
      await (callback as any)(...args);
    }
  }

  getCallbacks(): UploadCallbacks {
    return { ...this.callbacks };
  }
}
