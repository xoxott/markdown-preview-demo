import { defineComponent, PropType } from 'vue'
import FileIcon from '../items/FileIcon'
import { FileItem } from '../types/file-explorer'

export default defineComponent({
  name: 'ContentView',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    selectedIds: { type: Object as PropType<Set<string>>, required: true },
    onSelect: { type: Function as PropType<(id: string, multi: boolean) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true }
  },
  setup(props) {
    const formatFileSize = (size?: number): string => {
      if (!size) return ''
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let num = size
      let i = 0
      while (num >= 1024 && i < units.length - 1) {
        num /= 1024
        i++
      }
      return `${num.toFixed(1)} ${units[i]}`
    }

    const formatDate = (date?: string | Date) => {
      if (!date) return ''
      const d = date instanceof Date ? date : new Date(date)
      return d.toLocaleString()
    }

    return () => (
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {props.items.map(item => {
          const isSelected = props.selectedIds.has(item.id)
          return (
            <div
              key={item.id}
              class={[
                'rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-lg',
                isSelected ? 'bg-blue-50 border-blue-300 shadow-lg' : 'bg-white border-gray-200'
              ]}
              onClick={(e: MouseEvent) => props.onSelect(item.id, e.ctrlKey || e.metaKey)}
              onDblclick={() => props.onOpen(item)}
            >
              {/* 预览区域 */}
              <div class="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.name} class="w-full h-full object-cover" />
                ) : (
                  <FileIcon item={item} size={64} showThumbnail={false} />
                )}

                {/* 选择指示器 */}
                {/* {isSelected && (
                  <div class="absolute top-2 right-2">
                    <CheckSquare size={20} class="text-blue-600 bg-white rounded" />
                  </div>
                )} */}
              </div>

              {/* 信息区域 */}
              <div class="p-4">
                <h3 class="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(item.modifiedAt)}</span>
                  <span>{item.type === 'file' ? formatFileSize(item.size) : '文件夹'}</span>
                </div>

                {/* 摘要/描述 */}
                {item.type === 'file' && (
                  <p class="mt-2 text-xs text-gray-600 line-clamp-2">
                    {item.extension ? `${item.extension.toUpperCase()} 文件` : '文件'}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
})
