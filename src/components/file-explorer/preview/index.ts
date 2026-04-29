export { default as FilePreview } from './FilePreview';
export { PreviewHeader } from './PreviewHeader';
export { PreviewLoading } from './PreviewLoading';
export { PreviewError } from './PreviewError';
export { UnsupportedPreview } from './UnsupportedPreview';
export {
  previewRegistry,
  registerPreviewer,
  getPreviewer,
  getFileCategory
} from './previewRegistry';
export type { PreviewerProps, FileCategory, PreviewerRegistration, PreviewerMatch } from './types';

// 导出所有预览器（供外部单独使用或动态注册）
export {
  ImagePreviewer,
  VideoPreviewer,
  AudioPreviewer,
  PDFPreviewer,
  MarkdownPreviewer,
  CodePreviewer,
  OfficePreviewer,
  ArchivePreviewer,
  SvgPreviewer,
  MermaidPreviewer,
  EchartsPreviewer,
  MindmapPreviewer,
  FontPreviewer
} from './previewers';
