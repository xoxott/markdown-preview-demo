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

export interface UseColumnResizeReturn {
  resizing: Ref<{
    columnId: SortField;
    startX: number;
    leftColumn: ColumnConfig;
    rightColumn: ColumnConfig | null;
    leftStartWidth: number;
    rightStartWidth: number;
    columnIndex: number;
    animationFrame: number | null;
  } | null>;
  hoveredResizer: Ref<SortField | null>;
  startResize: (e: MouseEvent, columnId: SortField) => void;
}

/** 列宽调整 Hook — 处理 DetailView 表头列拖拽调整宽度逻辑 */
export function useColumnResize(columns: Ref<ColumnConfig[]>): UseColumnResizeReturn {
  const isUnmounted = ref(false);
  const bodyOverride = useBodyStyleOverride();
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
  const hoveredResizer = ref<SortField | null>(null);

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

      if (resizing.value.animationFrame !== null) {
        cancelAnimationFrame(resizing.value.animationFrame);
      }

      resizing.value.animationFrame = requestAnimationFrame(() => {
        if (!resizing.value) return;

        const { startX, leftColumn, rightColumn, leftStartWidth, rightStartWidth } = resizing.value;
        const delta = evt.clientX - startX;

        if (rightColumn) {
          let newLeftWidth = leftStartWidth + delta;
          newLeftWidth = clampWidth(newLeftWidth, leftColumn.minWidth, leftColumn.maxWidth);
          const actualDelta = newLeftWidth - leftStartWidth;
          let newRightWidth = rightStartWidth - actualDelta;
          newRightWidth = clampWidth(newRightWidth, rightColumn.minWidth, rightColumn.maxWidth);
          const rightActualDelta = rightStartWidth - newRightWidth;
          if (Math.abs(rightActualDelta - actualDelta) > 0.5) {
            newLeftWidth = leftStartWidth + rightActualDelta;
            newLeftWidth = clampWidth(newLeftWidth, leftColumn.minWidth, leftColumn.maxWidth);
          }
          leftColumn.width = Math.round(newLeftWidth);
          rightColumn.width = Math.round(newRightWidth);
        } else {
          let newWidth = leftStartWidth + delta;
          newWidth = clampWidth(newWidth, leftColumn.minWidth, leftColumn.maxWidth);
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
