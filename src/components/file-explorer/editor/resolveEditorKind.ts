import { MARKDOWN_EXTENSIONS } from '../open/fileOpenExtensions';

export type FileEditorKind = 'markdown' | 'code';

/** 根据扩展名选择编辑器类型 */
export function resolveEditorKind(extension?: string): FileEditorKind {
  if (!extension) return 'code';
  return MARKDOWN_EXTENSIONS.has(extension.toLowerCase()) ? 'markdown' : 'code';
}
