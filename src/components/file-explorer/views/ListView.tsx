import { defineComponent, PropType, Ref } from 'vue'
import { FileItem } from '../types/file-explorer'
import FileIcon from '../items/FileIcon'
import { useThemeVars } from 'naive-ui'
import { formatFileSize } from '../utils/fileHelpers'

export default defineComponent({
  name: 'ListView',
  props: {
    items: {
      type: Array as PropType<FileItem[]>,
      required: true
    },
    selectedIds: {
      type: Object as PropType<Ref<Set<string>>>,
      required: true
    },
    onSelect: {
      type: Function as PropType<(id: string[], event?: MouseEvent) => void>,
      required: true
    },
    onOpen: {
      type: Function as PropType<(item: FileItem) => void>,
      required: true
    }
  },
  setup(props) {
    const themeVars = useThemeVars()
    return () => (
      <div
        class="flex flex-col"
        data-selector="content-viewer"
        style={{
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        {props.items.map(item => {
          const isSelected = props.selectedIds.value.has(item.id)
          return (
            <div
              key={item.id}
              data-selectable-id={item.id}
              class="group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none"
              style={{
                backgroundColor: isSelected
                  ? `${themeVars.value.primaryColorHover}20`
                  : themeVars.value.cardColor,
                borderLeft: isSelected
                  ? `2px solid ${themeVars.value.primaryColor}`
                  : '2px solid transparent'
              }}
              onMouseenter={(e: MouseEvent) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    themeVars.value.hoverColor
                }
              }}
              onMouseleave={(e: MouseEvent) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    themeVars.value.cardColor
                }
              }}
              onClick={(e: MouseEvent) =>
                props.onSelect([item.id], e)
              }
              onDblclick={() => props.onOpen(item)}
            >
              {/* 图标 */}
              <FileIcon item={item} size={20} showThumbnail={false} />

              {/* 文件名 */}
              <div
                class="flex-1 text-sm truncate"
                style={{
                  color: isSelected
                    ? themeVars.value.primaryColor
                    : themeVars.value.textColorBase
                }}
              >
                {item.name}
              </div>

              {/* 文件大小 */}
              {item.type === 'file' && (
                <div
                  class="text-xs flex-shrink-0 w-20 text-right"
                  style={{
                    color: isSelected
                      ? themeVars.value.primaryColor
                      : themeVars.value.textColor3
                  }}
                >
                  {formatFileSize(item.size)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }
})