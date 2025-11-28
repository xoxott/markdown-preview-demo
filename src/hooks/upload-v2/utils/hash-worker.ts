/**
 * 基于 Web Worker 的 MD5 计算工具
 */
import { CONSTANTS } from '../constants';

const CHUNK_SIZE = CONSTANTS.UPLOAD.CHUNK_SIZE; // 2MB per chunk for MD5 calculation

/**
 * 在 Worker 中计算文件 MD5
 */
export async function calculateFileMD5WithWorker(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 检查是否支持 Worker
    if (typeof Worker === 'undefined') {
      reject(new Error('当前环境不支持 Web Worker'));
      return;
    }

    // 创建 Worker（使用内联 worker 或外部文件）
    let worker: Worker;

    try {
      // 尝试使用内联 worker
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js');

        self.onmessage = function(e) {
          const { fileChunks, chunkIndex } = e.data;
          try {
            const spark = new SparkMD5.ArrayBuffer();
            const totalChunks = fileChunks.length;

            fileChunks.forEach((chunk, index) => {
              spark.append(chunk);
              const progress = Math.round(((index + 1) / totalChunks) * 100);
              self.postMessage({ type: 'progress', progress, chunkIndex });
            });

            const md5 = spark.end();
            self.postMessage({ type: 'result', md5, chunkIndex });
          } catch (error) {
            self.postMessage({ type: 'error', error: error.message, chunkIndex });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);

      // 清理 URL
      worker.addEventListener('message', () => {
        // 延迟清理，确保 worker 已加载
        setTimeout(() => URL.revokeObjectURL(workerUrl), CONSTANTS.WORKER.URL_CLEANUP_DELAY);
      });
    } catch (error) {
      // 如果内联 worker 失败，回退到主线程计算
      // 静默失败，回退到主线程
      if (import.meta.env.DEV) {
        console.warn('Worker 创建失败，回退到主线程计算:', error);
      }
      reject(error);
      return;
    }

    // 读取文件分片
    const chunks: ArrayBuffer[] = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let loadedChunks = 0;

    const loadChunks = async () => {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const arrayBuffer = await chunk.arrayBuffer();
        chunks.push(arrayBuffer);
        loadedChunks++;
      }

      // 所有分片加载完成后，发送给 Worker
      worker.postMessage({
        type: 'calculate',
        fileChunks: chunks,
        chunkIndex: 0
      });
    };

    // 监听 Worker 消息
    worker.onmessage = (e: MessageEvent) => {
      const { type, progress, md5, error } = e.data;

      if (type === 'progress' && onProgress) {
        onProgress(progress);
      } else if (type === 'result') {
        worker.terminate();
        resolve(md5);
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(error));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    // 开始加载分片
    loadChunks().catch(reject);
  });
}

/**
 * 智能选择计算方式（Worker 或主线程）
 */
export async function calculateFileMD5Smart(
  file: File,
  useWorker: boolean = true,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 如果文件较小或不需要 Worker，直接在主线程计算
  if (!useWorker || file.size < 10 * 1024 * 1024) {
    const { calculateFileMD5 } = await import('./hash');
    return calculateFileMD5(file, onProgress);
  }

  // 尝试使用 Worker
  try {
    return await calculateFileMD5WithWorker(file, onProgress);
  } catch (error) {
    // Worker 失败时回退到主线程
    // 静默失败，回退到主线程
    if (import.meta.env.DEV) {
      console.warn('Worker 计算失败，回退到主线程:', error);
    }
    const { calculateFileMD5 } = await import('./hash');
    return calculateFileMD5(file, onProgress);
  }
}

