import { defineComponent, PropType } from 'vue'
import FileIcon from '../items/FileIcon'
import { FileItem } from '../types/file-explorer'
export default defineComponent({
  name: 'TileView',
  props: {
    items: {
      type: Array as PropType<FileItem[]>,
      required: true
    },
    selectedIds: {
      type: Object as PropType<Set<string>>,
      required: true
    },
    onSelect: {
      type: Function as PropType<(id: string, multi: boolean) => void>,
      required: true
    },
    onOpen: {
      type: Function as PropType<(item: FileItem) => void>,
      required: true
    }
  },
  setup(props) {
    const formatFileSize = (size?: number): string => {
      if (size == null || size === 0) return ''
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let num = size
      let i = 0
      while (num >= 1024 && i < units.length - 1) {
        num /= 1024
        i++
      }
      return `${num.toFixed(1)} ${units[i]}`
    }

    return () => (
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
        {props.items.map(item => {
          const isSelected = props.selectedIds.has(item.id)
          return (
            <div
              key={item.id}
              class={[
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md border',
                isSelected
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : 'bg-white border-gray-200'
              ]}
              onClick={(e: MouseEvent) =>
                props.onSelect(item.id, e.ctrlKey || e.metaKey)
              }
              onDblclick={() => props.onOpen(item)}
            >
              {/* 图标 */}
              <FileIcon item={item} size={40} />

              {/* 文件信息 */}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                  {item.name}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {item.type === 'folder'
                    ? '文件夹'
                    : formatFileSize(item.size)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
})
