import { FileItem } from "../types/file-explorer"

/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:53:38
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 16:53:51
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\utils\fileHelpers.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
  
  return date.toLocaleDateString('zh-CN')
}

export function getFileIcon(type: FileItem['type']) {
  const iconMap = {
    folder: 'FolderOutline',
    document: 'DocumentTextOutline',
    image: 'ImageOutline',
    audio: 'MusicalNoteOutline',
    video: 'VideocameraOutline',
    file: 'DocumentOutline'
  }
  return iconMap[type] || 'DocumentOutline'
}

export function getFileColor(type: FileItem['type']) {
  const colorMap = {
    folder: '#f0b90b',
    document: '#f56c6c',
    image: '#67c23a',
    audio: '#409eff',
    video: '#e6a23c',
    file: '#909399'
  }
  return colorMap[type] || '#909399'
}