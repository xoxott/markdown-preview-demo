/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-03 09:19:21
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-05 23:27:16
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\container\ViewContainer.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { computed, defineComponent, inject, nextTick, onBeforeUnmount, onMounted, PropType, provide, ref } from 'vue'
import GridView from '../views/GridView'
import TileView from '../views/TileView'
import DetailView from '../views/DetailView'
import { FileItem, GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer'
import ListView from '../views/ListView'
import ContentView from '../views/ContentView'
import SelectionRect from '../interaction/SelectionRect'
import ContextMenu, { ContextMenuItem } from '../interaction/ContextMenu'
import DragPreview from '../interaction/DragPreview'
import {
  CopyOutline,
  CreateOutline,
  CutOutline,
  DownloadOutline,
  InformationCircleOutline,
  OpenOutline,
  ShareSocialOutline,
  StarOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { FileDragDropHook, useFileDragDropEnhanced } from '../hooks/useFileDragDropEnhanced'
// import SelectionRectV1 from '../interaction/SelectionRectV1'

export default defineComponent({
  name: 'ViewContainer',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    viewMode: { type: String as PropType<ViewMode>, required: true },
    gridSize: { type: String as PropType<GridSize>, required: false, default: 'medium' },
    selectedIds: { type: Object as PropType<Set<string>>, required: true },
    onSelect: { type: Function as PropType<(id: string[], multi: boolean) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    sortField: { type: String as PropType<SortField>, required: false },
    sortOrder: { type: String as PropType<SortOrder>, required: false },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: false }
  },
  setup(props) {
    const viewRef = ref<any>(null)
    const blankOptions = ref<ContextMenuItem[]>([
      {
        key: 'refresh',
        label: '刷新',
        icon: OpenOutline,
        show: true,
        shortcut: 'F5'
      },
      {
        key: 'paste',
        label: '粘贴',
        icon: CopyOutline,
        shortcut: 'Ctrl+V'
      },
      {
        key: 'new-folder',
        label: '新建文件夹',
        icon: CreateOutline,
        shortcut: 'Ctrl+Shift+N'
      }
    ])
    const fileOptions = ref<ContextMenuItem[]>([
      {
        key: 'open',
        label: '打开',
        icon: OpenOutline,
        // show: !isMultiple && props.fileType !== 'empty',
        show: true,
        shortcut: 'Enter'
      },
      {
        key: 'open-with',
        label: '打开方式',
        icon: OpenOutline,
        show: true,
        // show: !isMultiple && props.fileType === 'file',
        children: [
          { key: 'open-default', label: '默认程序' },
          { key: 'open-text', label: '文本编辑器' },
          { key: 'open-code', label: '代码编辑器' }
        ]
      },
      {
        key: 'divider-1',
        label: '',
        divider: true,
        show: true,
        // show: props.fileType !== 'empty'
      },
      {
        key: 'cut',
        label: '剪切',
        icon: CutOutline,
        // show: props.fileType !== 'empty',
        shortcut: 'Ctrl+X'
      },
      {
        key: 'copy',
        label: '复制',
        icon: CopyOutline,
        // show: props.fileType !== 'empty',
        shortcut: 'Ctrl+C'
      },
      {
        key: 'paste',
        label: '粘贴',
        icon: CopyOutline,
        shortcut: 'Ctrl+V'
      },
      {
        key: 'divider-2',
        label: '',
        divider: true
      },
      {
        key: 'rename',
        label: '重命名',
        icon: CreateOutline,
        // show: !isMultiple && props.fileType !== 'empty',
        shortcut: 'F2'
      },
      {
        key: 'delete',
        // label: isMultiple ? `删除 ${props.selectedCount} 项` : '删除',
        label: '删除',
        icon: TrashOutline,
        // show: props.fileType !== 'empty',
        danger: true,
        shortcut: 'Delete'
      },
      {
        key: 'divider-3',
        label: '',
        divider: true,
        // show: props.fileType !== 'empty'
      },
      {
        key: 'download',
        label: '下载',
        icon: DownloadOutline,
        // show: props.fileType !== 'empty'
      },
      {
        key: 'share',
        label: '分享',
        icon: ShareSocialOutline,
        // show: props.fileType !== 'empty'
      },
      {
        key: 'favorite',
        label: '收藏',
        icon: StarOutline,
        // show: !isMultiple && props.fileType !== 'empty'
      },
      {
        key: 'divider-4',
        label: '',
        divider: true,
        // show: props.fileType !== 'empty'
      },
      {
        key: 'properties',
        label: '属性',
        icon: InformationCircleOutline,
        // show: !isMultiple && props.fileType !== 'empty',
        shortcut: 'Alt+Enter'
      },
      {
        key: 'new-folder',
        label: '新建文件夹',
        icon: CreateOutline,
        // show: props.fileType === 'empty',
        shortcut: 'Ctrl+Shift+N'
      }
    ])
    const options = ref<ContextMenuItem[]>([])

    /** 接收圈选结果 */
    const handleSelectionChange = (ids: string[]) => {
      props.onSelect(ids, false)
    }

    const handleContextMenuShow = (contextData: any) => {
      const target = contextData.data.element as HTMLElement
      const fileEl = target.closest('[data-selectable-id]') as HTMLElement | null
      if (fileEl) {
        const id = fileEl.dataset.selectableId!
        if (!props.selectedIds.has(id)) {
          props.onSelect([id], false) // 右键单选文件
        }
        options.value = fileOptions.value
      } else {
        props.onSelect([], false)
        options.value = blankOptions.value
      }
    }

    return () => {
      const viewProps = {
        items: props.items,
        selectedIds: props.selectedIds,
        onSelect: props.onSelect,
        onOpen: props.onOpen
      }

      return (
        <div class={'w-full h-full'}>
          <ContextMenu options={options.value} onSelect={props.onSelect} triggerSelector={`[data-selectable-id],.selection-container`} onShow={handleContextMenuShow} onHide={() => { }}>
            <SelectionRect
              scrollContainerSelector={'[data-selector]'}
              onSelectionChange={handleSelectionChange}
              onClearSelection={() => props.onSelect([], false)}
            >
              <div class="flex-1  overflow-auto bg-white"  >
                {props.viewMode === 'grid' && <GridView {...viewProps} gridSize={props.gridSize} />}
                {props.viewMode === 'list' && <ListView {...viewProps} />}
                {props.viewMode === 'tile' && <TileView {...viewProps} />}
                {props.viewMode === 'detail' && props.sortField && props.sortOrder && props.onSort && (
                  <DetailView
                    {...viewProps}
                    ref={viewRef}
                    sortField={props.sortField}
                    sortOrder={props.sortOrder}
                    onSort={props.onSort}
                  />
                )}
                {props.viewMode === 'content' && <ContentView {...viewProps} />}
              </div>
            </SelectionRect>

          </ContextMenu>
        </div>
      )
    }
  }
})
