/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-07 14:46:25
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-07 14:46:31
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\hooks\useFilePreview.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ref, computed } from 'vue'
import { FileItem } from '../types/file-explorer'

export function useFilePreview(initialItems: FileItem[] = []) {
  const previewItem = ref<FileItem | null>(null)
  const isPreviewOpen = ref(false)

  const openPreview = (item: FileItem) => {
    previewItem.value = item
    isPreviewOpen.value = true
  }

  const closePreview = () => {
    previewItem.value = null
    isPreviewOpen.value = false
  }

  const currentPreviewType = computed(() => {
    if (!previewItem.value) return null
    if (previewItem.value.type === 'folder') return 'folder'
    const ext = previewItem.value.extension?.toLowerCase()
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') return 'image'
    if (ext === 'pdf') return 'pdf'
    if (ext === 'txt' || ext === 'md') return 'text'
    return 'other'
  })

  return {
    previewItem,
    isPreviewOpen,
    openPreview,
    closePreview,
    currentPreviewType
  }
}
