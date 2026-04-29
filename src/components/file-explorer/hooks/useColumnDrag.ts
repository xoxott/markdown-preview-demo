import type { Ref } from 'vue';
import { onUnmounted, ref } from 'vue';
import type { SortField } from '../types/file-explorer';

interface ColumnConfig {
  id: SortField;
  label: string;
  width: number;
}

interface PendingDragState {
  id: SortField;
  index: number;
  startX: number;
  ghostX: number;
}

interface ResizingState {
  columnId: SortField;
  startX: number;
  leftColumn: ColumnConfig;
  rightColumn: ColumnConfig | null;
  leftStartWidth: number;
  rightStartWidth: number;
  columnIndex: number;
  animationFrame: number | null;
}

export interface UseColumnDragReturn {
  draggingColumn: Ref<{
    id: SortField;
    index: number;
    startX: number;
    ghostX: number;
  } | null>;
  dropTargetIndex: Ref<number | null>;
  startColumnDrag: (e: MouseEvent, index: number) => void;
  getIndicatorStyle: () => { left: string; top: number; height: string } | null;
}

/** 列拖拽排序 Hook — Finder风格浮动幽灵+插入指示线 */
export function useColumnDrag(
  columns: Ref<ColumnConfig[]>,
  tableRef: Ref<HTMLTableElement | null>,
  resizing: Ref<ResizingState | null>
): UseColumnDragReturn {
  const isUnmounted = ref(false);
  const draggingColumn = ref<{
    id: SortField;
    index: number;
    startX: number;
    ghostX: number;
  } | null>(null);
  const dropTargetIndex = ref<number | null>(null);

  const startColumnDrag = (e: MouseEvent, index: number) => {
    if (resizing.value) return;
    const column = columns.value[index];
    const startX = e.clientX;

    const thElements = tableRef.value?.querySelectorAll('th');
    const initialRect = thElements?.[index]?.getBoundingClientRect();

    let pendingDrag: PendingDragState | null = {
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
        draggingColumn.value = pendingDrag ? { ...pendingDrag, ghostX: evt.clientX } : null;
        dropTargetIndex.value = null;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }

      if (!hasMoved) return;

      draggingColumn.value!.ghostX = evt.clientX;

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
      pendingDrag = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getIndicatorStyle = () => {
    if (!draggingColumn.value || dropTargetIndex.value === null) return null;
    const ths = tableRef.value?.querySelectorAll('th');
    if (!ths) return null;

    const dragIndex = draggingColumn.value.index;
    const dropIndex = dropTargetIndex.value;
    const dropRect = ths[dropIndex].getBoundingClientRect();
    const tableRect = tableRef.value!.getBoundingClientRect();

    const x =
      dragIndex < dropIndex ? dropRect.right - tableRect.left : dropRect.left - tableRect.left;

    return {
      left: `${x}px`,
      top: 0,
      height: `${ths[dropIndex].offsetHeight}px`
    };
  };

  onUnmounted(() => {
    isUnmounted.value = true;
    if (draggingColumn.value) {
      draggingColumn.value = null;
      dropTargetIndex.value = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  return { draggingColumn, dropTargetIndex, startColumnDrag, getIndicatorStyle };
}
