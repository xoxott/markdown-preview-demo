import { computed, ref } from 'vue';
import type { FileCategory } from '../preview/types';
import type { FileItem } from '../types/file-explorer';
import { previewRegistry } from '../preview/previewRegistry';

/** 文件预览 Hook — 管理预览状态，通过注册表查询文件类型 */
export function useFilePreview() {
  const previewItem = ref<FileItem | null>(null);
  const isPreviewOpen = ref(false);

  /** 打开预览 */
  const openPreview = (item: FileItem) => {
    previewItem.value = item;
    isPreviewOpen.value = true;
  };

  /** 关闭预览 */
  const closePreview = () => {
    previewItem.value = null;
    isPreviewOpen.value = false;
  };

  /** 当前预览文件类型分类（从注册表查询） */
  const currentPreviewCategory = computed<FileCategory>(() => {
    if (!previewItem.value) return 'unsupported';
    return previewRegistry.getCategory(previewItem.value.extension);
  });

  /** 当前预览文件是否可预览 */
  const canPreviewCurrentFile = computed(() => {
    if (!previewItem.value) return false;
    return previewRegistry.canPreview(previewItem.value.extension, previewItem.value.mimeType);
  });

  return {
    previewItem,
    isPreviewOpen,
    openPreview,
    closePreview,
    currentPreviewCategory,
    canPreviewCurrentFile
  };
}
