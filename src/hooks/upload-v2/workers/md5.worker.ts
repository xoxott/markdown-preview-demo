/**
 * MD5 计算 Worker
 * 在 Web Worker 中计算文件 MD5，避免阻塞主线程
 */

// @ts-ignore - SparkMD5 类型定义可能不完整
importScripts('https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js');

interface MD5Message {
  type: 'calculate';
  fileChunks: ArrayBuffer[];
  chunkIndex: number;
}

interface MD5Result {
  type: 'result';
  md5: string;
  chunkIndex: number;
}

interface MD5Progress {
  type: 'progress';
  progress: number;
  chunkIndex: number;
}

type MD5WorkerMessage = MD5Message | MD5Result | MD5Progress;

self.onmessage = function(e: MessageEvent<MD5Message>) {
  const { fileChunks, chunkIndex } = e.data;

  try {
    const spark = new (self as any).SparkMD5.ArrayBuffer();
    const totalChunks = fileChunks.length;

    fileChunks.forEach((chunk, index) => {
      spark.append(chunk);
      
      // 发送进度更新
      const progress = Math.round(((index + 1) / totalChunks) * 100);
      self.postMessage({
        type: 'progress',
        progress,
        chunkIndex
      } as MD5Progress);
    });

    const md5 = spark.end();

    // 发送结果
    self.postMessage({
      type: 'result',
      md5,
      chunkIndex
    } as MD5Result);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: (error as Error).message,
      chunkIndex
    });
  }
};

