/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-03 09:19:21
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-07 14:19:20
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\container\ViewContainer.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { computed, defineComponent, PropType, Ref } from 'vue'
import { useContextMenuOptions } from '../hooks/useContextMenuOptions'
import ContextMenu from '../interaction/ContextMenu'
import SelectionRect from '../interaction/SelectionRect'
import { FileItem, GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer'
import FileViewRenderer from './FileViewRenderer'

export default defineComponent({
  name: 'ViewContainer',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    viewMode: { type: String as PropType<ViewMode>, required: true },
    gridSize: { type: String as PropType<GridSize>, required: false, default: 'medium' },
    selectedIds: { type: Object as PropType<Ref<Set<string>>>, required: true },
    onSelect: { type: Function as PropType<(id: string[],event?: MouseEvent) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    sortField: { type: String as PropType<SortField>, required: false },
    sortOrder: { type: String as PropType<SortOrder>, required: false },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: false }
  },
  setup(props) {
    const { handleContextMenuShow, handleContextMenuHide,options } = useContextMenuOptions({
      selectedIds: props.selectedIds,
      onSelect: props.onSelect
    })
 
    /** 接收圈选结果 */
    const handleSelectionChange = (ids: string[]) => {
      props.onSelect(ids)
    }
    return () => {
      return (
        <ContextMenu
          options={options.value}
          onSelect={props.onSelect}
          triggerSelector={`[data-selectable-id],.selection-container`}
          onShow={handleContextMenuShow}
          onHide={handleContextMenuHide}
          class='h-full'
        >
          <SelectionRect
            scrollContainerSelector={'[data-selector]'}
            onSelectionChange={handleSelectionChange}
            onClearSelection={() => props.onSelect([])}
            class="h-full"
          >
            <div class="overflow-auto bg-white h-full"  >
              <FileViewRenderer {...props}/>
            </div>
          </SelectionRect>
        </ContextMenu>
      )
    }
  }
})
