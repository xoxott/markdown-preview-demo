import type { PropType, Ref } from 'vue';
import { computed, defineComponent, inject, ref } from 'vue';
import { NText, useThemeVars } from 'naive-ui';
import FileIcon from '../items/FileIcon';
import type { FileItem } from '../types/file-explorer';
import { formatFileSize } from '../utils/fileHelpers';
import type { FileDragDropHook } from '../hooks/useFileDragDropEnhanced';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';

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
    const themeVars = useThemeVars();
    const hoveredItemId = ref<string | null>(null);
    const dragDrop = inject<FileDragDropHook>('FILE_DRAG_DROP')!;
    const selectedItems = computed(() =>
      props.items.filter(it => props.selectedIds.value.has(it.id))
    );

    const getItemBgColor = (id: string, isSelected: boolean) => {
      const dropZone = dragDrop.getDropZoneState(id);
      if (isSelected || (dropZone?.isOver && dropZone?.canDrop)) {
        return `${themeVars.value.primaryColorHover}20`;
      }
      if (hoveredItemId.value === id) return themeVars.value.hoverColor;
      return 'transparent';
    };

    return () => (
      <div
        class="grid box-border content-start gap-1 p-4"
        data-selector="content-viewer"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        {props.items.map(item => {
          const isSelected = props.selectedIds.value.has(item.id);
          return (
            <FileDropZoneWrapper key={item.id} zoneId={item.id} targetPath={item.path} item={item}>
              <div
                key={item.id}
                data-selectable-id={item.id}
                class="h-auto select-none rounded-lg p-2 transition-colors duration-150"
                style={{
                  backgroundColor: getItemBgColor(item.id, isSelected)
                }}
                {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                onMouseenter={() => (hoveredItemId.value = item.id)}
                onMouseleave={() => (hoveredItemId.value = null)}
                onClick={(e: MouseEvent) => props.onSelect([item.id], e)}
                onDblclick={() => props.onOpen(item)}
                onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                draggable
              >
                <div class="flex items-start gap-2">
                  {/* 图标 */}
                  <FileIcon item={item} size={48} />

                  {/* 文件信息 */}
                  <div class="min-w-0 flex flex-col flex-1 justify-start gap-1">
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
                        {item.type === 'folder' ? '文件夹' : formatFileSize(item.size)}
                      </NText>
                    )}
                  </div>
                </div>
              </div>
            </FileDropZoneWrapper>
          );
        })}
      </div>
    );
  }
});
