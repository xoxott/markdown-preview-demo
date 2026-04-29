import { computed, defineComponent, inject, ref } from 'vue';
import { NText, useThemeVars } from 'naive-ui';
import FileIcon from '../items/FileIcon';
import { formatFileSize } from '../utils/fileHelpers';
import { FILE_DRAG_DROP_KEY } from '../hooks/useFileDragDropEnhanced';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';
import { useFileViewContext } from '../composables/useFileViewContext';

export default defineComponent({
  name: 'TileView',
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
        class="grid box-border content-start gap-1 p-4"
        data-selector="content-viewer"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        {ctx.items.value.map(item => {
          const isSelected = ctx.selectedIds.value.has(item.id);
          return (
            <FileDropZoneWrapper key={item.id} zoneId={item.id} targetPath={item.path} item={item}>
              <div
                data-selectable-id={item.id}
                class="h-auto select-none rounded-lg p-2 transition-colors duration-150"
                style={{ backgroundColor: getItemBgColor(item.id, isSelected) }}
                {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                onMouseenter={() => (hoveredItemId.value = item.id)}
                onMouseleave={() => (hoveredItemId.value = null)}
                onClick={(e: MouseEvent) => ctx.onSelect([item.id], e)}
                onDblclick={() => ctx.onOpen(item)}
                onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                draggable
              >
                <div class="flex items-start gap-2">
                  <FileIcon item={item} size={48} />
                  <div class="min-w-0 flex flex-col flex-1 justify-start gap-1">
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
