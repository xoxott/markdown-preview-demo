/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-03 09:19:21
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-05 00:29:26
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\container\ViewContainer.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineComponent, nextTick, onBeforeUnmount, onMounted, PropType, ref } from 'vue'
import GridView from '../views/GridView'
import TileView from '../views/TileView'
import DetailView from '../views/DetailView'
import { FileItem, GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer'
import ListView from '../views/ListView'
import ContentView from '../views/ContentView'
import SelectionRect from '../interaction/SelectionRect'
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
    const containerRef = ref<HTMLElement | null>(null)
    /** 获取滚动容器 */
    const getScrollContainer = () => {
      if (props.viewMode === 'detail' && viewRef.value?.getSelectableContainer) {
        return viewRef.value.getSelectableContainer()
      }
      return containerRef.value
    }

    /** 接收圈选结果 */
    const handleSelectionChange = (ids: string[]) => {
      props.onSelect(ids, false)
    }

    /** 点击空白或非选中区域清空选择 */
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const selectableEl = target.closest('[data-selectable-id]')
      if (!selectableEl) {
        props.onSelect([], false)
      }
    }

    onMounted(() => {
      document.addEventListener('mousedown', handleClickOutside)
    })
    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', handleClickOutside)
    })
    return () => {
      const viewProps = {
        items: props.items,
        selectedIds: props.selectedIds,
        onSelect: props.onSelect,
        onOpen: props.onOpen
      }

      return (
        <SelectionRect
          scrollContainerSelector={getScrollContainer}
          onSelectionChange={handleSelectionChange}
        >
          <div class="flex-1  overflow-auto bg-white" ref={containerRef} >
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
      )
    }
  }
})
