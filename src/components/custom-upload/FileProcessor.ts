import type { UploadFileInfo } from 'naive-ui';
/**
 * ## 文件处理器类
 *
 * 用于批量处理文件、生成上传信息并支持异步验证。 特点：
 *
 * - 支持批量处理与队列并发
 * - 每个文件可异步验证（FileValidator）
 * - 处理批间可自动让出事件循环（防止卡 UI）
 * - 生成唯一的文件 ID 与完整路径信息
 */

interface FileValidator {
  validate: (file: File) => Promise<boolean> | boolean;
  getErrorMessage: (file: File) => string;
}

interface FileProcessorConfig {
  batchSize: number;
  idleTimeout: number;
  maxConcurrent: number;
}

export default class FileProcessor {
  private readonly config: FileProcessorConfig;
  private readonly queue: File[] = [];
  private isProcessing = false;
  private counter = 0;

  constructor(config: FileProcessorConfig) {
    this.config = config;
  }

  /** 生成唯一文件 ID */
  private generateFileId(): string {
    return `file_${Date.now()}_${++this.counter}`;
  }

  /** 将 File 对象包装成 UploadFileInfo，便于上传或业务管理。 */
  public createUploadFileInfo(file: File): UploadFileInfo {
    const relativePath = (file as any).webkitRelativePath || file.name;

    return {
      id: this.generateFileId(),
      name: file.name,
      status: 'pending',
      percentage: 0,
      file,
      fullPath: relativePath
    };
  }

  /** 向处理器提交一批文件。 如果当前正在处理，会自动排队。 */
  async processFiles(
    files: File[],
    validator?: FileValidator,
    onProcess?: (info: UploadFileInfo) => void
  ): Promise<void> {
    if (this.isProcessing) {
      this.queue.push(...files);
      return;
    }

    this.isProcessing = true;

    try {
      await this.runBatches(files, validator, onProcess);

      // 顺序处理剩余队列
      while (this.queue.length > 0) {
        const nextBatch = this.queue.splice(0, this.config.batchSize);
        await this.runBatches(nextBatch, validator, onProcess);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /** 执行一批文件的验证与处理。 */
  private async runBatches(
    files: File[],
    validator?: FileValidator,
    onProcess?: (info: UploadFileInfo) => void
  ): Promise<void> {
    const { batchSize, idleTimeout, maxConcurrent } = this.config;

    for (let i = 0; i < files.length; i += batchSize) {
      const currentBatch = files.slice(i, i + batchSize);
      await this.runWithConcurrency(currentBatch, maxConcurrent, async file => {
        const info = this.createUploadFileInfo(file);

        if (validator) {
          try {
            const valid = await validator.validate(file);
            if (!valid) return;
          } catch (err) {
            console.warn(`文件验证失败: ${file.name}`, err);
            return;
          }
        }

        onProcess?.(info);
      });

      // 在批与批之间让出线程，避免卡死 UI
      if (i + batchSize < files.length) {
        await this.waitForIdle(idleTimeout);
      }
    }
  }

  /** 控制并发执行的任务队列 */
  private async runWithConcurrency<T>(tasks: T[], limit: number, worker: (task: T) => Promise<void>): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      // 包装任务
      const p = Promise.resolve()
        .then(() => worker(task))
        .finally(() => {
          // 执行完自动从队列中删除自己
          const index = executing.indexOf(p);
          if (index >= 0) executing.splice(index, 1);
        });

      executing.push(p);

      // 如果达到并发上限，就等待其中一个完成再继续
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    // 等待所有剩余任务结束
    await Promise.all(executing);
  }

  /** 等待浏览器空闲时间或超时。 用于在批次间让出事件循环，改善性能体验。 */
  private waitForIdle(timeout: number): Promise<void> {
    return new Promise(resolve => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(resolve, { timeout });
      } else {
        setTimeout(resolve, timeout);
      }
    });
  }
}
