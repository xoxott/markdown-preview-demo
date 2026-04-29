import type { PropType, Ref } from 'vue';
import { defineComponent, toRef } from 'vue';
import { NScrollbar } from 'naive-ui';
import { useContextMenuOptions } from '../hooks/useContextMenuOptions';
import ContextMenu from '../interaction/ContextMenu';
import type { FileItem, GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer';
import NSelectionRect from '../interaction/NSelectionRect';
import FileLoading from '../feedback/FileLoading';
import FilePagination from '../layout/FilePagination';
import { provideFileViewContext } from '../composables/useFileViewContext';
import FileViewRenderer from './FileViewRenderer';

export default defineComponent({
  name: 'ViewContainer',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    viewMode: { type: String as PropType<ViewMode>, required: true },
    gridSize: { type: String as PropType<GridSize>, required: false, default: 'medium' },
    selectedIds: { type: Object as PropType<Ref<Set<string>>>, required: true },
    onSelect: {
      type: Function as PropType<(id: string[], event?: MouseEvent) => void>,
      required: true
    },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    sortField: { type: String as PropType<SortField>, required: false },
    sortOrder: { type: String as PropType<SortOrder>, required: false },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: false },
    loading: { type: Boolean, required: false, default: false },
    loadingTip: { type: String, required: false, default: '加载中...' },
    onContextMenuSelect: { type: Function as PropType<(key: string) => void>, required: true },
    // 分页相关 props
    currentPage: { type: Number, required: false, default: 1 },
    pageSize: { type: Number, required: false, default: 20 },
    total: { type: Number, required: false, default: 0 },
    totalPages: { type: Number, required: false, default: 1 },
    showPagination: { type: Boolean, required: false, default: false },
    onPageChange: { type: Function as PropType<(page: number) => void>, required: false },
    onPageSizeChange: { type: Function as PropType<(size: number) => void>, required: false }
  },
  setup(props) {
    const { handleContextMenuShow, handleContextMenuHide, options } = useContextMenuOptions({
      selectedIds: props.selectedIds,
      onSelect: props.onSelect
    });

    // 提供视图上下文（替代 props 穿透到 FileViewRenderer）
    provideFileViewContext({
      items: toRef(props, 'items'),
      selectedIds: props.selectedIds,
      onSelect: props.onSelect,
      onOpen: props.onOpen,
      gridSize: toRef(props, 'gridSize'),
      sortField: props.sortField ? toRef(props, 'sortField') : undefined,
      sortOrder: props.sortOrder ? toRef(props, 'sortOrder') : undefined,
      onSort: props.onSort
    });

    /** 接收圈选结果 */
    const handleSelectionChange = (ids: string[]) => {
      props.onSelect(ids);
    };
    return () => {
      const hasPagination =
        props.showPagination && props.currentPage !== undefined && props.totalPages !== undefined;

      return (
        <div class="h-full flex flex-col" style={{ position: 'relative' }}>
          <div class={hasPagination ? 'flex-1 overflow-hidden' : 'h-full'}>
            <ContextMenu
              options={options.value}
              onSelect={props.onContextMenuSelect}
              triggerSelector={`[data-selectable-id],.selection-container`}
              onShow={handleContextMenuShow}
              onHide={handleContextMenuHide}
              class={'h-full'}
            >
              <NSelectionRect
                onSelectionChange={handleSelectionChange}
                onClearSelection={() => props.onSelect([])}
                class={'h-full'}
              >
                <NScrollbar yPlacement="right" xPlacement="bottom" class="h-full">
                  <FileViewRenderer viewMode={props.viewMode} />
                </NScrollbar>
              </NSelectionRect>
            </ContextMenu>

            {/* Loading 遮罩层 - 只覆盖文件列表区域 */}
            <FileLoading loading={props.loading} tip={props.loadingTip} />
          </div>

          {/* 分页器 */}
          {hasPagination && (
            <FilePagination
              currentPage={props.currentPage}
              pageSize={props.pageSize}
              total={props.total}
              totalPages={props.totalPages}
              show={props.showPagination}
              onPageChange={props.onPageChange || (() => {})}
              onPageSizeChange={props.onPageSizeChange}
              showPageSizeSelector={Boolean(props.onPageSizeChange)}
            />
          )}
        </div>
      );
    };
  }
});
