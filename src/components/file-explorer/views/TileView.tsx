import { computed, defineComponent, inject, PropType, Ref } from 'vue'
import FileIcon from '../items/FileIcon'
import { FileItem } from '../types/file-explorer'
import { formatFileSize } from '../utils/fileHelpers'
import { NText, useThemeVars } from 'naive-ui'
import { FileDragDropHook } from '../hooks/useFileDragDropEnhanced'
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper'

export default defineComponent({
  name: 'TileView',
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
    const dragDrop = inject<FileDragDropHook>('FILE_DRAG_DROP')!
    const selectedItems = computed(() => props.items.filter(it => props.selectedIds.value.has(it.id)))


    const handleMouseEnter = (e: MouseEvent, isSelected: boolean) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          themeVars.value.hoverColor
      }
    }

    const handleMouseLeave = (e: MouseEvent, isSelected: boolean) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          themeVars.value.cardColor
      }
    }

    return () => (
      <div
        class="grid gap-1 p-4 h-full box-border content-start"
        data-selector="content-viewer"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        {props.items.map(item => {
          const isSelected = props.selectedIds.value.has(item.id)
          return (
            <FileDropZoneWrapper
              key={item.id}
              zoneId={item.id}
              targetPath={item.path}
              item={item}
            >
              <div
                key={item.id}
                data-selectable-id={item.id}
                class="rounded-lg transition-colors duration-150  select-none p-2 h-auto"
                style={{
                  backgroundColor: isSelected || dragDrop.getDropZoneState(item.id)?.isOver && dragDrop.getDropZoneState(item.id)?.canDrop
                    ? `${themeVars.value.primaryColorHover}20`
                    : themeVars.value.cardColor
                }}
                {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                onMouseenter={e => handleMouseEnter(e, isSelected)}
                onMouseleave={e => handleMouseLeave(e, isSelected)}
                onClick={(e: MouseEvent) =>
                  props.onSelect([item.id], e)
                }
                onDblclick={() => props.onOpen(item)}
                onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                draggable
              >
                <div class="flex items-start gap-2">
                  {/* 图标 */}
                  <FileIcon item={item} size={48} />

                  {/* 文件信息 */}
                  <div class="flex flex-col justify-start gap-1 min-w-0 flex-1">
                    {/* 文件名 */}
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

                    {/* 文件大小/类型 */}
                    {(item.type === 'folder' || item.size) && (
                      <NText
                        depth={3}
                        class="text-xs"
                        style={{
                          color: isSelected
                            ? themeVars.value.primaryColor
                            : themeVars.value.textColor3
                        }}
                      >
                        {item.type === 'folder'
                          ? '文件夹'
                          : formatFileSize(item.size)}
                      </NText>
                    )}
                  </div>
                </div>
              </div>
            </FileDropZoneWrapper>
          )
        })}
      </div>
    )
  }
})