import type { PropType, Ref } from 'vue';
import { computed, defineComponent, inject, ref } from 'vue';
import { useThemeVars } from 'naive-ui';
import type { FileItem } from '../types/file-explorer';
import FileIcon from '../items/FileIcon';
import { formatFileSize } from '../utils/fileHelpers';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';
import type { FileDragDropHook } from '../hooks/useFileDragDropEnhanced';

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
    const themeVars = useThemeVars();
    const hoveredItemId = ref<string | null>(null);
    const selectedItems = computed(() =>
      props.items.filter(it => props.selectedIds.value.has(it.id))
    );
    const dragDrop = inject<FileDragDropHook>('FILE_DRAG_DROP')!;

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
        class="flex flex-col"
        data-selector="content-viewer"
        style={{
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        {props.items.map(item => {
          const isSelected = props.selectedIds.value.has(item.id);
          return (
            <FileDropZoneWrapper key={item.id} zoneId={item.id} targetPath={item.path} item={item}>
              <div
                class="group flex select-none items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  backgroundColor: getItemBgColor(item.id, isSelected)
                }}
                data-selectable-id={item.id}
                {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                onMouseenter={() => (hoveredItemId.value = item.id)}
                onMouseleave={() => (hoveredItemId.value = null)}
                onClick={(e: MouseEvent) => props.onSelect([item.id], e)}
                onDblclick={() => props.onOpen(item)}
                onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                draggable
              >
                {/* 图标 */}
                <FileIcon item={item} size={20} showThumbnail={false} />

                {/* 文件名 */}
                <div
                  class="flex-1 truncate text-sm"
                  style={{
                    color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColorBase
                  }}
                >
                  {item.name}
                </div>

                {/* 文件大小 */}
                {item.type === 'file' && (
                  <div
                    class="w-20 flex-shrink-0 text-right text-xs"
                    style={{
                      color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColor3
                    }}
                  >
                    {formatFileSize(item.size)}
                  </div>
                )}
              </div>
            </FileDropZoneWrapper>
          );
        })}
      </div>
    );
  }
});
