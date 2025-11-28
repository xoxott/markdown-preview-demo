/**
 * 哈希计算工具函数
 */
import SparkMD5 from 'spark-md5';

// ==================== 常量定义 ====================
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk for MD5 calculation

// ==================== MD5 计算 ====================
/**
 * 计算文件 MD5（使用 SparkMD5，支持大文件分片计算）
 *
 * @param file - 文件对象
 * @param onProgress - 进度回调
 * @returns MD5 字符串
 */
export async function calculateFileMD5(file: File, onProgress?: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();
    const chunkSize = CHUNK_SIZE;
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    const loadNext = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);

      fileReader.readAsArrayBuffer(file.slice(start, end));
    };

    fileReader.onload = e => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        spark.append(arrayBuffer);
        currentChunk++;

        // 更新进度
        if (onProgress) {
          const progress = Math.round((currentChunk / chunks) * 100);
          onProgress(progress);
        }

        if (currentChunk < chunks) {
          loadNext();
        } else {
          const md5 = spark.end();
          resolve(md5);
        }
      } catch (error) {
        reject(new Error(`MD5 计算失败: ${(error as Error).message}`));
      }
    };

    fileReader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    // 开始读取第一个分片
    loadNext();
  });
}

/**
 * 批量计算文件 MD5
 *
 * @param files - 文件数组
 * @param onProgress - 总体进度回调
 * @returns MD5 数组
 */
export async function calculateFilesMD5(
  files: File[],
  onProgress?: (progress: number, currentFile: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const md5 = await calculateFileMD5(files[i], fileProgress => {
      if (onProgress) {
        const overallProgress = ((i + fileProgress / 100) / total) * 100;
        onProgress(overallProgress, i + 1, total);
      }
    });
    results.push(md5);
  }

  return results;
}

/** 计算字符串的 MD5 */
export function calculateStringMD5(str: string): string {
  return SparkMD5.hash(str);
}

/** 计算文件 SHA-256（使用 Web Crypto API） */
export async function calculateFileSHA256(file: File, onProgress?: (progress: number) => void): Promise<string> {
  const chunkSize = CHUNK_SIZE;
  const chunks = Math.ceil(file.size / chunkSize);
  const hashBuffer: Uint8Array[] = [];

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const arrayBuffer = await chunk.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', arrayBuffer);
    hashBuffer.push(new Uint8Array(hash));

    if (onProgress) {
      onProgress(Math.round(((i + 1) / chunks) * 100));
    }
  }

  // 合并所有哈希
  const totalLength = hashBuffer.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of hashBuffer) {
    combined.set(arr, offset);
    offset += arr.length;
  }

  // 最终哈希
  const finalHash = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(finalHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

