import type { Ref } from 'vue';
import { onUnmounted, ref } from 'vue';
import type { SortField } from '../types/file-explorer';
import { useBodyStyleOverride } from './useBodyStyleOverride';

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

/** 前 n-1 列当前宽度 + 最后一列最小宽，用于表最小宽度与拖拽 clamp */
function sumPrefixWidthsPlusLastMin(cols: ColumnConfig[]) {
  if (cols.length === 0) return 0;
  return (
    cols.slice(0, -1).reduce((s, c) => s + c.width, 0) +
    (cols.at(-1)?.minWidth ?? DEFAULT_MIN_WIDTH)
  );
}

export interface UseColumnResizeReturn {
  resizing: Ref<{
    columnId: SortField;
    /** 列分隔线在视口中的 X，与宽热区/粗线条对齐用 */
    separatorClientX: number;
    leftColumn: ColumnConfig;
    rightColumn: ColumnConfig | null;
    leftStartWidth: number;
    rightStartWidth: number;
    columnIndex: number;
    animationFrame: number | null;
  } | null>;
  hoveredResizer: Ref<SortField | null>;
  startResize: (e: MouseEvent, columnId: SortField, separatorClientX?: number) => void;
}

/** 列宽调整 Hook — 处理 DetailView 表头列拖拽调整宽度逻辑 */
export function useColumnResize(
  columns: Ref<ColumnConfig[]>,
  layoutWidth: Ref<number>
): UseColumnResizeReturn {
  const isUnmounted = ref(false);
  const bodyOverride = useBodyStyleOverride();
  const resizing = ref<{
    columnId: SortField;
    separatorClientX: number;
    leftColumn: ColumnConfig;
    rightColumn: ColumnConfig | null;
    leftStartWidth: number;
    rightStartWidth: number;
    columnIndex: number;
    animationFrame: number | null;
  } | null>(null);
  const hoveredResizer = ref<SortField | null>(null);

  const startResize = (e: MouseEvent, columnId: SortField, separatorClientX?: number) => {
    e.stopPropagation();
    e.preventDefault();

    const columnIndex = columns.value.findIndex(c => c.id === columnId);
    const leftCol = columns.value[columnIndex];
    if (!leftCol) return;

    const rightIndex = columnIndex + 1;
    const rightCol = columns.value[rightIndex] || null;

    resizing.value = {
      columnId,
      separatorClientX: separatorClientX ?? e.clientX,
      leftColumn: leftCol,
      rightColumn: rightCol,
      leftStartWidth: leftCol.width,
      rightStartWidth: rightCol?.width || 0,
      columnIndex,
      animationFrame: null
    };

    const handleMouseMove = (evt: MouseEvent) => {
      if (isUnmounted.value || !resizing.value) return;

      if (resizing.value.animationFrame !== null) {
        cancelAnimationFrame(resizing.value.animationFrame);
      }

      resizing.value.animationFrame = requestAnimationFrame(() => {
        const st = resizing.value;
        if (!st) return;

        const delta = evt.clientX - st.separatorClientX;

        if (st.rightColumn) {
          const rightIsLast = st.rightColumn.id === columns.value.at(-1)?.id;

          if (rightIsLast) {
            const tw = Math.max(layoutWidth.value, sumPrefixWidthsPlusLastMin(columns.value));
            const others = columns.value.slice(0, st.columnIndex).reduce((s, c) => s + c.width, 0);
            const lastMin = st.rightColumn.minWidth ?? DEFAULT_MIN_WIDTH;
            let newLeftWidth = st.leftStartWidth + delta;
            newLeftWidth = clampWidth(newLeftWidth, st.leftColumn.minWidth, st.leftColumn.maxWidth);
            const maxLeft = tw - others - lastMin;
            newLeftWidth = Math.min(newLeftWidth, maxLeft);
            newLeftWidth = Math.max(newLeftWidth, st.leftColumn.minWidth ?? DEFAULT_MIN_WIDTH);
            st.leftColumn.width = Math.round(newLeftWidth);
          } else {
            let newLeftWidth = st.leftStartWidth + delta;
            newLeftWidth = clampWidth(newLeftWidth, st.leftColumn.minWidth, st.leftColumn.maxWidth);
            const actualDelta = newLeftWidth - st.leftStartWidth;
            let newRightWidth = st.rightStartWidth - actualDelta;
            newRightWidth = clampWidth(
              newRightWidth,
              st.rightColumn.minWidth,
              st.rightColumn.maxWidth
            );
            const rightActualDelta = st.rightStartWidth - newRightWidth;
            if (Math.abs(rightActualDelta - actualDelta) > 0.5) {
              newLeftWidth = st.leftStartWidth + rightActualDelta;
              newLeftWidth = clampWidth(
                newLeftWidth,
                st.leftColumn.minWidth,
                st.leftColumn.maxWidth
              );
            }
            st.leftColumn.width = Math.round(newLeftWidth);
            st.rightColumn.width = Math.round(newRightWidth);
          }
        } else {
          let newWidth = st.leftStartWidth + delta;
          newWidth = clampWidth(newWidth, st.leftColumn.minWidth, st.leftColumn.maxWidth);
          st.leftColumn.width = Math.round(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      if (isUnmounted.value) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        return;
      }
      if (resizing.value && resizing.value.animationFrame !== null) {
        cancelAnimationFrame(resizing.value.animationFrame);
      }
      resizing.value = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      bodyOverride.stop();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    bodyOverride.start({ cursor: 'col-resize', userSelect: 'none' });
  };

  onUnmounted(() => {
    isUnmounted.value = true;
    if (resizing.value) {
      if (resizing.value.animationFrame !== null) {
        cancelAnimationFrame(resizing.value.animationFrame);
      }
      resizing.value = null;
      bodyOverride.stop();
    }
  });

  return { resizing, hoveredResizer, startResize };
}
