import { defineComponent, PropType } from 'vue'
import FileIcon from '../items/FileIcon'
import { FileItem } from '../types/file-explorer'
import { useThemeVars } from 'naive-ui'

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
      type: Function as PropType<(id: string[], multi: boolean) => void>,
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
    const themeVars = useThemeVars()

    const sizeMap = {
      small: { icon: 48, gap: 8, itemWidth: 80, padding: '4px 6px' },
      medium: { icon: 64, gap: 10, itemWidth: 100, padding: '6px 8px' },
      large: { icon: 96, gap: 12, itemWidth: 120, padding: '8px 10px' },
      'extra-large': { icon: 128, gap: 14, itemWidth: 150, padding: '10px 12px' }
    }

    const getConfig = () => sizeMap[props.gridSize]

    const handleMouseEnter = (e: MouseEvent, isSelected: boolean) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          themeVars.value.hoverColor
      }
    }

    const handleMouseLeave = (e: MouseEvent, isSelected: boolean) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
      }
    }

    return () => {
      const config = getConfig()
      return (
        <div
          class="grid p-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${config.itemWidth}px, 1fr))`,
            gap: `${config.gap}px`,
            alignItems: 'start',
            backgroundColor: themeVars.value.bodyColor
          }}
        >
          {props.items.map(item => {
            const isSelected = props.selectedIds.has(item.id)
            return (
              <div key={item.id}  data-selectable-id={item.id} class="flex justify-center">
                <div
                  class="inline-flex flex-col items-center cursor-pointer rounded-lg transition-all duration-200 select-none"
                  style={{
                    padding: config.padding,
                    backgroundColor: isSelected
                      ? `${themeVars.value.primaryColorHover}20`
                      : 'transparent'
                  }}
                  onMouseenter={e => handleMouseEnter(e, isSelected)}
                  onMouseleave={e => handleMouseLeave(e, isSelected)}
                  onClick={(e: MouseEvent) =>
                    props.onSelect([item.id], e.ctrlKey || e.metaKey)
                  }
                  onDblclick={() => props.onOpen(item)}
                >
                  {/* 图标 */}
                  <div class="mb-1">
                    <FileIcon item={item} size={config.icon} />
                  </div>

                  {/* 文件名 */}
                  <div
                    class="text-center break-words"
                    style={{
                      fontSize: props.gridSize === 'small' ? '12px' : '14px',
                      lineHeight: '1.4',
                      maxWidth: `${config.itemWidth - 16}px`,
                      wordBreak: 'break-word',
                      color: isSelected
                        ? themeVars.value.primaryColor
                        : themeVars.value.textColorBase
                    }}
                  >
                    {item.name}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    }
  }
})