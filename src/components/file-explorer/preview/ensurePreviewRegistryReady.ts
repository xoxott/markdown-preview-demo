import { previewRegistry } from './previewRegistry';
import { ImagePreviewer } from './previewers/ImagePreviewer';
import { VideoPreviewer } from './previewers/VideoPreviewer';
import { AudioPreviewer } from './previewers/AudioPreviewer';
import { PDFPreviewer } from './previewers/PDFPreviewer';
import { MarkdownPreviewer } from './previewers/MarkdownPreviewer';
import { CodePreviewer } from './previewers/CodePreviewer';
import { OfficePreviewer } from './previewers/OfficePreviewer';
import { ArchivePreviewer } from './previewers/ArchivePreviewer';
import { SvgPreviewer } from './previewers/SvgPreviewer';
import { MermaidPreviewer } from './previewers/MermaidPreviewer';
import { EchartsPreviewer } from './previewers/EchartsPreviewer';
import { MindmapPreviewer } from './previewers/MindmapPreviewer';
import { FontPreviewer } from './previewers/FontPreviewer';

let registryInitialized = false;

/** 注册内置预览器（幂等，供 FilePreview 与打开方式解析共用） */
export function ensurePreviewRegistryReady(): void {
  if (registryInitialized) return;
  registryInitialized = true;

  previewRegistry.registerAll([
    { category: 'svg', extensions: ['svg'], component: SvgPreviewer, priority: 10 },
    {
      category: 'image',
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'avif', 'tiff', 'tif'],
      component: ImagePreviewer
    },
    {
      category: 'video',
      extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'ogg', '3gp', 'wmv', 'm4v'],
      component: VideoPreviewer
    },
    {
      category: 'audio',
      extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mid', 'midi'],
      component: AudioPreviewer
    },
    { category: 'pdf', extensions: ['pdf'], component: PDFPreviewer },
    { category: 'markdown', extensions: ['md', 'markdown'], component: MarkdownPreviewer },
    {
      category: 'code',
      extensions: [
        'js',
        'mjs',
        'cjs',
        'ts',
        'jsx',
        'tsx',
        'vue',
        'css',
        'scss',
        'less',
        'html',
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
        'rust',
        'rs',
        'sql',
        'r',
        'lua',
        'perl',
        'pl',
        'rb',
        'php',
        'cs',
        'swift',
        'kt',
        'dart',
        'scala',
        'clj',
        'coffee',
        'make',
        'dockerfile',
        'gitignore',
        'env',
        'log',
        'conf',
        'ini',
        'toml',
        'csv',
        'txt'
      ],
      component: CodePreviewer
    },
    { category: 'mermaid', extensions: ['mermaid', 'mmd'], component: MermaidPreviewer },
    { category: 'echarts', extensions: ['echarts', 'chart'], component: EchartsPreviewer },
    { category: 'mindmap', extensions: ['markmap', 'mm'], component: MindmapPreviewer },
    {
      category: 'office',
      extensions: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
      component: OfficePreviewer
    },
    {
      category: 'archive',
      extensions: ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz'],
      component: ArchivePreviewer
    },
    { category: 'font', extensions: ['ttf', 'otf', 'woff', 'woff2'], component: FontPreviewer }
  ]);
}
