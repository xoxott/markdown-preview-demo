import { type PropType, type Ref, defineComponent } from 'vue';
import { type DragItem, DragPreview } from '@/components/file-explorer/interaction';
import ViewContainer from './container/ViewContainer';
import FileBreadcrumb from './layout/FileBreadcrumb';
import FileSidebar from './layout/FileSidebar';
import FileStatusBar from './layout/FileStatusBar';
import FileToolbar from './layout/FileToolbar';
import ResizableLayout from './layout/ResizableLayout';
import FileInfoPanel from './panels/FileInfoPanel';
import { UploadDropOverlay } from './upload';
import { getFileCategoryByExtension } from './config/extensionCategories';
import type { UploadProgressInfo } from './composables/useFileExplorerUpload';
import type { FileExplorerLogic } from './types/shell';
import type { FileItem } from './types/file-explorer';
import FileIcon from './items/FileIcon';

/**
 * 文件浏览器壳组件 — 仅负责布局与子组件组合
 *
 * 业务逻辑、预览/上传抽屉由页面层（views/file-manager）编排
 */
export default defineComponent({
  name: 'FileExplorer',
  props: {
    logic: {
      type: Object as PropType<FileExplorerLogic>,
      required: true
    },
    containerRef: {
      type: Object as PropType<Ref<HTMLElement | null>>,
      required: true
    },
    onOpen: {
      type: Function as PropType<(file: FileItem) => void | Promise<void>>,
      required: true
    },
    onUpload: {
      type: Function as PropType<() => void>,
      required: true
    },
    onFilesDrop: {
      type: Function as PropType<(files: File[]) => void | Promise<void>>,
      required: true
    },
    uploadProgress: {
      type: Object as PropType<UploadProgressInfo | null>,
      default: null
    }
  },
  setup(props) {
    const logic = () => props.logic;

    const convertToDragItems = (fileItems: FileItem[]): DragItem[] => {
      return fileItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        data: item
      }));
    };

    const categoryTailwindColorMap: Record<string, string> = {
      image: 'text-green-500',
      video: 'text-purple-500',
      audio: 'text-pink-500',
      code: 'text-yellow-500',
      document: 'text-blue-500',
      archive: 'text-orange-500',
      folder: 'text-blue-500',
      other: 'text-gray-500'
    };

    const renderFileItem = (item: DragItem, index: number) => {
      const dragFileItem = item.data as FileItem;
      const getFileColor = (): string => {
        if (dragFileItem.type === 'folder') return categoryTailwindColorMap.folder;
        const category = getFileCategoryByExtension(dragFileItem.extension);
        return categoryTailwindColorMap[category] ?? categoryTailwindColorMap.other;
      };

      if (index === 0) {
        const displayItems = logic().dragDrop.dragState.value.draggedItems.slice(0, 3);
        const remainingCount = Math.max(
          0,
          logic().dragDrop.dragState.value.draggedItems.length - 3
        );

        return (
          <div
            key="file-preview-wrapper"
            class="max-w-[320px] min-w-[240px] border border-gray-200 rounded-lg bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
              <span class="text-xs text-gray-600 font-medium dark:text-gray-400">
                {logic().dragDrop.dragOperation.value === 'copy' ? '复制' : '移动'}{' '}
                {logic().dragDrop.dragState.value.draggedItems.length} 个项目
              </span>
            </div>

            <div class="space-y-1.5">
              {displayItems.map((fileItem, idx) => (
                <div
                  key={fileItem.id}
                  class="flex items-center gap-2 rounded bg-gray-50 p-1.5 dark:bg-gray-700/50"
                  style={{ opacity: 1 - idx * 0.15 }}
                >
                  <div class={['flex-shrink-0', getFileColor()]}>
                    <FileIcon item={fileItem} size={20} />
                  </div>
                  <span class="flex-1 truncate text-sm text-gray-900 font-medium dark:text-gray-100">
                    {fileItem.name}
                  </span>
                  <span class="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {fileItem.type === 'folder' ? '文件夹' : fileItem.extension?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {remainingCount > 0 && (
              <div class="mt-2 flex items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                <span class="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400">
                  +{remainingCount}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  还有 {remainingCount} 个项目
                </span>
              </div>
            )}
          </div>
        );
      }

      return <></>;
    };

    return () => (
      <div ref={props.containerRef} class="h-full w-full flex flex-col" tabindex={-1}>
        <FileToolbar
          viewMode={logic().viewMode.value}
          sortField={logic().sortField.value}
          sortOrder={logic().sortOrder.value}
          gridSize={logic().gridSize.value}
          onSortChange={logic().setSorting}
          onGridSizeChange={logic().handleGridSizeChange}
          onViewModeChange={logic().handleViewModeChange}
          dataSourceType={logic().dataSourceType.value}
          onDataSourceTypeChange={logic().switchDataSource}
          onOpenLocalFolder={logic().openLocalFolder}
          onUpload={props.onUpload}
        />

        <FileBreadcrumb
          path={logic().currentPath.value}
          maxItems={5}
          items={logic().breadcrumbItems.value}
          onNavigate={logic().handleBreadcrumbNavigate}
        />

        <FileStatusBar
          totalItems={logic().mockItems.value.length}
          fileCount={logic().mockItems.value.filter(f => f.type === 'file').length}
          folderCount={logic().mockItems.value.filter(f => f.type === 'folder').length}
          selectedItems={logic().selectedFiles.value}
          totalSize={logic().totalSize.value}
          selectedSize={logic().selectedSize.value}
          loading={logic().loading.value}
          operationProgress={logic().operationProgress.value}
          operationText={logic().operationText.value}
          storageUsed={logic().storageUsed.value}
          storageTotal={logic().storageTotal.value}
          showStorage={logic().showStorage.value}
          uploadProgress={props.uploadProgress}
          onUploadProgressClick={props.onUpload}
        />

        <div class="flex-1 overflow-hidden">
          <ResizableLayout
            v-model:collapsed={logic().collapsed.value}
            config={logic().layoutConfig.value}
          >
            {{
              left: () => (
                <FileSidebar
                  treeData={[]}
                  currentPath="/"
                  onNavigate={() => {}}
                  collapsed={logic().collapsed.value}
                />
              ),
              default: () => (
                <ViewContainer
                  items={logic().paginatedSortedFiles.value}
                  viewMode={logic().viewMode.value}
                  gridSize={logic().gridSize.value}
                  selectedIds={logic().selectedIds}
                  onSelect={logic().selectFile}
                  onOpen={props.onOpen}
                  sortField={logic().sortField.value}
                  sortOrder={logic().sortOrder.value}
                  onSort={logic().setSorting}
                  loading={logic().loading.value}
                  loadingTip={logic().loadingTip.value}
                  onContextMenuSelect={logic().handleContextMenuSelect}
                  currentPage={logic().pagination.currentPage.value}
                  pageSize={logic().pagination.pageSize.value}
                  total={logic().pagination.total.value}
                  totalPages={logic().pagination.totalPages.value}
                  onPageChange={logic().pagination.goToPage}
                  onPageSizeChange={logic().pagination.setPageSize}
                  dataSourceType={logic().dataSourceType.value}
                >
                  {{
                    uploadDropOverlay: () => (
                      <UploadDropOverlay
                        onFilesDrop={props.onFilesDrop}
                        disabled={logic().dataSourceType.value !== 'server'}
                        currentPath={logic().currentPath.value}
                      />
                    )
                  }}
                </ViewContainer>
              ),
              right: () => (
                <FileInfoPanel
                  selectedFiles={logic().selectedFiles.value}
                  show={logic().showInfoPanel.value}
                  onClose={() => {
                    logic().toggleInfoPanel();
                  }}
                />
              )
            }}
          </ResizableLayout>
        </div>

        <DragPreview
          items={convertToDragItems(logic().dragDrop.dragState.value.draggedItems)}
          isDragging={logic().dragDrop.isDragging.value}
          dragStartPos={logic().dragDrop.dragState.value.dragStartPos}
          dragCurrentPos={logic().dragDrop.dragState.value.dragCurrentPos}
          operation={logic().dragDrop.dragOperation.value}
          itemRenderer={renderFileItem}
          showOperationIcon={false}
          showCountBadge={false}
          showRemainingCount={false}
          maxItems={1}
        />
      </div>
    );
  }
});
