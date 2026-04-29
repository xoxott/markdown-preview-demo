import { computed, defineComponent, inject, ref } from 'vue';
import { useThemeVars } from 'naive-ui';
import FileIcon from '../items/FileIcon';
import { formatFileSize } from '../utils/fileHelpers';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';
import { FILE_DRAG_DROP_KEY } from '../hooks/useFileDragDropEnhanced';
import { useFileViewContext } from '../composables/useFileViewContext';

export default defineComponent({
  name: 'ListView',
  setup() {
    const themeVars = useThemeVars();
    const ctx = useFileViewContext();
    const hoveredItemId = ref<string | null>(null);
    const dragDrop = inject(FILE_DRAG_DROP_KEY)!;
    const selectedItems = computed(() =>
      ctx.items.value.filter(it => ctx.selectedIds.value.has(it.id))
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
        class="flex flex-col"
        data-selector="content-viewer"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
        {ctx.items.value.map(item => {
          const isSelected = ctx.selectedIds.value.has(item.id);
          return (
            <FileDropZoneWrapper key={item.id} zoneId={item.id} targetPath={item.path} item={item}>
              <div
                class="group flex select-none items-center gap-3 px-4 py-3 transition-colors"
                style={{ backgroundColor: getItemBgColor(item.id, isSelected) }}
                data-selectable-id={item.id}
                {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                onMouseenter={() => (hoveredItemId.value = item.id)}
                onMouseleave={() => (hoveredItemId.value = null)}
                onClick={(e: MouseEvent) => ctx.onSelect([item.id], e)}
                onDblclick={() => ctx.onOpen(item)}
                onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                draggable
              >
                <FileIcon item={item} size={20} showThumbnail={false} />
                <div
                  class="flex-1 truncate text-sm"
                  style={{
                    color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColorBase
                  }}
                >
                  {item.name}
                </div>
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
