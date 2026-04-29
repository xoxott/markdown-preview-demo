import type { Component } from 'vue';
import { File, FileCode, FileText, Folder, Music, Photo, Video } from '@vicons/tabler';
import type { FileItem } from '../types/file-explorer';
import { getFileCategoryByExtension } from '../config/extensionCategories';

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/** 相对时间格式（今天/昨天/N天前） */
export function formatDate(date?: Date): string {
  if (!date) return '-';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/** 完整日期时间格式（年月日时分秒） */
export function formatDateTime(date?: string | Date): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** 分类 → 图标映射 */
const CATEGORY_ICON_MAP: Record<string, Component> = {
  image: Photo,
  video: Video,
  audio: Music,
  code: FileCode,
  document: FileText,
  folder: Folder,
  other: File
};

export const getFileIcon = (item: FileItem) => {
  if (item.type === 'folder') return Folder;
  const category = getFileCategoryByExtension(item.extension);
  return CATEGORY_ICON_MAP[category] ?? File;
};

/** 分类 → 颜色映射 */
const CATEGORY_COLOR_MAP: Record<string, string> = {
  image: '#f59e0b',
  video: '#ec4899',
  audio: '#8b5cf6',
  code: '#eab308',
  document: '#60a5fa',
  archive: '#f97316',
  folder: '#60a5fa',
  other: '#6b7280'
};

export const getFileColor = (item: FileItem): string => {
  if (item.color) return item.color;
  const category = item.type === 'folder' ? 'folder' : getFileCategoryByExtension(item.extension);
  return CATEGORY_COLOR_MAP[category] ?? '#6b7280';
};
