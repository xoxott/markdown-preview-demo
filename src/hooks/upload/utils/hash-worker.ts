/** 基于 Web Worker 的 MD5 计算工具（bundled spark-md5, streaming chunks） */
import sparkMD5Source from 'spark-md5/spark-md5.min.js?raw';
import { CONSTANTS } from '../constants';
import { getAdapter } from '../adapters';

// 使用 Vite ?raw 导入打包 spark-md5 源码（消除 CDN 依赖）

const CHUNK_SIZE = CONSTANTS.UPLOAD.CHUNK_SIZE;

/** 创建内联 MD5 Worker（包含 bundled spark-md5） */
function createMD5Worker(): Worker {
  const workerCode = `
    // Bundled spark-md5（无需 CDN importScripts）
    ${sparkMD5Source}

    self.onmessage = function(e) {
      const { type } = e.data;

      if (type === 'append') {
        // 流式接收：逐块传输 ArrayBuffer
        const { chunk, chunkIndex, totalChunks } = e.data;
        if (!self._spark) {
          self._spark = new SparkMD5.ArrayBuffer();
          self._totalChunks = totalChunks;
          self._processedChunks = 0;
        }
        self._spark.append(chunk);
        self._processedChunks += 1;
        const progress = Math.round((self._processedChunks / self._totalChunks) * 100);
        self.postMessage({ type: 'progress', progress, chunkIndex });
      } else if (type === 'end') {
        // 终结计算
        if (self._spark) {
          const md5 = self._spark.end();
          self.postMessage({ type: 'result', md5 });
          self._spark = null;
          self._processedChunks = 0;
          self._totalChunks = 0;
        } else {
          self.postMessage({ type: 'error', error: 'No data received before end' });
        }
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);

  // 延迟清理 Blob URL
  setTimeout(() => URL.revokeObjectURL(workerUrl), CONSTANTS.WORKER.URL_CLEANUP_DELAY);

  return worker;
}

/** 流式传输文件分片到 Worker 计算 MD5 */
export async function calculateFileMD5WithWorker(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      reject(new Error('当前环境不支持 Web Worker'));
      return;
    }

    let worker: Worker;
    try {
      worker = createMD5Worker();
    } catch (error) {
      if (getAdapter().isDev()) {
        console.warn('Worker 创建失败，回退到主线程计算:', error);
      }
      reject(error);
      return;
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

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

    worker.onerror = error => {
      worker.terminate();
      reject(error);
    };

    // 流式传输：逐块读取 ArrayBuffer 并 Transferable 传给 Worker
    // 内存峰值从 ~2x 文件大小降至 ~1 块大小（2MB）
    const streamChunks = async () => {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const arrayBuffer = await chunkBlob.arrayBuffer();

        // Transferable 零拷贝传输：主线程失去所有权
        worker.postMessage({ type: 'append', chunk: arrayBuffer, chunkIndex: i, totalChunks }, [
          arrayBuffer
        ]);
      }

      // 通知 Worker 终结计算
      worker.postMessage({ type: 'end' });
    };

    streamChunks().catch(reject);
  });
}

/** 智能 MD5 计算：大文件用 Worker，小文件用主线程 */
export async function calculateFileMD5Smart(
  file: File,
  useWorker: boolean = true,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 文件较小或不需要 Worker，直接在主线程计算
  if (!useWorker || file.size < 10 * 1024 * 1024) {
    const { calculateFileMD5 } = await import('./hash');
    return calculateFileMD5(file, onProgress);
  }

  // 尝试使用 Worker
  try {
    return await calculateFileMD5WithWorker(file, onProgress);
  } catch (error) {
    // Worker 失败时回退到主线程
    if (getAdapter().isDev()) {
      console.warn('Worker 计算失败，回退到主线程:', error);
    }
    const { calculateFileMD5 } = await import('./hash');
    return calculateFileMD5(file, onProgress);
  }
}
