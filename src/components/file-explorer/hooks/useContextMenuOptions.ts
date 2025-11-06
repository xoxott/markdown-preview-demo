import { ref, computed, Ref } from 'vue'
import {
  CopyOutline,
  CreateOutline,
  CutOutline,
  DownloadOutline,
  FunnelOutline,
  InformationCircleOutline,
  OpenOutline,
  ShareSocialOutline,
  StarOutline,
  TrashOutline
} from '@vicons/ionicons5'
import type { ContextMenuItem } from '../interaction/ContextMenu'

interface UseContextMenuOptionsParams {
  selectedIds: Ref<Set<string>>
  onSelect: (ids: string[], event?: MouseEvent) => void
}

/**
 * 文件视图右键菜单 Hook
 */
export function useContextMenuOptions({
  selectedIds,
  onSelect
}: UseContextMenuOptionsParams) {
  // 基础菜单，不绑定 show
  const baseFileOptions: Omit<ContextMenuItem, 'show'>[] = [
    { key: 'open', label: '打开', icon: OpenOutline, shortcut: 'Enter' },
    {
      key: 'open-with',
      label: '打开方式',
      icon: OpenOutline,
      children: [
        { key: 'open-default', label: '默认程序' },
        { key: 'open-text', label: '文本编辑器' },
        { key: 'open-code', label: '代码编辑器' }
      ]
    },
    { key: 'divider-1', label: '', divider: true },
    { key: 'cut', label: '剪切', icon: CutOutline, shortcut: 'Ctrl+X' },
    { key: 'copy', label: '复制', icon: CopyOutline, shortcut: 'Ctrl+C' },
    { key: 'divider-2', label: '', divider: true },
    { key: 'rename', label: '重命名', icon: CreateOutline, shortcut: 'F2' },
    { key: 'delete', label: '删除', icon: TrashOutline, danger: true, shortcut: 'Delete' },
    { key: 'divider-3', label: '', divider: true },
    { key: 'download', label: '下载', icon: DownloadOutline },
    { key: 'share', label: '分享', icon: ShareSocialOutline },
    { key: 'favorite', label: '收藏', icon: StarOutline },
    { key: 'divider-4', label: '', divider: true },
    { key: 'properties', label: '属性', icon: InformationCircleOutline, shortcut: 'Alt+Enter' }
  ]

  // 空白区菜单
  const blankOptions: ContextMenuItem[] = [
    { key: 'refresh', label: '刷新', icon: OpenOutline, shortcut: 'F5', show: true },
    { key: 'new-folder', label: '新建文件夹', icon: CreateOutline, shortcut: 'Ctrl+Shift+N', show: true },
    { key: 'paste', label: '粘贴', icon: CopyOutline, shortcut: 'Ctrl+V', show: true },
    {
      key: 'sort',
      label: '排序方式',
      icon: FunnelOutline,
      show: true,
      children: [
        { key: 'sort-name', label: '按名称排序' },
        { key: 'sort-size', label: '按大小排序' },
        { key: 'sort-modified', label: '按修改日期排序' },
        { key: 'sort-created', label: '按创建日期排序' }
      ]
    }
  ]

  // 文件区菜单动态计算 show
  const fileOptions = computed<ContextMenuItem[]>(() => {
    const mapped = baseFileOptions.map(item => {
      switch (item.key) {
        case 'cut':
        case 'copy':
        case 'delete':
        case 'download':
        case 'share':
          return { ...item, show: selectedIds.value.size > 0 }
        case 'rename':
        case 'favorite':
        case 'properties':
          return { ...item, show: selectedIds.value.size === 1 }
        default:
          return { ...item, show: true }
      }
    })

    // 自动处理多余分隔符
    const filtered: ContextMenuItem[] = []
    for (let i = 0; i < mapped.length; i++) {
      const item = mapped[i]
      if (item.divider) {
        const hasPrev = filtered.some(f => f.show)
        const hasNext = mapped.slice(i + 1).some(f => f.show && !f.divider)
        if (hasPrev && hasNext) filtered.push(item)
      } else {
        filtered.push(item)
      }
    }
    return filtered
  })

  // 当前菜单 options
  const options = ref<ContextMenuItem[]>([])

  // 显示菜单
  const handleContextMenuShow = (contextData: any) => {
    const target = contextData.data.element as HTMLElement
    const fileEl = target.closest('[data-selectable-id]') as HTMLElement | null

    if (fileEl) {
      const id = fileEl.dataset.selectableId!
      if (!selectedIds.value.has(id)) onSelect([id])
      options.value = fileOptions.value
    } else {
      onSelect([])
      options.value = blankOptions
    }
  }

  const handleContextMenuHide = () => {
    options.value = []
  }

  return {
    options,
    handleContextMenuShow,
    handleContextMenuHide
  }
}
