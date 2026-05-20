import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { NIcon, NScrollbar } from 'naive-ui';
import { ChevronDown, ChevronUp } from '@vicons/tabler';
import type { FileItem, SortField } from '../types/file-explorer';
import FileIcon from '../items/FileIcon';
import { formatDateTime, formatFileSize } from '../utils/fileHelpers';
import { useViewItemState } from '../composables/useFileViewContext';
import { FileDropZoneWrapper } from '../interaction/FileDropZoneWrapper';
import { useColumnResize } from '../hooks/useColumnResize';
import { useColumnDrag } from '../hooks/useColumnDrag';
import { FILE_LIST_SCROLL_HOST_CLASS } from '../constants/fileListScrollHost';

interface ColumnConfig {
  id: SortField;
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
}

export default defineComponent({
  name: 'DetailView',
  setup() {
    const { ctx, themeVars, hoveredItemId, dragDrop, selectedItems, getItemBgColor } =
      useViewItemState();
    const sortField = computed(() => ctx.sortField?.value ?? 'name');
    const sortOrder = computed(() => ctx.sortOrder?.value ?? 'asc');
    const onSort = ctx.onSort ?? (() => {});
    const headerTableRef = ref<HTMLTableElement | null>(null);
    const layoutRef = ref<HTMLElement | null>(null);
    const layoutWidth = ref(0);
    const bodyScrollLeft = ref(0);
    const hoveredHeader = ref<SortField | null>(null);

    const syncBodyScrollForHeader = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        bodyScrollLeft.value = target.scrollLeft;
      }
    };

    // 列配置
    const columns = ref<ColumnConfig[]>([
      { id: 'name', label: '名称', width: 300 },
      { id: 'modifiedAt', label: '修改时间', width: 180 },
      { id: 'createdAt', label: '创建时间', width: 180 },
      { id: 'type', label: '类型', width: 120 },
      { id: 'size', label: '大小', width: 120 }
    ]);

    const tableMinWidth = computed(() => {
      if (columns.value.length === 0) return 0;
      return (
        columns.value.slice(0, -1).reduce((s, c) => s + c.width, 0) +
        (columns.value.at(-1)?.minWidth ?? 40)
      );
    });

    const tableDisplayWidth = computed(() =>
      Math.max(layoutWidth.value || tableMinWidth.value, tableMinWidth.value)
    );

    const lastColWidth = computed(() => {
      const lastMin = columns.value.at(-1)?.minWidth ?? 40;
      const prefix = columns.value.slice(0, -1).reduce((s, c) => s + c.width, 0);
      return Math.max(lastMin, tableDisplayWidth.value - prefix);
    });

    let layoutResizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      const el = layoutRef.value;
      if (!el) {
        layoutWidth.value = 0;
        return;
      }
      const measure = () => {
        layoutWidth.value = Math.round(el.clientWidth);
      };
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        layoutResizeObserver = new ResizeObserver(measure);
        layoutResizeObserver.observe(el);
      }
    });

    onUnmounted(() => {
      layoutResizeObserver?.disconnect();
      layoutResizeObserver = null;
    });

    // 列宽调整 + 列拖拽排序（从 hooks 获取）
    const { resizing, hoveredResizer, startResize } = useColumnResize(columns, layoutWidth);
    const { draggingColumn, startColumnDrag, getIndicatorStyle } = useColumnDrag(
      columns,
      headerTableRef,
      resizing
    );

    const getHeaderBg = (columnId: SortField, isHovered: boolean) => {
      if (sortField.value === columnId) {
        return themeVars.value.tableColor ?? themeVars.value.hoverColor;
      }
      if (isHovered) {
        return themeVars.value.hoverColor;
      }
      return themeVars.value.tableHeaderColor;
    };

    // 获取排序图标
    const getSortIcon = () => (sortOrder.value === 'asc' ? ChevronUp : ChevronDown);

    const getColumnZIndex = (index: number) => {
      if (!draggingColumn.value) return 1;
      return index === draggingColumn.value.index ? 100 : 10;
    };

    // 渲染表头
    const SortHeader = (column: ColumnConfig, index: number) => {
      const SortIconComp = getSortIcon();
      const isActive = sortField.value === column.id;
      const isHovered = hoveredHeader.value === column.id;
      const isResizerHovered = hoveredResizer.value === column.id;
      const isDragging = draggingColumn.value?.id === column.id;
      const isResizing = resizing.value?.columnId === column.id;
      const isLastColumn = index === columns.value.length - 1;

      return (
        <th
          key={column.id}
          class="relative min-w-0 select-none overflow-hidden px-4 py-2 text-left text-xs font-medium"
          style={{
            color: themeVars.value.textColor2,
            backgroundColor: getHeaderBg(column.id, isHovered),
            cursor: resizing.value ? 'col-resize' : isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.3 : 1,
            zIndex: getColumnZIndex(index),
            borderBottom: `1px solid ${themeVars.value.dividerColor}`
          }}
          onMousedown={(e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.resize-handle')) return;
            startColumnDrag(e, index);
          }}
          onMouseenter={() => (hoveredHeader.value = column.id)}
          onMouseleave={() => (hoveredHeader.value = null)}
          onClick={(e: MouseEvent) => {
            if (resizing.value) return;
            if ((e.target as HTMLElement).closest('.resize-handle')) return;
            onSort(column.id);
          }}
        >
          <div class="pointer-events-none min-w-0 flex items-center gap-1 overflow-hidden pr-1">
            <span class="min-w-0 truncate" title={column.label}>
              {column.label}
            </span>
            <NIcon
              class="shrink-0"
              size={16}
              style={{
                color: isActive ? themeVars.value.primaryColor : themeVars.value.textColor3,
                opacity: isActive || isHovered ? 1 : 0,
                transition: 'opacity 0.15s ease'
              }}
            >
              <SortIconComp />
            </NIcon>
          </div>

          {/* 列间调整宽度：最后一列右侧无相邻列，不显示手柄 */}
          {!isLastColumn && (
            <div
              class="resize-handle absolute bottom-0 top-0 z-20 w-6 flex cursor-col-resize items-center justify-center -translate-x-1/2"
              style={{
                left: '100%',
                pointerEvents: 'auto'
              }}
              onMousedown={(e: MouseEvent) => {
                e.stopPropagation();
                const th = (e.currentTarget as HTMLElement).closest('th');
                const sep = th?.getBoundingClientRect().right ?? e.clientX;
                startResize(e, column.id, sep);
              }}
              onMouseenter={() => (hoveredResizer.value = column.id)}
              onMouseleave={() => (hoveredResizer.value = null)}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <div class="absolute inset-0" style={{ cursor: 'col-resize' }} />
              <div
                class="pointer-events-none h-full rounded-full"
                style={{
                  width: '4px',
                  backgroundColor: isResizing
                    ? themeVars.value.primaryColor
                    : isResizerHovered
                      ? themeVars.value.primaryColor
                      : themeVars.value.dividerColor,
                  opacity: isResizerHovered || isResizing ? 1 : 0.6,
                  transform: isResizerHovered || isResizing ? 'scaleY(1.08)' : 'scaleY(1)',
                  transition: isResizing ? 'none' : 'all 200ms ease-out',
                  boxShadow:
                    isResizing || isResizerHovered
                      ? `0 0 6px ${themeVars.value.primaryColor}80`
                      : 'none'
                }}
              />
            </div>
          )}
        </th>
      );
    };

    // 渲染单元格内容
    const renderCell = (item: FileItem, column: ColumnConfig, isSelected: boolean) => {
      const textStyle = {
        color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColor2
      };

      switch (column.id) {
        case 'name':
          return (
            <div class="flex items-center gap-3 overflow-hidden">
              <FileIcon item={item} size={18} showThumbnail={false} />
              <span
                class="truncate text-sm"
                style={{
                  color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColorBase
                }}
                title={item.name}
              >
                {item.name}
              </span>
            </div>
          );

        case 'modifiedAt':
          return (
            <span
              class="block truncate text-xs"
              style={textStyle}
              title={formatDateTime(item.modifiedAt)}
            >
              {formatDateTime(item.modifiedAt)}
            </span>
          );

        case 'type':
          const typeText = item.type === 'folder' ? '文件夹' : item.extension || '文件';
          return (
            <span class="block truncate text-xs" style={textStyle} title={typeText}>
              {typeText}
            </span>
          );

        case 'size':
          const sizeText = item.type === 'file' ? formatFileSize(item.size) : '-';
          return (
            <span class="block truncate text-xs" style={textStyle} title={sizeText}>
              {sizeText}
            </span>
          );
        case 'createdAt':
          return (
            <span
              class="block truncate text-xs"
              style={textStyle}
              title={formatDateTime(item.createdAt)}
            >
              {formatDateTime(item.createdAt)}
            </span>
          );
        default:
          return null;
      }
    };

    const ColGroup = () => (
      <colgroup>
        {columns.value.map((column, idx) => {
          const isLast = idx === columns.value.length - 1;
          const w = isLast ? lastColWidth.value : column.width;
          return <col key={column.id} style={{ width: `${w}px` }} />;
        })}
      </colgroup>
    );

    // 表宽 = max(列表视口, 最小列宽和)；最后一列用剩余像素，避免 width:100% 时各列被按比例拉伸导致拖拽漂移
    const tableStyle = {
      borderCollapse: 'separate' as const,
      borderSpacing: 0,
      tableLayout: 'fixed' as const,
      width: `${tableDisplayWidth.value}px`,
      minWidth: `${tableMinWidth.value}px`,
      backgroundColor: themeVars.value.bodyColor
    };

    return () => {
      const indicatorStyle = getIndicatorStyle();

      return (
        <div
          ref={layoutRef}
          class="h-full min-h-0 flex flex-col"
          style={{
            position: 'relative',
            backgroundColor: themeVars.value.bodyColor
          }}
        >
          {/* 浮动幽灵：跟随鼠标显示被拖拽的列名 */}
          {draggingColumn.value &&
            (() => {
              const tableRect = headerTableRef.value?.getBoundingClientRect();
              const relativeX = tableRect ? draggingColumn.value!.ghostX - tableRect.left : 0;
              return (
                <div
                  style={{
                    position: 'absolute',
                    left: `${relativeX}px`,
                    top: 0,
                    transform: 'translateX(-50%)',
                    padding: '4px 12px',
                    backgroundColor: themeVars.value.primaryColor,
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 200,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {columns.value[draggingColumn.value!.index]?.label}
                </div>
              );
            })()}

          {/* 插入指示线：蓝色竖线标记目标位置 */}
          {indicatorStyle && (
            <div
              style={{
                position: 'absolute',
                ...indicatorStyle,
                width: '2px',
                backgroundColor: themeVars.value.primaryColor,
                zIndex: 150,
                pointerEvents: 'none',
                borderRadius: '1px'
              }}
            />
          )}

          {/* 固定表头：不参与纵向滚动，横向与表体同步 */}
          <div
            class="shrink-0 overflow-hidden"
            data-prevent-selection="true"
            style={{
              borderBottom: `1px solid ${themeVars.value.dividerColor}`,
              backgroundColor: themeVars.value.tableHeaderColor
            }}
          >
            <div style={{ transform: `translateX(-${bodyScrollLeft.value}px)` }}>
              <table ref={headerTableRef} style={tableStyle}>
                <ColGroup />
                <thead>
                  <tr>{columns.value.map((column, index) => SortHeader(column, index))}</tr>
                </thead>
              </table>
            </div>
          </div>

          <NScrollbar
            class="min-h-0 flex-1"
            yPlacement="right"
            xPlacement="bottom"
            xScrollable
            onScroll={syncBodyScrollForHeader}
            // @ts-expect-error containerClass 由 naive-ui 内部 scrollbar 支持，公共类型未导出
            containerClass={FILE_LIST_SCROLL_HOST_CLASS}
          >
            <table style={tableStyle}>
              <ColGroup />
              <tbody data-selector="content-viewer">
                {ctx.items.value.map(item => {
                  const isSelected = ctx.selectedIds.value.has(item.id);
                  const rowBg = getItemBgColor(item.id, isSelected);
                  return (
                    <FileDropZoneWrapper
                      key={item.id}
                      zoneId={item.id}
                      targetPath={item.path}
                      item={item}
                    >
                      <tr
                        data-selectable-id={item.id}
                        {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                        class="cursor-pointer select-none transition-colors"
                        style={{
                          backgroundColor: rowBg,
                          borderBottom: `1px solid ${themeVars.value.dividerColor}`
                        }}
                        onMouseenter={() => (hoveredItemId.value = item.id)}
                        onMouseleave={() => (hoveredItemId.value = null)}
                        onClick={(e: MouseEvent) => ctx.onSelect([item.id], e)}
                        onDblclick={() => ctx.onOpen(item)}
                        draggable
                        onDragstart={e => dragDrop.startDrag(selectedItems.value, e)}
                      >
                        {columns.value.map(column => (
                          <td
                            key={column.id}
                            class="px-4 py-1.5"
                            style={{ backgroundColor: rowBg }}
                          >
                            {renderCell(item, column, isSelected)}
                          </td>
                        ))}
                      </tr>
                    </FileDropZoneWrapper>
                  );
                })}
              </tbody>
            </table>
          </NScrollbar>
        </div>
      );
    };
  }
});
