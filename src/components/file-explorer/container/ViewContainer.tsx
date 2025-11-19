/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-03 09:19:21
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-08 10:20:01
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\container\ViewContainer.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { PropType, Ref } from 'vue';
import { defineComponent } from 'vue';
import { NScrollbar } from 'naive-ui';
import { useContextMenuOptions } from '../hooks/useContextMenuOptions';
import ContextMenu from '../interaction/ContextMenu';
import type { FileItem, GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer';
import NSelectionRect from '../interaction/NSelectionRect';
import FileLoading from '../feedback/FileLoading';
import FileViewRenderer from './FileViewRenderer';
import FilePagination from '../layout/FilePagination';

export default defineComponent({
  name: 'ViewContainer',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    viewMode: { type: String as PropType<ViewMode>, required: true },
    gridSize: { type: String as PropType<GridSize>, required: false, default: 'medium' },
    selectedIds: { type: Object as PropType<Ref<Set<string>>>, required: true },
    onSelect: { type: Function as PropType<(id: string[], event?: MouseEvent) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    sortField: { type: String as PropType<SortField>, required: false },
    sortOrder: { type: String as PropType<SortOrder>, required: false },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: false },
    loading: { type: Boolean, required: false, default: false },
    loadingTip: { type: String, required: false, default: '加载中...' },
    onContextMenuSelect: { type: Function as PropType<(key: string) => void>, required: true },
    // 分页相关 props
    currentPage: { type: Number, required: false },
    pageSize: { type: Number, required: false },
    total: { type: Number, required: false },
    totalPages: { type: Number, required: false },
    showPagination: { type: Boolean, required: false, default: false },
    onPageChange: { type: Function as PropType<(page: number) => void>, required: false },
    onPageSizeChange: { type: Function as PropType<(size: number) => void>, required: false }
  },
  setup(props) {
    const { handleContextMenuShow, handleContextMenuHide, options } = useContextMenuOptions({
      selectedIds: props.selectedIds,
      onSelect: props.onSelect
    });

    /** 接收圈选结果 */
    const handleSelectionChange = (ids: string[]) => {
      props.onSelect(ids);
    };
    return () => {
      const hasPagination = props.showPagination && props.currentPage !== undefined && props.totalPages !== undefined;

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
                  <FileViewRenderer {...props} />
                </NScrollbar>
              </NSelectionRect>
            </ContextMenu>

            {/* Loading 遮罩层 - 只覆盖文件列表区域 */}
            <FileLoading loading={props.loading} tip={props.loadingTip} />
          </div>

          {/* 分页器 */}
          {hasPagination && (
            <FilePagination
              currentPage={props.currentPage!}
              pageSize={props.pageSize!}
              total={props.total!}
              totalPages={props.totalPages!}
              show={props.showPagination}
              onPageChange={props.onPageChange || (() => {})}
              onPageSizeChange={props.onPageSizeChange}
              showPageSizeSelector={!!props.onPageSizeChange}
            />
          )}
        </div>
      );
    };
  }
});
