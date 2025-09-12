import { calculateFileMD5 } from './utils'
/** Web Worker 响应类型 */
interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  data?: any;
  error?: string;
}

/** Web Worker 管理器 */
export default class UploadWorkerManager {
  private worker: Worker | null = null;
  private messageHandlers = new Map<string, (response: any) => void>();
  private messageId = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker(workerScript?: string): void {
    try {
      if (workerScript) {
        this.worker = new Worker(workerScript);
      } else {
        // 创建内联 Worker
        const blob = new Blob([this.getWorkerScript()], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
      }

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const handler = this.messageHandlers.get(response.id);
        if (handler) {
          handler(response);
          if (response.type !== 'PROGRESS') {
            this.messageHandlers.delete(response.id);
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
      };

    } catch (error) {
      console.warn('Worker 初始化失败，降级到主线程模式:', error);
      this.worker = null;
    }
  }

  private getWorkerScript(): string {
    return `
      // Web Worker 内部代码
      
      // MD5 计算函数 (简化版，实际使用建议用专门的库)
      function calculateMD5(buffer) {
        // 这里应该使用真正的 MD5 算法
        // 为了示例，使用简单的哈希
        let hash = 0;
        const view = new Uint8Array(buffer);
        for (let i = 0; i < view.length; i++) {
          hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
        }
        return Math.abs(hash).toString(16);
      }

      // 图片压缩函数
      function compressImage(imageData, options = {}) {
        return new Promise((resolve) => {
          const canvas = new OffscreenCanvas(options.width || 800, options.height || 600);
          const ctx = canvas.getContext('2d');
          
          createImageBitmap(imageData).then(bitmap => {
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            canvas.convertToBlob({ 
              type: options.type || 'image/jpeg', 
              quality: options.quality || 0.8 
            }).then(resolve);
          });
        });
      }

      // 文件切片函数
      function sliceFile(file, chunkSize) {
        const chunks = [];
        for (let start = 0; start < file.size; start += chunkSize) {
          const end = Math.min(start + chunkSize, file.size);
          chunks.push({
            index: chunks.length,
            start,
            end,
            size: end - start,
            blob: file.slice(start, end)
          });
        }
        return chunks;
      }

      // 批量处理函数
      async function batchProcess(files, options) {
        const results = [];
        for (let i = 0; i < files.length; i++) {
          try {
            const file = files[i];
            let result = { file: file.name, size: file.size };

            // 计算 MD5
            if (options.calculateMD5) {
              const buffer = await file.arrayBuffer();
              result.md5 = calculateMD5(buffer);
            }

            // 生成切片信息
            if (options.generateChunks) {
              const chunks = sliceFile(file, options.chunkSize || 2 * 1024 * 1024);
              result.chunks = chunks.map(chunk => ({
                index: chunk.index,
                start: chunk.start,
                end: chunk.end,
                size: chunk.size
              }));
            }

            results.push(result);
            
            // 发送进度更新
            self.postMessage({
              id: options.messageId,
              type: 'PROGRESS',
              success: true,
              progress: ((i + 1) / files.length) * 100
            });

          } catch (error) {
            results.push({ file: files[i].name, error: error.message });
          }
        }
        return results;
      }

      // 消息处理
      self.onmessage = async function(event) {
        const { id, type, payload } = event.data;
        
        try {
          let result;
          
          switch (type) {
            case 'MD5_CALCULATE':
              const buffer = await payload.file.arrayBuffer();
              result = calculateMD5(buffer);
              break;
              
            case 'COMPRESS_IMAGE':
              result = await compressImage(payload.imageData, payload.options);
              break;
              
            case 'SLICE_FILE':
              result = sliceFile(payload.file, payload.chunkSize);
              break;
              
            case 'BATCH_PROCESS':
              result = await batchProcess(payload.files, { 
                ...payload.options, 
                messageId: id 
              });
              break;
              
            default:
              throw new Error('Unknown message type: ' + type);
          }

          self.postMessage({
            id,
            type,
            success: true,
            data: result
          });

        } catch (error) {
          self.postMessage({
            id,
            type,
            success: false,
            error: error.message
          });
        }
      };
    `;
  }

  private sendMessage<T = any>(type: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const messageId = (++this.messageId).toString();

      // 如果没有 Worker，回退到主线程处理
      if (!this.worker) {
        this.fallbackToMainThread(type, payload)
          .then(resolve)
          .catch(reject);
        return;
      }

      const timeout = setTimeout(() => {
        this.messageHandlers.delete(messageId);
        reject(new Error('Worker 响应超时'));
      }, 30000); // 30秒超时

      this.messageHandlers.set(messageId, (response: WorkerResponse) => {
        if (response.type === 'PROGRESS') {
          // 进度更新不清理 handler
          return;
        }

        clearTimeout(timeout);

        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Worker 处理失败'));
        }
      });

      this.worker.postMessage({ id: messageId, type, payload });
    });
  }
  private sliceFileInMainThread(file: File, chunkSize: number) {
    const chunks: any[] = [];
    for (let start = 0; start < file.size; start += chunkSize) {
      const end = Math.min(start + chunkSize, file.size);
      chunks.push({
        index: chunks.length,
        start,
        end,
        size: end - start,
        blob: file.slice(start, end)
      });
    }
    return chunks;
  }

  private async fallbackToMainThread(type: string, payload: any): Promise<any> {
    switch (type) {
      case 'MD5_CALCULATE':
        return await calculateFileMD5(payload.file);

      case 'SLICE_FILE':
        return this.sliceFileInMainThread(payload.file, payload.chunkSize);

      case 'BATCH_PROCESS':
        return await this.batchProcessInMainThread(payload.files, payload.options);

      default:
        throw new Error('不支持的操作类型: ' + type);
    }
  }

  private async batchProcessInMainThread(files: File[], options: any) {
    const results: any[] = [];
    for (const file of files) {
      try {
        const result: any = { file: file.name, size: file.size };

        if (options.calculateMD5) {
          result.md5 = await calculateFileMD5(file);
        }

        if (options.generateChunks) {
          const chunks = this.sliceFileInMainThread(file, options.chunkSize || 2 * 1024 * 1024);
          result.chunks = chunks.map(chunk => ({
            index: chunk.index,
            start: chunk.start,
            end: chunk.end,
            size: chunk.size
          }));
        }

        results.push(result);
      } catch (error) {
        results.push({ file: file.name, error: (error as Error).message });
      }
    }
    return results;
  }

  public async calculateMD5(file: File): Promise<string> {
    return this.sendMessage('MD5_CALCULATE', { file });
  }

  public async sliceFile(file: File, chunkSize: number): Promise<any[]> {
    return this.sendMessage('SLICE_FILE', { file, chunkSize });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.messageHandlers.clear();
  }
}
