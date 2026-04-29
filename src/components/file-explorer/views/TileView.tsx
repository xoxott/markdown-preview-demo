import { defineComponent } from 'vue';
import { NText } from 'naive-ui';
import FileIcon from '../items/FileIcon';
import { formatFileSize } from '../utils/fileHelpers';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';
import { useViewItemState } from '../composables/useFileViewContext';

export default defineComponent({
  name: 'TileView',
  setup() {
    const { ctx, themeVars, hoveredItemId, dragDrop, selectedItems, getItemBgColor } =
      useViewItemState();

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
