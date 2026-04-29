import type { PropType, Ref } from 'vue';
import { computed, defineComponent, onUnmounted, ref } from 'vue';
import { NIcon, useThemeVars } from 'naive-ui';
import { ChevronDown, ChevronUp } from '@vicons/tabler';
import type { FileItem, SortField, SortOrder } from '../types/file-explorer';
import FileIcon from '../items/FileIcon';
import { formatFileSize } from '../utils/fileHelpers';

interface ColumnConfig {
  id: SortField;
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
}

const DEFAULT_MIN_WIDTH = 40;

function clampWidth(width: number, minWidth?: number, maxWidth?: number) {
  return Math.min(maxWidth ?? Infinity, Math.max(minWidth ?? DEFAULT_MIN_WIDTH, width));
}

export default defineComponent({
  name: 'DetailView',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    selectedIds: { type: Object as PropType<Ref<Set<string>>>, required: true },
    onSelect: {
      type: Function as PropType<(id: string[], event?: MouseEvent) => void>,
      required: true
    },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    sortField: { type: String as PropType<SortField>, required: true },
    sortOrder: { type: String as PropType<SortOrder>, required: true },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: true }
  },
  setup(props, { expose: _expose }) {
    const themeVars = useThemeVars();
    const tableRef = ref<HTMLTableElement | null>(null);
    const hoveredHeader = ref<SortField | null>(null);
    const hoveredResizer = ref<SortField | null>(null);
    const hoveredRowId = ref<string | null>(null);
    const isUnmounted = ref(false);
    // 列配置 - 自动应用约束
    const columns = ref<ColumnConfig[]>([
      { id: 'name', label: '名称', width: 300 },
      { id: 'modifiedAt', label: '修改时间', width: 180 },
      { id: 'createdAt', label: '创建时间', width: 180 },
      { id: 'type', label: '类型', width: 120 },
      { id: 'size', label: '大小', width: 120 }
    ]);

    // 调整列宽状态
    const resizing = ref<{
      columnId: SortField;
      startX: number;
      leftColumn: ColumnConfig;
      rightColumn: ColumnConfig | null;
      leftStartWidth: number;
      rightStartWidth: number;
      columnIndex: number;
      animationFrame: number | null;
    } | null>(null);

    // 拖拽列顺序状态（自定义 mousedown/mousemove/mouseup 实现）
    const draggingColumn = ref<{
      id: SortField;
      index: number;
      startX: number;
      ghostX: number;
    } | null>(null);
    // dropTargetIndex: 鼠标越界即标记的插入目标位置
    const dropTargetIndex = ref<number | null>(null);
    const _totalWidth = computed(() => {
      return columns.value.reduce((sum, col) => sum + col.width, 0);
    });

    // 格式化日期
    const formatDate = (date?: string | Date) => {
      if (!date) return '';
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // 获取排序图标
    const getSortIcon = () => (props.sortOrder === 'asc' ? ChevronUp : ChevronDown);

    // 优化的列宽调整逻辑
    const startResize = (e: MouseEvent, columnId: SortField) => {
      e.stopPropagation();
      e.preventDefault();

      const columnIndex = columns.value.findIndex(c => c.id === columnId);
      const leftCol = columns.value[columnIndex];
      if (!leftCol) return;

      const rightIndex = columnIndex + 1;
      const rightCol = columns.value[rightIndex] || null;

      resizing.value = {
        columnId,
        startX: e.clientX,
        leftColumn: leftCol,
        rightColumn: rightCol,
        leftStartWidth: leftCol.width,
        rightStartWidth: rightCol?.width || 0,
        columnIndex,
        animationFrame: null
      };

      const handleMouseMove = (evt: MouseEvent) => {
        if (isUnmounted.value || !resizing.value) return;

        // 使用 requestAnimationFrame 节流，避免过度计算
        if (resizing.value.animationFrame !== null) {
          cancelAnimationFrame(resizing.value.animationFrame);
        }

        resizing.value.animationFrame = requestAnimationFrame(() => {
          if (!resizing.value) return;

          const { startX, leftColumn, rightColumn, leftStartWidth, rightStartWidth } =
            resizing.value;

          const delta = evt.clientX - startX;

          if (rightColumn) {
            // 双向调整：左列变化，右列反向变化
            const leftMin = leftColumn.minWidth;
            const leftMax = leftColumn.maxWidth;
            const rightMin = rightColumn.minWidth;
            const rightMax = rightColumn.maxWidth;

            // 计算左列期望宽度
            let newLeftWidth = leftStartWidth + delta;

            // 应用左列约束
            newLeftWidth = clampWidth(newLeftWidth, leftMin, leftMax);

            // 计算实际变化量
            const actualDelta = newLeftWidth - leftStartWidth;

            // 右列相应调整
            let newRightWidth = rightStartWidth - actualDelta;

            // 应用右列约束
            newRightWidth = clampWidth(newRightWidth, rightMin, rightMax);

            // 如果右列到达边界，回推左列
            const rightActualDelta = rightStartWidth - newRightWidth;
            if (Math.abs(rightActualDelta - actualDelta) > 0.5) {
              newLeftWidth = leftStartWidth + rightActualDelta;
              newLeftWidth = clampWidth(newLeftWidth, leftMin, leftMax);
            }

            // 批量更新宽度
            leftColumn.width = Math.round(newLeftWidth);
            rightColumn.width = Math.round(newRightWidth);
          } else {
            // 单列调整：最后一列自由调整
            let newWidth = leftStartWidth + delta;
            const min = leftColumn.minWidth;
            const max = leftColumn.maxWidth;

            newWidth = clampWidth(newWidth, min, max);
            leftColumn.width = Math.round(newWidth);
          }
        });
      };

      const handleMouseUp = () => {
        if (isUnmounted.value) {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          return;
        }
        if (resizing.value && resizing.value?.animationFrame !== null) {
          cancelAnimationFrame(resizing.value.animationFrame);
        }
        resizing.value = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    // 开始拖拽列（Finder 风格：浮动幽灵 + 插入指示线，零 transform 位移，零闪烁）
    const startColumnDrag = (e: MouseEvent, index: number) => {
      if (resizing.value) return;
      const column = columns.value[index];
      const startX = e.clientX;

      // 获取拖拽列初始位置用于计算幽灵偏移
      const thElements = tableRef.value?.querySelectorAll('th');
      const initialRect = thElements?.[index]?.getBoundingClientRect();

      let pendingDrag = {
        id: column.id,
        index,
        startX,
        ghostX: initialRect ? initialRect.left : startX
      };
      let hasMoved = false;

      const handleMouseMove = (evt: MouseEvent) => {
        if (isUnmounted.value) return;

        if (!hasMoved && Math.abs(evt.clientX - startX) > 3) {
          hasMoved = true;
          draggingColumn.value = { ...pendingDrag, ghostX: evt.clientX };
          dropTargetIndex.value = null;
          document.body.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
        }

        if (!hasMoved) return;

        // 更新幽灵位置
        draggingColumn.value!.ghostX = evt.clientX;

        // 计算当前鼠标所在的列索引
        const ths = tableRef.value?.querySelectorAll('th');
        if (!ths || ths.length === 0) return;

        const dragIndex = draggingColumn.value!.index;
        let hoverIndex: number | null = null;
        for (let i = 0; i < ths.length; i++) {
          const rect = ths[i].getBoundingClientRect();
          if (evt.clientX >= rect.left && evt.clientX <= rect.right) {
            hoverIndex = i;
            break;
          }
        }

        if (hoverIndex === null || hoverIndex === dragIndex) {
          dropTargetIndex.value = null;
          return;
        }

        // 直接设置目标为鼠标所在列（越界即标记）
        dropTargetIndex.value = hoverIndex;
      };

      const handleMouseUp = () => {
        if (isUnmounted.value) {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          return;
        }
        if (hasMoved && draggingColumn.value && dropTargetIndex.value !== null) {
          const fromIndex = draggingColumn.value.index;
          const toIndex = dropTargetIndex.value;
          if (fromIndex !== toIndex) {
            const newColumns = [...columns.value];
            const [draggedCol] = newColumns.splice(fromIndex, 1);
            newColumns.splice(toIndex, 0, draggedCol);
            columns.value = newColumns;
          }
        }

        draggingColumn.value = null;
        dropTargetIndex.value = null;
        pendingDrag = null as any;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // 计算插入指示线的位置（在目标列的左或右边界）
    const getIndicatorStyle = () => {
      if (!draggingColumn.value || dropTargetIndex.value === null) return null;
      const ths = tableRef.value?.querySelectorAll('th');
      if (!ths) return null;

      const dragIndex = draggingColumn.value.index;
      const dropIndex = dropTargetIndex.value;
      const dropRect = ths[dropIndex].getBoundingClientRect();
      const tableRect = tableRef.value!.getBoundingClientRect();

      // 指示线在目标列的左边界（向左拖）或右边界（向右拖）
      const x =
        dragIndex < dropIndex ? dropRect.right - tableRect.left : dropRect.left - tableRect.left;

      return {
        left: `${x}px`,
        top: 0,
        height: `${ths[dropIndex].offsetHeight}px`
      };
    };

    const getColumnZIndex = (index: number) => {
      if (!draggingColumn.value) return 1;
      return index === draggingColumn.value.index ? 100 : 10;
    };

    // 渲染表头
    const SortHeader = (column: ColumnConfig, index: number) => {
      const SortIconComp = getSortIcon();
      const isActive = props.sortField === column.id;
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
            props.onSort(column.id);
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
              title={formatDate(item.modifiedAt)}
            >
              {formatDate(item.modifiedAt)}
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
              title={formatDate(item.createdAt)}
            >
              {formatDate(item.createdAt)}
            </span>
          );
        default:
          return null;
      }
    };

    // 清理资源：取消任何进行中的 resize/drag 操作
    onUnmounted(() => {
      isUnmounted.value = true;
      if (resizing.value) {
        if (resizing.value.animationFrame !== null) {
          cancelAnimationFrame(resizing.value.animationFrame);
        }
        resizing.value = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (draggingColumn.value) {
        draggingColumn.value = null;
        dropTargetIndex.value = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
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
              {props.items.map(item => {
                const isSelected = props.selectedIds.value.has(item.id);
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
                    onClick={(e: MouseEvent) => props.onSelect([item.id], e)}
                    onDblclick={() => props.onOpen(item)}
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
