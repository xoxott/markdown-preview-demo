import { defineComponent, PropType } from 'vue'
import FileIcon from '../items/FileIcon'
import { FileItem } from '../types/file-explorer'


type GridSize = 'small' | 'medium' | 'large' | 'extra-large'

export default defineComponent({
  name: 'GridView',
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
    },
    gridSize: {
      type: String as PropType<GridSize>,
      required: true
    }
  },
  setup(props) {
    const sizeMap = {
      small: { icon: 48, gap: 12, padding: 12 },
      medium: { icon: 64, gap: 16, padding: 16 },
      large: { icon: 96, gap: 20, padding: 20 },
      'extra-large': { icon: 128, gap: 24, padding: 24 }
    }

    const getConfig = () => sizeMap[props.gridSize]

    return () => {
      const config = getConfig()
      return (
        <div
          class="grid gap-3 p-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${config.icon + config.padding * 2}px, 1fr))`
          }}
        >
          {props.items.map(item => {
            const isSelected = props.selectedIds.has(item.id)
            return (
              <div
                key={item.id}
                class={[
                  'relative flex flex-col items-center cursor-pointer rounded-lg transition-all duration-200 hover:bg-blue-50 group',
                  isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                ]}
                style={{ padding: `${config.padding}px` }}
                onClick={(e: MouseEvent) =>
                  props.onSelect(item.id, e.ctrlKey || e.metaKey)
                }
                onDblclick={() => props.onOpen(item)}
              >
                {/* 图标 */}
                <FileIcon item={item} size={config.icon} />

                {/* 文件名 */}
                <div
                  class="mt-2 text-center text-sm text-gray-700 break-words max-w-full"
                  style={{
                    fontSize:
                      props.gridSize === 'small' ? '12px' : '14px',
                    lineHeight: '1.4'
                  }}
                >
                  {item.name}
                </div>
              </div>
            )
          })}
        </div>
      )
    }
  }
})
