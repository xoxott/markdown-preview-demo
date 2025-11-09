import { ref, computed, Ref } from 'vue'
import { FileItem } from '../types/file-explorer'

export function useFileSelection(files: Ref<FileItem[]>) {
  const selectedIds = ref<Set<string>>(new Set())
  const lastSelectedId = ref<string>()

  const selectedFiles = computed(() =>
    files.value.filter(f => selectedIds.value.has(f.id))
  )

  /**
   * 选择文件
   * @param ids 单个id或多个id
   * @param event MouseEvent，可选，用于处理 Ctrl / Shift 多选逻辑
   */
  const selectFile = (ids: string | string[], event?: MouseEvent) => {
    const idsArray = Array.isArray(ids) ? ids : [ids]

    if (!event) {
      selectedIds.value = new Set(idsArray)
      lastSelectedId.value = idsArray[idsArray.length - 1]
      return
    }

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd: 切换选中状态
      const newSet = new Set(selectedIds.value)
      idsArray.forEach(id => {
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
      })
      selectedIds.value = newSet
      lastSelectedId.value = idsArray[idsArray.length - 1]
    } else if (event.shiftKey && lastSelectedId.value) {
      // Shift: 范围选择
      const lastIndex = files.value.findIndex(f => f.id === lastSelectedId.value)
      const currentIndex = files.value.findIndex(f => f.id === idsArray[idsArray.length - 1])
      const start = Math.min(lastIndex, currentIndex)
      const end = Math.max(lastIndex, currentIndex)
      const rangeIds = files.value.slice(start, end + 1).map(f => f.id)
      selectedIds.value = new Set(rangeIds)
    } else {
      // 普通点击或多选直接覆盖
      selectedIds.value = new Set(idsArray)
      lastSelectedId.value = idsArray[idsArray.length - 1]
    }
    console.log('selectedFiles', selectedFiles.value)
  }

  const selectMultiple = (ids: string[]) => {
    selectedIds.value = new Set(ids)
    lastSelectedId.value = ids[ids.length - 1]
  }

  const clearSelection = () => {
    selectedIds.value.clear()
    lastSelectedId.value = undefined
  }

  const selectAll = () => {
    selectedIds.value = new Set(files.value.map(f => f.id))
    lastSelectedId.value = files.value[files.value.length - 1]?.id
  }

  return {
    selectedIds,
    selectedFiles,
    selectFile,
    selectMultiple,
    clearSelection,
    selectAll
  }
}
