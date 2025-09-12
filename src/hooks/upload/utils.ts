/* eslint-disable no-plusplus */
import SparkMD5 from 'spark-md5';
import * as Apis from '@/service/api';
import { localStg } from '@/utils/storage';

/** 生成唯一ID */
export function generateId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * 字符串格式大小转字节数，如 '2MB' => 2097152
 *
 * @param size - 字符串格式大小
 * @returns 字节数
 */
export function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;
  const unit = size.toUpperCase().match(/[A-Z]+/)?.[0];
  const num = Number.parseFloat(size);

  const unitMap: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3
  };

  return unit && unitMap[unit] ? num * unitMap[unit] : num;
}
/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export const delay = (time: number) =>
  new Promise<void>(resolve => {
    setTimeout(() => resolve(), time);
  });

/** 格式化速度 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/** 格式化时间 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

/** 获取媒体文件的 duration（秒） */
export function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video');
    media.preload = 'metadata';

    media.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(media.duration);
    };

    media.onerror = e => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取媒体文件时长'));
    };

    media.src = url;
  });
}

/** safari 浏览器开启锁定模式无法获取到文件对象 */
export function isSafariLockMode(): boolean {
  // console.log(navigator.userAgent, '当前浏览器');
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const fileReaderMissing = typeof FileReader === 'undefined';
  return isSafari && fileReaderMissing;
}

/** 计算文件MD5 */
export async function calculateFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      // 这里应该使用 crypto-js 或其他MD5库
      // 简化实现，实际项目中需要引入相关库
      resolve(btoa(String.fromCharCode(...new Uint8Array(arrayBuffer))).substr(0, 32));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

interface FileHashResult {
  hash: string;
  fileName: string;
  fileSize: number;
  chunkCount: number;
  chunkSize: number;
  hashAlgorithm: 'md5';
}

type ChunkSizeString = `${number}${'B' | 'KB' | 'MB' | 'GB'}`;
/**
 * 计算文件的哈希值并返回附加信息
 *
 * @param file - 文件对象
 * @param onProgress - 可选，进度回调（0~100）
 * @returns Promise<FileHashResult>
 */
export async function calculateFileHashWithInfo(
  file: File,
  chunkSizeInput: number | ChunkSizeString,
  onProgress?: (percent: number) => void
): Promise<FileHashResult> {
  return new Promise((resolve, reject) => {
    const chunkSize = parseSize(chunkSizeInput);
    if (!file.size) {
      reject(new Error('文件大小为0'));
    }
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      reader.readAsArrayBuffer(file.slice(start, end));
    }

    reader.onload = e => {
      const result = e.target?.result;
      if (result) {
        spark.append(result as ArrayBuffer);
        currentChunk++;

        if (onProgress) {
          const percent = Math.floor((currentChunk / totalChunks) * 100);
          onProgress(percent);
        }

        if (currentChunk < totalChunks) {
          loadNext();
        } else {
          const hash = spark.end();
          resolve({
            hash,
            fileName: file.name,
            fileSize: file.size,
            chunkCount: totalChunks,
            chunkSize,
            hashAlgorithm: 'md5'
          });
        }
      } else {
        reject(new Error('文件读取失败'));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件出错'));
    };

    loadNext();
  });
}

export async function getUpdateToken() {
  if (localStg.get('token')) {
    const {
      data: { upload_key },
      error
    }: any = await Apis.fetchGetUserInfo();
    return upload_key || '';
  }
  return '';
}
