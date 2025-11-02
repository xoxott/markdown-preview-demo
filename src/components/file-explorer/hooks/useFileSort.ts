/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:52:11
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 16:52:47
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\hooks\useFileSort.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { computed, Ref, ref } from 'vue'
import { FileItem, SortField, SortOrder } from '../types/file-explorer'

export function useFileSort(files: Ref<FileItem[]>) {
  const sortField = ref<SortField>('name')
  const sortOrder = ref<SortOrder>('asc')

  const sortedFiles = computed(() => {
    const sorted = [...files.value].sort((a, b) => {
      let comparison = 0

      // 文件夹始终排在前面
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1

      switch (sortField.value) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN')
          break
        case 'size':
          comparison = (a.size || 0) - (b.size || 0)
          break
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '')
          break
        case 'dateModified':
          comparison = (a.dateModified?.getTime() || 0) - (b.dateModified?.getTime() || 0)
          break
      }

      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return sorted
  })

  const setSorting = (field: SortField, order?: SortOrder) => {
    if (field === sortField.value && !order) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortOrder.value = order || 'asc'
    }
  }

  return {
    sortField,
    sortOrder,
    sortedFiles,
    setSorting
  }
}