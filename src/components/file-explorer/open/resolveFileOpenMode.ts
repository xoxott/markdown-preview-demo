import { ensurePreviewRegistryReady } from '../preview/ensurePreviewRegistryReady';
import { previewRegistry } from '../preview/previewRegistry';
import type { FileEditorKind } from '../editor/resolveEditorKind';
import { resolveEditorKind } from '../editor/resolveEditorKind';
import type { FileItem } from '../types/file-explorer';
import { MARKDOWN_EXTENSIONS, isTextEditableExtension } from './fileOpenExtensions';

export type FileOpenPreference = 'auto' | FileEditorKind | 'preview';

export type FileOpenMode =
  | { type: 'editor'; editorKind: FileEditorKind }
  | { type: 'preview' }
  | { type: 'unsupported'; message: string };

const EDITOR_LABEL: Record<FileEditorKind, string> = {
  markdown: 'Markdown 编辑器',
  code: '代码编辑器'
};

/** 解析文件应如何打开（与双击「打开」逻辑一致） */
export function resolveFileOpenMode(
  file: FileItem,
  preference: FileOpenPreference = 'auto'
): FileOpenMode | 'folder' {
  ensurePreviewRegistryReady();

  if (file.type === 'folder') {
    return 'folder';
  }

  const extension = file.extension?.toLowerCase();
  const canPreview = previewRegistry.canPreview(extension, file.mimeType);
  const canEdit = isTextEditableExtension(extension);

  if (preference === 'preview') {
    if (canPreview) {
      return { type: 'preview' };
    }
    return {
      type: 'unsupported',
      message: `「${file.name}」暂不支持预览`
    };
  }

  if (preference === 'markdown') {
    if (!extension || !MARKDOWN_EXTENSIONS.has(extension)) {
      return {
        type: 'unsupported',
        message: `「${file.name}」不是 Markdown 文件，无法使用 Markdown 编辑器打开`
      };
    }
    return { type: 'editor', editorKind: 'markdown' };
  }

  if (preference === 'code') {
    if (!canEdit) {
      return {
        type: 'unsupported',
        message: `「${file.name}」不是可编辑的文本文件，无法使用代码编辑器打开`
      };
    }
    return { type: 'editor', editorKind: 'code' };
  }

  // auto：优先内置编辑器，其次预览器
  if (canEdit) {
    return { type: 'editor', editorKind: resolveEditorKind(extension) };
  }
  if (canPreview) {
    return { type: 'preview' };
  }

  return {
    type: 'unsupported',
    message: `暂无适合打开「${file.name}」的方式，请下载后使用本地程序查看`
  };
}

export interface OpenWithMenuItem {
  key: string;
  label: string;
}

/** 根据文件生成「打开方式」子菜单（仅包含当前文件可用的项） */
export function getOpenWithMenuItems(file: FileItem): OpenWithMenuItem[] {
  ensurePreviewRegistryReady();

  if (file.type === 'folder') {
    return [];
  }

  const extension = file.extension?.toLowerCase();
  const items: OpenWithMenuItem[] = [];
  const canPreview = previewRegistry.canPreview(extension, file.mimeType);
  const canEdit = isTextEditableExtension(extension);
  const autoKind = canEdit ? resolveEditorKind(extension) : null;

  if (autoKind === 'markdown') {
    items.push({ key: 'open-markdown', label: EDITOR_LABEL.markdown });
  }
  if (canEdit) {
    items.push({ key: 'open-code', label: EDITOR_LABEL.code });
  }
  if (canPreview) {
    items.push({ key: 'open-preview', label: '预览' });
  }

  const autoMode = resolveFileOpenMode(file, 'auto');
  if (autoMode === 'folder' || autoMode.type === 'unsupported') {
    return items;
  }

  const autoKey =
    autoMode.type === 'preview'
      ? 'open-preview'
      : autoMode.editorKind === 'markdown'
        ? 'open-markdown'
        : 'open-code';

  return items.filter(item => item.key !== autoKey);
}
