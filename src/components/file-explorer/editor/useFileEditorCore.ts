import { onBeforeUnmount, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import type { IFileDataSource } from '../datasources/types';
import type { FileItem } from '../types/file-explorer';

interface ElementWithWebkitFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

interface DocumentWithWebkitFullscreen extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
}

export interface UseFileEditorCoreOptions {
  file: FileItem;
  dataSource: IFileDataSource;
  content: string;
  onSave?: (file: FileItem, content: string) => Promise<void>;
}

/** 文件编辑器共享状态：内容、脏标记、保存、全屏 */
export function useFileEditorCore(options: UseFileEditorCoreOptions) {
  const message = useMessage();
  const editorContent = ref(options.content);
  const isDirty = ref(false);
  const saving = ref(false);
  const wrapperRef = ref<HTMLElement>();
  const isFullscreen = ref(false);

  watch(
    () => options.content,
    newContent => {
      if (editorContent.value !== newContent) {
        editorContent.value = newContent;
        isDirty.value = false;
      }
    }
  );

  const handleContentChange = (value: string) => {
    editorContent.value = value;
    isDirty.value = value !== options.content;
  };

  const handleSave = async () => {
    if (!isDirty.value) {
      message.info('文件未修改');
      return;
    }

    try {
      saving.value = true;
      if (options.onSave) {
        await options.onSave(options.file, editorContent.value);
      } else {
        await options.dataSource.writeFile(options.file.path, editorContent.value);
      }
      isDirty.value = false;
      message.success('保存成功');
    } catch (error: unknown) {
      message.error(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      saving.value = false;
    }
  };

  const handleToggleFullscreen = () => {
    if (!wrapperRef.value) return;
    if (!isFullscreen.value) {
      const el = wrapperRef.value;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else {
        (el as ElementWithWebkitFullscreen).webkitRequestFullscreen?.();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else {
      (document as DocumentWithWebkitFullscreen).webkitExitFullscreen?.();
    }
  };

  const handleFullscreenChange = () => {
    isFullscreen.value = Boolean(
      document.fullscreenElement ||
        (document as DocumentWithWebkitFullscreen).webkitFullscreenElement
    );
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  });

  const copyContent = async (getText: () => string) => {
    try {
      await navigator.clipboard.writeText(getText());
      message.success('复制成功');
    } catch {
      message.error('复制失败');
    }
  };

  return {
    editorContent,
    isDirty,
    saving,
    wrapperRef,
    isFullscreen,
    handleContentChange,
    handleSave,
    handleToggleFullscreen,
    copyContent
  };
}

export type FileEditorCore = ReturnType<typeof useFileEditorCore>;
