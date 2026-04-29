import { computed, defineComponent, ref } from 'vue';
import { NIcon, useThemeVars } from 'naive-ui';
import { ChevronDown, ChevronUp } from '@vicons/tabler';
import type { FileItem, SortField } from '../types/file-explorer';
import FileIcon from '../items/FileIcon';
import { formatDateTime, formatFileSize } from '../utils/fileHelpers';
import { useFileViewContext } from '../composables/useFileViewContext';
import { useColumnResize } from '../hooks/useColumnResize';
import { useColumnDrag } from '../hooks/useColumnDrag';

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
    const ctx = useFileViewContext();
    const sortField = computed(() => ctx.sortField?.value ?? 'name');
    const sortOrder = computed(() => ctx.sortOrder?.value ?? 'asc');
    const onSort = ctx.onSort ?? (() => {});
    const themeVars = useThemeVars();
    const tableRef = ref<HTMLTableElement | null>(null);
    const hoveredHeader = ref<SortField | null>(null);
    const hoveredRowId = ref<string | null>(null);

    // 列配置
    const columns = ref<ColumnConfig[]>([
      { id: 'name', label: '名称', width: 300 },
      { id: 'modifiedAt', label: '修改时间', width: 180 },
      { id: 'createdAt', label: '创建时间', width: 180 },
      { id: 'type', label: '类型', width: 120 },
      { id: 'size', label: '大小', width: 120 }
    ]);

    // 列宽调整 + 列拖拽排序（从 hooks 获取）
    const { resizing, hoveredResizer, startResize } = useColumnResize(columns);
    const { draggingColumn, startColumnDrag, getIndicatorStyle } = useColumnDrag(
      columns,
      tableRef,
      resizing
    );

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

      return (
        <th
          key={column.id}
          class="relative select-none px-4 py-2 text-left text-xs font-medium"
          style={{
            color: themeVars.value.textColor2,
            backgroundColor: isActive
              ? `${themeVars.value.primaryColor}08`
              : isHovered
                ? `${themeVars.value.primaryColorHover}08`
                : themeVars.value.tableHeaderColor,
            cursor: isDragging ? 'grabbing' : 'grab',
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
          <div class="pointer-events-none flex items-center gap-1">
            <span>{column.label}</span>
            <NIcon
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

          {/* 调整大小手柄 */}
          <div
            class="resize-handle absolute bottom-0 right-0 top-0 z-20 w-3 flex cursor-col-resize items-center justify-center"
            style={{
              marginRight: '-6px',
              pointerEvents: 'auto'
            }}
            onMousedown={(e: MouseEvent) => {
              e.stopPropagation();
              startResize(e, column.id);
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
              class="pointer-events-none h-full w-0.5"
              style={{
                backgroundColor: isResizing
                  ? themeVars.value.primaryColor
                  : isResizerHovered
                    ? themeVars.value.primaryColor
                    : themeVars.value.dividerColor,
                opacity: isResizerHovered || isResizing ? 1 : 0.6,
                transform: isResizerHovered || isResizing ? 'scaleY(1.2)' : 'scaleY(1)',
                transition: isResizing ? 'none' : 'all 200ms ease-out',
                boxShadow:
                  isResizing || isResizerHovered
                    ? `0 0 6px ${themeVars.value.primaryColor}80`
                    : 'none'
              }}
            />
          </div>
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

    return () => {
      const indicatorStyle = getIndicatorStyle();

      return (
        <div style={{ position: 'relative', backgroundColor: themeVars.value.bodyColor }}>
          {/* 浮动幽灵：跟随鼠标显示被拖拽的列名 */}
          {draggingColumn.value &&
            (() => {
              const tableRect = tableRef.value?.getBoundingClientRect();
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

          <table
            ref={tableRef}
            class="min-w-full"
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              width: '100%',
              backgroundColor: themeVars.value.bodyColor
            }}
          >
            <colgroup>
              {columns.value.map(column => (
                <col key={column.id} style={{ width: `${column.width}px` }} />
              ))}
            </colgroup>
            <thead class="sticky top-0 z-10" data-prevent-selection="true">
              <tr>{columns.value.map((column, index) => SortHeader(column, index))}</tr>
            </thead>
            <tbody data-selector="content-viewer">
              {ctx.items.value.map(item => {
                const isSelected = ctx.selectedIds.value.has(item.id);
                return (
                  <tr
                    key={item.id}
                    data-selectable-id={item.id}
                    {...(isSelected ? { 'data-prevent-selection': 'true' } : null)}
                    class="cursor-pointer select-none transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? `${themeVars.value.primaryColorHover}20`
                        : hoveredRowId.value === item.id
                          ? themeVars.value.hoverColor
                          : 'transparent',
                      borderBottom: `1px solid ${themeVars.value.dividerColor}`
                    }}
                    onMouseenter={() => (hoveredRowId.value = item.id)}
                    onMouseleave={() => (hoveredRowId.value = null)}
                    onClick={(e: MouseEvent) => ctx.onSelect([item.id], e)}
                    onDblclick={() => ctx.onOpen(item)}
                  >
                    {columns.value.map(column => (
                      <td key={column.id} class="px-4 py-1.5">
                        {renderCell(item, column, isSelected)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    };
  }
});
