import type { PropType, Ref } from 'vue';
import { computed, defineComponent, inject, ref } from 'vue';
import { useThemeVars } from 'naive-ui';
import FileIcon from '../items/FileIcon';
import type { FileItem, GridSize } from '../types/file-explorer';
import type { FileDragDropHook } from '../hooks/useFileDragDropEnhanced';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';

export default defineComponent({
  name: 'GridView',
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
    },
    gridSize: {
      type: String as PropType<GridSize>,
      required: true
    }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const dragDrop = inject<FileDragDropHook>('FILE_DRAG_DROP')!;
    const hoveredItemId = ref<string | null>(null);
    const sizeMap = {
      'small': { icon: 48, gap: 8, itemWidth: 70, padding: '4px 6px' },
      'medium': { icon: 64, gap: 10, itemWidth: 100, padding: '6px 8px' },
      'large': { icon: 96, gap: 12, itemWidth: 120, padding: '8px 10px' },
      'extra-large': { icon: 128, gap: 14, itemWidth: 150, padding: '10px 12px' }
    };

    const selectedItems = computed(() =>
      props.items.filter(it => props.selectedIds.value.has(it.id))
    );

    const getConfig = () => sizeMap[props.gridSize];

    const getItemBgColor = (id: string, isSelected: boolean) => {
      const dropZone = dragDrop.getDropZoneState(id);
      if (isSelected || (dropZone?.isOver && dropZone?.canDrop)) {
        return `${themeVars.value.primaryColorHover}20`;
      }
      if (hoveredItemId.value === id) return themeVars.value.hoverColor;
      return 'transparent';
    };
    return () => {
      const config = getConfig();
      return (
        <div
          class="grid p-4"
          data-selector="content-viewer"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${config.itemWidth}px, 1fr))`,
            gap: `${config.gap}px`,
            alignItems: 'start',
            backgroundColor: themeVars.value.bodyColor
          }}
        >
          {props.items.map(item => {
            const isSelected = props.selectedIds.value.has(item.id);
            return (
              <FileDropZoneWrapper
                key={item.id}
                zoneId={item.id}
                targetPath={item.path}
                item={item}
              >
                <div
                  class="flex-col inline-flex select-none items-center rounded-lg transition-all duration-200"
                  style={{
                    padding: config.padding,
                    backgroundColor: getItemBgColor(item.id, isSelected)
                  }}
                  {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                  onMouseenter={() => (hoveredItemId.value = item.id)}
                  onMouseleave={() => (hoveredItemId.value = null)}
                  data-selectable-id={item.id}
                  onClick={(e: MouseEvent) => props.onSelect([item.id], e)}
                  onDblclick={() => props.onOpen(item)}
                  onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                  draggable
                >
                  {/* 图标 */}
                  <div class="mb-1">
                    <FileIcon item={item} size={config.icon} />
                  </div>

                  {/* 文件名 */}
                  <div
                    class="break-words text-center"
                    style={{
                      fontSize: props.gridSize === 'small' ? '12px' : '14px',
                      lineHeight: '1.4',
                      maxWidth: `${config.itemWidth - 16}px`,
                      wordBreak: 'break-word',
                      color: isSelected
                        ? themeVars.value.primaryColor
                        : themeVars.value.textColorBase
                    }}
                  >
                    {item.name}
                  </div>
                </div>
              </FileDropZoneWrapper>
            );
          })}
        </div>
      );
    };
  }
});
