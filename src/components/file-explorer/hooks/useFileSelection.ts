/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:51:53
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 16:52:06
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\hooks\useFileSelection.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ref, computed, Ref } from 'vue'
import { FileItem } from '../types/file-explorer'

export function useFileSelection(files: Ref<FileItem[]>) {
  const selectedIds = ref<string[]>([])
  const lastSelectedId = ref<string>()

  const selectedFiles = computed(() => 
    files.value.filter(f => selectedIds.value.includes(f.id))
  )

  const selectFile = (id: string, event?: MouseEvent) => {
    if (!event) {
      selectedIds.value = [id]
      lastSelectedId.value = id
      return
    }

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd: 切换选中状态
      const index = selectedIds.value.indexOf(id)
      if (index > -1) {
        selectedIds.value.splice(index, 1)
      } else {
        selectedIds.value.push(id)
      }
      lastSelectedId.value = id
    } else if (event.shiftKey && lastSelectedId.value) {
      // Shift: 范围选择
      const lastIndex = files.value.findIndex(f => f.id === lastSelectedId.value)
      const currentIndex = files.value.findIndex(f => f.id === id)
      const start = Math.min(lastIndex, currentIndex)
      const end = Math.max(lastIndex, currentIndex)
      selectedIds.value = files.value.slice(start, end + 1).map(f => f.id)
    } else {
      // 普通点击：单选
      selectedIds.value = [id]
      lastSelectedId.value = id
    }
  }

  const selectMultiple = (ids: string[]) => {
    selectedIds.value = ids
  }

  const clearSelection = () => {
    selectedIds.value = []
    lastSelectedId.value = undefined
  }

  const selectAll = () => {
    selectedIds.value = files.value.map(f => f.id)
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