import { calculateFileMD5 } from '../utils';

// ==================== 类型定义 ====================
interface WorkerMessage {
  id: string;
  type: WorkerMessageType;
  payload: any;
}

interface WorkerResponse {
  id: string;
  type: WorkerMessageType;
  success: boolean;
  data?: any;
  error?: string;
  progress?: number;
}

type WorkerMessageType = 
  | 'MD5_CALCULATE' 
  | 'COMPRESS_IMAGE' 
  | 'SLICE_FILE' 
  | 'BATCH_PROCESS'
  | 'PROGRESS';

interface BatchProcessOptions {
  calculateMD5?: boolean;
  generateChunks?: boolean;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
}

// ==================== 常量 ====================
const CONSTANTS = {
  TIMEOUT: 30000,
  DEFAULT_CHUNK_SIZE: 2 * 1024 * 1024,
} as const;

// ==================== Worker 脚本生成器 ====================
 class WorkerScriptGenerator {
  static generate(): string {
    return `
      ${this.getMD5Function()}
      ${this.getImageCompressionFunction()}
      ${this.getFileSlicingFunction()}
      ${this.getBatchProcessFunction()}
      ${this.getMessageHandler()}
    `;
  }

  private static getMD5Function(): string {
    return `
      // MD5 计算 - 使用 Web Crypto API
      async function calculateMD5(buffer) {
        try {
          // 使用 SHA-256 (MD5 在现代浏览器中不推荐，但可以用其他哈希)
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
          // 降级到简单哈希
          let hash = 0;
          const view = new Uint8Array(buffer);
          for (let i = 0; i < view.length; i++) {
            hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
          }
          return Math.abs(hash).toString(16).padStart(8, '0');
        }
      }
    `;
  }

  private static getImageCompressionFunction(): string {
    return `
      // 图片压缩
      async function compressImage(imageData, options = {}) {
        try {
          const canvas = new OffscreenCanvas(
            options.width || 800, 
            options.height || 600
          );
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('无法获取 Canvas 上下文');
          }
          
          const bitmap = await createImageBitmap(imageData);
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          
          return await canvas.convertToBlob({ 
            type: options.type || 'image/jpeg', 
            quality: options.quality || 0.8 
          });
        } catch (error) {
          throw new Error('图片压缩失败: ' + error.message);
        }
      }
    `;
  }

  private static getFileSlicingFunction(): string {
    return `
      // 文件切片
      function sliceFile(file, chunkSize) {
        const chunks = [];
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          
          chunks.push({
            index: i,
            start,
            end,
            size: end - start
          });
        }
        
        return chunks;
      }
    `;
  }

  private static getBatchProcessFunction(): string {
    return `
      // 批量处理文件
      async function batchProcess(files, options) {
        const results = [];
        const total = files.length;
        
        for (let i = 0; i < total; i++) {
          try {
            const file = files[i];
            const result = { 
              file: file.name, 
              size: file.size 
            };

            // 计算 MD5
            if (options.calculateMD5) {
              const buffer = await file.arrayBuffer();
              result.md5 = await calculateMD5(buffer);
            }

            // 生成切片信息
            if (options.generateChunks) {
              const chunkSize = options.chunkSize || 2097152; // 2MB
              result.chunks = sliceFile(file, chunkSize);
              result.totalChunks = result.chunks.length;
            }

            results.push(result);
            
            // 发送进度
            self.postMessage({
              id: options.messageId,
              type: 'PROGRESS',
              success: true,
              progress: Math.round(((i + 1) / total) * 100)
            });

          } catch (error) {
            results.push({ 
              file: files[i].name, 
              error: error.message 
            });
          }
        }
        
        return results;
      }
    `;
  }

  private static getMessageHandler(): string {
    return `
      // 消息处理器
      self.onmessage = async function(event) {
        const { id, type, payload } = event.data;
        
        try {
          let result;
          
          switch (type) {
            case 'MD5_CALCULATE': {
              const buffer = await payload.file.arrayBuffer();
              result = await calculateMD5(buffer);
              break;
            }
              
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
              throw new Error('未知的消息类型: ' + type);
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
      
      // 错误处理
      self.onerror = function(error) {
        console.error('Worker 内部错误:', error);
      };
    `;
  }
}

// ==================== 主类：Worker 管理器 ====================
export default class UploadWorkerManager {
  private worker: Worker | null = null;
  private messageHandlers = new Map<string, (response: WorkerResponse) => void>();
  private progressHandlers = new Map<string, (progress: number) => void>();
  private messageId = 0;
  private isInitialized = false;

  constructor(workerScript?: string) {
    this.initWorker(workerScript);
  }

  // ==================== 初始化 ====================
  private initWorker(workerScript?: string): void {
    try {
      if (workerScript) {
        this.worker = new Worker(workerScript);
      } else {
        const blob = new Blob(
          [WorkerScriptGenerator.generate()], 
          { type: 'application/javascript' }
        );
        const url = URL.createObjectURL(blob);
        this.worker = new Worker(url);
        URL.revokeObjectURL(url); // 立即释放 URL
      }

      this.setupWorkerHandlers();
      this.isInitialized = true;

    } catch (error) {
      console.warn('Worker 初始化失败，将使用主线程模式:', error);
      this.worker = null;
      this.isInitialized = false;
    }
  }

  private setupWorkerHandlers(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      
      // 处理进度更新
      if (response.type === 'PROGRESS') {
        const progressHandler = this.progressHandlers.get(response.id);
        if (progressHandler && response.progress !== undefined) {
          progressHandler(response.progress);
        }
        return;
      }

      // 处理普通响应
      const handler = this.messageHandlers.get(response.id);
      if (handler) {
        handler(response);
        this.cleanupHandlers(response.id);
      }
    };

    this.worker.onerror = (error) => {
      console.error('Worker 错误:', error);
      this.handleWorkerError(error);
    };
  }

  private cleanupHandlers(messageId: string): void {
    this.messageHandlers.delete(messageId);
    this.progressHandlers.delete(messageId);
  }

  private handleWorkerError(error: ErrorEvent): void {
    // 通知所有等待的处理器
    this.messageHandlers.forEach((handler, id) => {
      handler({
        id,
        type: 'MD5_CALCULATE', // 默认类型
        success: false,
        error: error.message || 'Worker 发生错误'
      });
    });
    
    this.messageHandlers.clear();
    this.progressHandlers.clear();
  }

  // ==================== 消息发送 ====================
  private sendMessage<T = any>(
    type: WorkerMessageType, 
    payload: any,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const messageId = (++this.messageId).toString();

      // Worker 不可用时降级到主线程
      if (!this.worker || !this.isInitialized) {
        this.fallbackToMainThread(type, payload, onProgress)
          .then(resolve)
          .catch(reject);
        return;
      }

      // 设置超时
      const timeout = setTimeout(() => {
        this.cleanupHandlers(messageId);
        reject(new Error(`Worker 响应超时 (${CONSTANTS.TIMEOUT}ms)`));
      }, CONSTANTS.TIMEOUT);

      // 注册进度处理器
      if (onProgress) {
        this.progressHandlers.set(messageId, onProgress);
      }

      // 注册响应处理器
      this.messageHandlers.set(messageId, (response: WorkerResponse) => {
        clearTimeout(timeout);

        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Worker 处理失败'));
        }
      });

      // 发送消息
      try {
        this.worker.postMessage({ id: messageId, type, payload });
      } catch (error) {
        clearTimeout(timeout);
        this.cleanupHandlers(messageId);
        reject(new Error(`发送消息失败: ${(error as Error).message}`));
      }
    });
  }

  // ==================== 主线程降级处理 ====================
  private async fallbackToMainThread(
    type: WorkerMessageType, 
    payload: any,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    switch (type) {
      case 'MD5_CALCULATE':
        return await this.calculateMD5InMainThread(payload.file);

      case 'SLICE_FILE':
        return this.sliceFileInMainThread(payload.file, payload.chunkSize);

      case 'BATCH_PROCESS':
        return await this.batchProcessInMainThread(
          payload.files, 
          payload.options,
          onProgress
        );

      case 'COMPRESS_IMAGE':
        throw new Error('主线程不支持图片压缩，请使用 Worker 模式');

      default:
        throw new Error(`不支持的操作类型: ${type}`);
    }
  }

  private async calculateMD5InMainThread(file: File): Promise<string> {
    try {
      return await calculateFileMD5(file);
    } catch (error) {
      throw new Error(`MD5 计算失败: ${(error as Error).message}`);
    }
  }

  private sliceFileInMainThread(file: File, chunkSize: number): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      
      chunks.push({
        index: i,
        start,
        end,
        size: end - start
      });
    }
    
    return chunks;
  }

  private async batchProcessInMainThread(
    files: File[], 
    options: BatchProcessOptions,
    onProgress?: (progress: number) => void
  ): Promise<any[]> {
    const results: any[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      try {
        const file = files[i];
        const result: any = { file: file.name, size: file.size };

        if (options.calculateMD5) {
          result.md5 = await this.calculateMD5InMainThread(file);
        }

        if (options.generateChunks) {
          const chunkSize = options.chunkSize || CONSTANTS.DEFAULT_CHUNK_SIZE;
          result.chunks = this.sliceFileInMainThread(file, chunkSize);
          result.totalChunks = result.chunks.length;
        }

        results.push(result);

        // 更新进度
        if (onProgress) {
          onProgress(Math.round(((i + 1) / total) * 100));
        }

      } catch (error) {
        results.push({ 
          file: files[i].name, 
          error: (error as Error).message 
        });
      }
    }

    return results;
  }

  // ==================== 公共 API ====================
  public async calculateMD5(file: File): Promise<string> {
    return this.sendMessage<string>('MD5_CALCULATE', { file });
  }

  public async compressImage(
    imageData: ImageBitmap | Blob, 
    options?: {
      width?: number;
      height?: number;
      type?: string;
      quality?: number;
    }
  ): Promise<Blob> {
    return this.sendMessage<Blob>('COMPRESS_IMAGE', { imageData, options });
  }

  public async sliceFile(file: File, chunkSize: number): Promise<ChunkInfo[]> {
    return this.sendMessage<ChunkInfo[]>('SLICE_FILE', { file, chunkSize });
  }

  public async batchProcess(
    files: File[], 
    options: BatchProcessOptions = {}
  ): Promise<any[]> {
    return this.sendMessage<any[]>(
      'BATCH_PROCESS', 
      { files, options },
      options.onProgress
    );
  }

  // ==================== 工具方法 ====================
  public isAvailable(): boolean {
    return this.worker !== null && this.isInitialized;
  }

  public getWorkerStatus(): {
    available: boolean;
    pendingMessages: number;
    activeProgressTrackers: number;
  } {
    return {
      available: this.isAvailable(),
      pendingMessages: this.messageHandlers.size,
      activeProgressTrackers: this.progressHandlers.size
    };
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.messageHandlers.clear();
    this.progressHandlers.clear();
    this.isInitialized = false;
  }

  // ==================== 重新初始化 ====================
  public reinitialize(workerScript?: string): void {
    this.terminate();
    this.initWorker(workerScript);
  }
}