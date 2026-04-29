/**
 * 文件扩展名分类统一映射表
 *
 * 用于：图标选择、颜色选择、拖拽预览颜色、分类标签显示 预览器注册表（previewRegistry）的扩展名列表更全面，此处只列出核心分类
 */

export type FileCategoryType =
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'document'
  | 'archive'
  | 'folder'
  | 'other';

export const EXTENSION_CATEGORIES: Record<FileCategoryType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif', 'tiff', 'tif'],
  video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'ogg', '3gp', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mid', 'midi'],
  code: [
    'js',
    'mjs',
    'cjs',
    'ts',
    'jsx',
    'tsx',
    'vue',
    'html',
    'css',
    'scss',
    'less',
    'json',
    'xml',
    'yaml',
    'yml',
    'sh',
    'bash',
    'py',
    'java',
    'cpp',
    'c',
    'h',
    'go',
    'rs',
    'sql',
    'r',
    'lua',
    'rb',
    'php',
    'cs',
    'swift',
    'kt',
    'dart',
    'scala'
  ],
  document: ['txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'rtf'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
  folder: [],
  other: []
};

/** 根据扩展名获取文件分类 */
export function getFileCategoryByExtension(ext?: string): FileCategoryType {
  if (!ext) return 'other';
  const lower = ext.toLowerCase();
  for (const [category, extensions] of Object.entries(EXTENSION_CATEGORIES)) {
    if (category === 'folder' || category === 'other') continue;
    if (extensions.includes(lower)) return category as FileCategoryType;
  }
  return 'other';
}
