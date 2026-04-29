import type { InjectionKey, Ref } from 'vue';
import { inject, provide } from 'vue';
import type { FileItem, GridSize, SortField, SortOrder } from '../types/file-explorer';

/** 视图上下文 — 替代 props 穿透，通过 provide/inject 传递 */
export interface FileViewContext {
  items: Ref<FileItem[]>;
  selectedIds: Ref<Set<string>>;
  onSelect: (ids: string[], event?: MouseEvent) => void;
  onOpen: (item: FileItem) => void;
  gridSize?: Ref<GridSize>;
  sortField?: Ref<SortField | undefined>;
  sortOrder?: Ref<SortOrder | undefined>;
  onSort?: (field: SortField) => void;
}

const FILE_VIEW_CONTEXT_KEY: InjectionKey<FileViewContext> = Symbol('FILE_VIEW_CONTEXT');

/** 在父组件中提供视图上下文 */
export function provideFileViewContext(ctx: FileViewContext) {
  provide(FILE_VIEW_CONTEXT_KEY, ctx);
}

/** 在视图组件中获取视图上下文 */
export function useFileViewContext(): FileViewContext {
  return inject<FileViewContext>(FILE_VIEW_CONTEXT_KEY)!;
}
