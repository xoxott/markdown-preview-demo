import type { InjectionKey, Ref } from 'vue';
import { inject, provide, ref } from 'vue';
import { useThemeVars } from 'naive-ui';
import type { FileItem, GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer';
import type { FileDragDropHook } from '../hooks/useFileDragDropEnhanced';

/** 视图上下文 — 替代 props 穿透，通过 provide/inject 传递 */
export interface FileViewContext {
  items: Ref<FileItem[]>;
  selectedIds: Ref<Set<string>>;
  onSelect: (ids: string[], event?: MouseEvent) => void;
  onOpen: (item: FileItem) => void;
  viewMode?: Ref<ViewMode>;
  gridSize?: Ref<GridSize>;
  sortField?: Ref<SortField | undefined>;
  sortOrder?: Ref<SortOrder | undefined>;
  onSort?: (field: SortField) => void;
  dragDrop?: FileDragDropHook;
  selectedItems?: Ref<FileItem[]>;
}

const FILE_VIEW_CONTEXT_KEY: InjectionKey<FileViewContext> = Symbol('FILE_VIEW_CONTEXT');

/** 在父组件中提供视图上下文 */
export function provideFileViewContext(ctx: FileViewContext) {
  provide(FILE_VIEW_CONTEXT_KEY, ctx);
}

/** 在视图组件中获取视图上下文 */
export function useFileViewContext(): FileViewContext {
  const ctx = inject(FILE_VIEW_CONTEXT_KEY);
  if (!ctx) {
    throw new Error(
      'useFileViewContext must be used within a ViewContainer that provides FileViewContext'
    );
  }
  return ctx;
}

/**
 * 视图项通用状态 — 提取 4 个视图的重复逻辑
 *
 * 包括：hoveredItemId、dragDrop、selectedItems、getItemBgColor
 */
export function useViewItemState() {
  const ctx = useFileViewContext();
  const themeVars = useThemeVars();
  const hoveredItemId = ref<string | null>(null);
  if (!ctx.dragDrop) {
    throw new Error('useViewItemState requires dragDrop to be provided in FileViewContext');
  }
  if (!ctx.selectedItems) {
    throw new Error('useViewItemState requires selectedItems to be provided in FileViewContext');
  }
  const dragDrop = ctx.dragDrop;
  const selectedItems = ctx.selectedItems;

  const getItemBgColor = (id: string, isSelected: boolean) => {
    const dropZone = dragDrop.getDropZoneState(id);
    if (isSelected || (dropZone?.isOver && dropZone?.canDrop)) {
      return `${themeVars.value.primaryColorHover}20`;
    }
    if (hoveredItemId.value === id) return themeVars.value.hoverColor;
    return 'transparent';
  };

  return {
    ctx,
    themeVars,
    hoveredItemId,
    dragDrop,
    selectedItems,
    getItemBgColor
  };
}
