/**
 * 文件类型工具函数
 */
import {
  ArchiveOutline,
  DocumentOutline,
  DocumentTextOutline,
  ImageOutline,
  MusicalNoteOutline,
  VideocamOutline
} from '@vicons/ionicons5';

/** 文件类型配置 */
interface FileTypeConfig {
  icon: any;
  color: string;
  category: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
}

/** 文件类型映射 */
const FILE_TYPE_MAP: Record<string, FileTypeConfig> = {
  image: {
    icon: ImageOutline,
    color: '#18a058',
    category: 'image'
  },
  video: {
    icon: VideocamOutline,
    color: '#2080f0',
    category: 'video'
  },
  audio: {
    icon: MusicalNoteOutline,
    color: '#f0a020',
    category: 'audio'
  },
  pdf: {
    icon: DocumentTextOutline,
    color: '#d03050',
    category: 'document'
  },
  archive: {
    icon: ArchiveOutline,
    color: '#7c3aed',
    category: 'archive'
  },
  default: {
    icon: DocumentOutline,
    color: '#666',
    category: 'other'
  }
};

/**
 * 检测文件类型
 */
export function detectFileType(mimeType: string): keyof typeof FILE_TYPE_MAP {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  return 'default';
}

/**
 * 获取文件图标
 */
export function getFileIcon(mimeType: string) {
  return FILE_TYPE_MAP[detectFileType(mimeType)].icon;
}

/**
 * 获取文件颜色
 */
export function getFileColor(mimeType: string): string {
  return FILE_TYPE_MAP[detectFileType(mimeType)].color;
}

/**
 * 获取文件类型配置
 */
export function getFileTypeConfig(mimeType: string): FileTypeConfig {
  return FILE_TYPE_MAP[detectFileType(mimeType)];
}

