import { computed, defineComponent, inject, ref } from 'vue';
import { useThemeVars } from 'naive-ui';
import FileIcon from '../items/FileIcon';
import { formatDate, formatFileSize } from '../utils/fileHelpers';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';
import type { FileDragDropHook } from '../hooks/useFileDragDropEnhanced';
import { useFileViewContext } from '../composables/useFileViewContext';

export default defineComponent({
  name: 'ContentView',
  setup() {
    const themeVars = useThemeVars();
    const ctx = useFileViewContext();
    const hoveredItemId = ref<string | null>(null);
    const dragDrop = inject<FileDragDropHook>('FILE_DRAG_DROP')!;
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
        class="grid grid-cols-3 content-start gap-2 p-4 lg:grid-cols-6 md:grid-cols-4 xl:grid-cols-7"
        data-selector="content-viewer"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
        {ctx.items.value.map(item => {
          const isSelected = ctx.selectedIds.value.has(item.id);
          return (
            <FileDropZoneWrapper key={item.id} zoneId={item.id} targetPath={item.path} item={item}>
              <div
                data-selectable-id={item.id}
                class="select-none self-start overflow-hidden rounded transition-all"
                style={{ backgroundColor: getItemBgColor(item.id, isSelected) }}
                onMouseenter={() => (hoveredItemId.value = item.id)}
                onMouseleave={() => (hoveredItemId.value = null)}
                {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                onClick={(e: MouseEvent) => ctx.onSelect([item.id], e)}
                onDblclick={() => ctx.onOpen(item)}
                onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                draggable
              >
                <div class="relative aspect-video flex items-center justify-center overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      class="h-full w-full object-cover"
                    />
                  ) : (
                    <FileIcon item={item} size={48} showThumbnail={false} />
                  )}
                </div>
                <div class="p-2">
                  <h3
                    class="truncate text-sm font-medium"
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
                      color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColor3
                    }}
                  >
                    <span class="flex-1 truncate">{formatDate(item.modifiedAt)}</span>
                    <span class="ml-2 flex-shrink-0">
                      {item.type === 'file' ? formatFileSize(item.size) : '文件夹'}
                    </span>
                  </div>
                  {item.type === 'file' && item.extension && (
                    <p
                      class="mt-1 truncate text-xs"
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
            </FileDropZoneWrapper>
          );
        })}
      </div>
    );
  }
});
