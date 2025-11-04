import { defineComponent, PropType, ref } from 'vue'
import FileIcon from '../items/FileIcon'
import { FileItem } from '../types/file-explorer'
import { useThemeVars } from 'naive-ui'
import { formatDate, formatFileSize } from '../utils/fileHelpers'

export default defineComponent({
  name: 'ContentView',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    selectedIds: { type: Object as PropType<Set<string>>, required: true },
    onSelect: { type: Function as PropType<(id: string[], multi: boolean) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true }
  },
  setup(props) {
    const themeVars = useThemeVars()

    return () => (
      <div 
        class="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-4"
        style={{
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        {props.items.map(item => {
          const isSelected = props.selectedIds.has(item.id)
          return (
            <div
              key={item.id}
              data-selectable-id={item.id}
              class="cursor-pointer select-none rounded overflow-hidden transition-all"
              style={{
                backgroundColor: isSelected
                  ? `${themeVars.value.primaryColorHover}20`
                  : 'transparent'
              }}
              onMouseenter={(e: MouseEvent) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    themeVars.value.hoverColor
                }
              }}
              onMouseleave={(e: MouseEvent) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }
              }}
              onClick={(e: MouseEvent) => props.onSelect([item.id], e.ctrlKey || e.metaKey)}
              onDblclick={() => props.onOpen(item)}
            >
              {/* 预览区域 */}
              <div 
                class="aspect-video flex items-center justify-center relative overflow-hidden"
                // style={{
                //   background: `linear-gradient(to bottom right, ${themeVars.value.cardColor}, ${themeVars.value.tableHeaderColor})`
                // }}
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.name} class="w-full h-full object-cover" />
                ) : (
                  <FileIcon item={item} size={48} showThumbnail={false} />
                )}
              </div>

              {/* 信息区域 */}
              <div class="p-2">
                <h3 
                  class="text-sm font-medium truncate"
                  style={{
                    color: isSelected
                      ? themeVars.value.primaryColor
                      : themeVars.value.textColorBase
                  }}
                >
                  {item.name}
                </h3>
                <div 
                  class="mt-1 flex items-center justify-between text-xs"
                  style={{
                    color: isSelected
                      ? themeVars.value.primaryColor
                      : themeVars.value.textColor3
                  }}
                >
                  <span class="truncate flex-1">{formatDate(item.modifiedAt)}</span>
                  <span class="ml-2 flex-shrink-0">
                    {item.type === 'file' ? formatFileSize(item.size) : '文件夹'}
                  </span>
                </div>

                {/* 摘要/描述 */}
                {item.type === 'file' && item.extension && (
                  <p 
                    class="mt-1 text-xs truncate"
                    style={{
                      color: isSelected
                        ? themeVars.value.primaryColor
                        : themeVars.value.textColor3
                    }}
                  >
                    {item.extension.toUpperCase()} 文件
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