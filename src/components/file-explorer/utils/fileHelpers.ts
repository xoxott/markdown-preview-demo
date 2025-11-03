import { FileCode, FileText, Folder, Music, Video,File, Photo } from "@vicons/tabler"
import { FileItem } from "../types/file-explorer"

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function formatDate(date?: Date): string {
  if (!date) return '-'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const getFileIcon = (item: FileItem) => {
  if (item.type === 'folder') return Folder;
  
  const ext = item.extension?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return Photo;
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext || '')) return Video;
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) return Music;
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp'].includes(ext || '')) return FileCode;
  if (['txt', 'md', 'doc', 'docx'].includes(ext || '')) return FileText;
  
  return File;
};

export const getFileColor = (item: FileItem): string => {
  if (item.color) return item.color;
  if (item.type === 'folder') return '#60a5fa';
  
  const ext = item.extension?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '#f59e0b';
  if (['mp4', 'avi', 'mov'].includes(ext || '')) return '#ec4899';
  if (['mp3', 'wav'].includes(ext || '')) return '#8b5cf6';
  if (['js', 'ts', 'jsx', 'tsx'].includes(ext || '')) return '#eab308';
  
  return '#6b7280';
};