import type { PropType, Ref } from 'vue';
import { computed, defineComponent, inject, ref } from 'vue';
import { useThemeVars } from 'naive-ui';
import FileIcon from '../items/FileIcon';
import type { FileItem } from '../types/file-explorer';
import { formatDate, formatFileSize } from '../utils/fileHelpers';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';
import type { FileDragDropHook } from '../hooks/useFileDragDropEnhanced';

export default defineComponent({
  name: 'ContentView',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    selectedIds: { type: Object as PropType<Ref<Set<string>>>, required: true },
    onSelect: { type: Function as PropType<(id: string[], event?: MouseEvent) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const dragDrop = inject<FileDragDropHook>('FILE_DRAG_DROP')!;
    const selectedItems = computed(() => props.items.filter(it => props.selectedIds.value.has(it.id)));

    const handleMouseEnter = (e: MouseEvent, isSelected: boolean) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.backgroundColor = themeVars.value.hoverColor;
      }
    };

    const handleMouseLeave = (e: MouseEvent, isSelected: boolean) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.backgroundColor = themeVars.value.cardColor;
      }
    };
    return () => (
      <div
        class="grid grid-cols-3 content-start gap-2 p-4 lg:grid-cols-6 md:grid-cols-4 xl:grid-cols-7"
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
                key={item.id}
                data-selectable-id={item.id}
                class="select-none self-start overflow-hidden rounded transition-all"
                style={{
                  backgroundColor:
                    isSelected ||
                    (dragDrop.getDropZoneState(item.id)?.isOver && dragDrop.getDropZoneState(item.id)?.canDrop)
                      ? `${themeVars.value.primaryColorHover}20`
                      : 'transparent'
                }}
                onMouseenter={e => handleMouseEnter(e, isSelected)}
                onMouseleave={e => handleMouseLeave(e, isSelected)}
                {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                onClick={(e: MouseEvent) => props.onSelect([item.id], e)}
                onDblclick={() => props.onOpen(item)}
                onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                draggable
              >
                {/* 预览区域 */}
                <div class="relative aspect-video flex items-center justify-center overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.name} class="h-full w-full object-cover" />
                  ) : (
                    <FileIcon item={item} size={48} showThumbnail={false} />
                  )}
                </div>

                {/* 信息区域 */}
                <div class="p-2">
                  <h3
                    class="truncate text-sm font-medium"
                    style={{
                      color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColorBase
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

                  {/* 摘要/描述 */}
                  {item.type === 'file' && item.extension && (
                    <p
                      class="mt-1 truncate text-xs"
                      style={{
                        color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColor3
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
