/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:54:00
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 20:01:22
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\ViewContainer.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineComponent, ref, computed, PropType } from 'vue'
import { NCard } from 'naive-ui'
import { FileItem, ViewConfig } from './types/file-explorer'
import SelectionRect from './interaction/SelectionRect'
import GridView from './views/GridView'
import ListView from './views/ListView'
import TileView from './views/TileView'
import DetailView from './views/DetailView'
import ContentView from './views/ContentView'

export default defineComponent({
  name: 'ViewContainer',
  props: {
    files: {
      type: Array as PropType<FileItem[]>,
      required: true
    },
    viewConfig: {
      type: Object as PropType<ViewConfig>,
      required: true
    },
    selectedIds: {
      type: Array as PropType<string[]>,
      default: () => []
    }
  },
  emits: ['update:selectedIds', 'file-click', 'file-dblclick', 'selection-change'],
  
  setup(props, { emit }) {
    // 根据视图模式选择对应的组件
    const viewComponentMap = {
      grid: GridView,
      list: ListView,
      tile: TileView,
      detail: DetailView,
      content: ContentView
    }

    const CurrentView = computed(() => viewComponentMap[props.viewConfig.mode])

    const handleFileClick = (fileId: string, event: MouseEvent) => {
      emit('file-click', fileId, event)
    }

    const handleFileDblClick = (fileId: string, event: MouseEvent) => {
      emit('file-dblclick', fileId, event)
    }

    const handleSelectionChange = (ids: string[]) => {
      emit('update:selectedIds', ids)
      emit('selection-change', ids)
    }

    return () => (
      <NCard bordered={false} contentStyle={{ padding: 0 }}>
        <SelectionRect
          threshold={5}
          autoScroll={true}
          onSelectionChange={handleSelectionChange}
          className="min-h-[600px]"
        >
          <CurrentView.value
            files={props.files}
            viewConfig={props.viewConfig}
            selectedIds={props.selectedIds}
            onFileClick={handleFileClick}
            onFileDblClick={handleFileDblClick}
          />
        </SelectionRect>
      </NCard>
    )
  }
})
