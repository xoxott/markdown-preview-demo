/**
 * 文件相关工具函数
 * 专注于文件信息提取和处理
 */
import { formatFileSize } from './format';

// ==================== 文件信息提取 ====================
/** 获取文件扩展名 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/** 获取文件名（不含扩展名） */
export function getFileNameWithoutExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}

/** 获取文件的完整信息 */
export async function getFileInfo(file: File): Promise<{
  name: string;
  nameWithoutExt: string;
  extension: string;
  size: number;
  sizeFormatted: string;
  type: string;
  lastModified: number;
  lastModifiedDate: Date;
  md5?: string;
  duration?: number;
}> {
  const info = {
    name: file.name,
    nameWithoutExt: getFileNameWithoutExtension(file.name),
    extension: getFileExtension(file.name),
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    type: file.type,
    lastModified: file.lastModified,
    lastModifiedDate: new Date(file.lastModified)
  };

  return info;
}

