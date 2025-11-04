import { defineComponent, PropType } from 'vue'
import FileIcon from '../items/FileIcon'
import { FileItem } from '../types/file-explorer'
import { formatFileSize } from '../utils/fileHelpers'
import { NCard, NText, NThing, useThemeVars } from 'naive-ui'

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
    const themeVars = useThemeVars()

    return () => (
      <div
        class="grid gap-1 p-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        {props.items.map(item => {
          const isSelected = props.selectedIds.has(item.id)
          return (
            <div
              key={item.id}
              class={[
                'rounded-lg transition-colors duration-150 cursor-pointer select-none',
                'hover:bg-opacity-80'
              ]}
              style={{
                backgroundColor: isSelected
                  ? `${themeVars.value.primaryColorHover}20`
                  : themeVars.value.cardColor
              }}
              onMouseenter={e => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    themeVars.value.hoverColor
              }}
              onMouseleave={e => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    themeVars.value.cardColor
              }}
              onClick={(e: MouseEvent) =>
                props.onSelect(item.id, e.ctrlKey || e.metaKey)
              }
              onDblclick={() => props.onOpen(item)}
            >
              <NCard
                size="small"
                bordered={false}
                contentStyle={{
                  padding: '6px'
                }}
                style={{
                  backgroundColor: 'transparent'
                }}
              >
                <NThing>
                  {{
                    avatar: () => (
                      <div class="flex items-start gap-2">
                        <FileIcon item={item} size={48} />
                        <div class="flex flex-col justify-start gap-1">
                          <NText
                            strong
                            class="truncate"
                            style={{
                              color: isSelected
                                ? themeVars.value.primaryColor
                                : themeVars.value.textColorBase
                            }}
                          >
                            {item.name}
                          </NText>

                          {item.type === 'folder' || item.size ? (
                            <NText
                              depth={3}
                              class="truncate text-xs"
                              style={{
                                color: isSelected
                                  ? themeVars.value.primaryColor
                                  : themeVars.value.textColor3
                              }}
                            >
                              {item.type === 'folder'
                                ? '文件夹'
                                : formatFileSize(item.size) || ''}
                            </NText>
                          ) : null}
                        </div>
                      </div>
                    )
                  }}
                </NThing>
              </NCard>
            </div>
          )
        })}
      </div>
    )
  }
})
