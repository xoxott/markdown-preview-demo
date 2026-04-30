import { defineComponent, onMounted, ref } from 'vue';
import { NButton, NDrawer, NDrawerContent } from 'naive-ui';
import { DragPreview } from '@/components/common-interaction';
import type { DragItem } from '@/components/common-interaction';
import ViewContainer from './container/ViewContainer';
import FileBreadcrumb from './layout/FileBreadcrumb';
import FileSidebar from './layout/FileSidebar';
import FileStatusBar from './layout/FileStatusBar';
import FileToolbar from './layout/FileToolbar';
import ResizableLayout from './layout/ResizableLayout';
import FileInfoPanel from './panels/FileInfoPanel';
import { FilePreview } from './preview';
import { FileEditor } from './editor';
import { mockFileItems } from './config/mockData';
import { useFileExplorerLogic } from './composables/useFileExplorerLogic';
import { useFilePreview } from './composables/useFilePreview';
import { useFileExplorerUpload } from './composables/useFileExplorerUpload';
import { UploadDrawer, UploadDropOverlay } from './upload';
import { getFileCategoryByExtension } from './config/extensionCategories';
import type { FileItem } from './types/file-explorer';
import FileIcon from './items/FileIcon';

/**
 * 文件管理器主组件
 *
 * 职责：
 *
 * - 组合各个子组件
 * - 提供容器和布局
 * - 管理焦点状态
 *
 * 业务逻辑已提取到 useFileExplorerLogic composable
 */
export default defineComponent({
  name: 'FileExplorer',
  setup() {
    // 容器引用
    const containerRef = ref<HTMLElement | null>(null);

    // 使用封装的业务逻辑（onOpen/onUpload 回调延迟引用，执行时函数已有定义）
    /* eslint-disable @typescript-eslint/no-use-before-define */
    const logic = useFileExplorerLogic({
      initialItems: mockFileItems,
      containerRef,
      onOpen: (file: FileItem) => handleOpenFile(file),
      onUploadFile: () => handleOpenUploadDrawer(),
      onUploadFolder: () => handleOpenUploadDrawer()
    });
    /* eslint-enable @typescript-eslint/no-use-before-define */

    // 文件预览/编辑状态
    const preview = useFilePreview({
      dataSource: () => logic.dataSource.value,
      refreshFileList: logic.refreshFileList
    });

    // 上传集成状态
    const uploadIntegration = useFileExplorerUpload({
      onUploadComplete: () => logic.refreshFileList()
    });

    // 打开文件（文件夹导航 → 预览）
    const handleOpenFile = async (file: FileItem) => {
      // 抽屉互斥：打开预览时关闭上传抽屉
      uploadIntegration.closeUploadDrawer();

      if (file.type === 'folder') {
        const targetPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        logic.handleBreadcrumbNavigate(targetPath);
        return;
      }
      await preview.openFile(file);
    };

    // 打开上传抽屉（互斥：关闭预览抽屉）
    const handleOpenUploadDrawer = () => {
      preview.closeFile();
      uploadIntegration.openUploadDrawer();
    };

    // 转换 FileItem 为 DragItem
    const convertToDragItems = (fileItems: FileItem[]): DragItem[] => {
      return fileItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        data: item
      }));
    };

    // 分类 → Tailwind 颜色 class 映射（拖拽预览用）
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

    // 自定义文件项渲染器（返回包装容器）
    const renderFileItem = (item: DragItem, index: number) => {
      const dragFileItem = item.data as FileItem;
      const getFileColor = (): string => {
        if (dragFileItem.type === 'folder') return categoryTailwindColorMap.folder;
        const category = getFileCategoryByExtension(dragFileItem.extension);
        return categoryTailwindColorMap[category] ?? categoryTailwindColorMap.other;
      };

      // 只在第一个项目时返回完整的包装容器
      if (index === 0) {
        const displayItems = logic.dragDrop.dragState.value.draggedItems.slice(0, 3);
        const remainingCount = Math.max(0, logic.dragDrop.dragState.value.draggedItems.length - 3);

        return (
          <div
            key="file-preview-wrapper"
            class="max-w-[320px] min-w-[240px] border border-gray-200 rounded-lg bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          >
            {/* 操作类型指示器 */}
            <div class="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
              <span class="text-xs text-gray-600 font-medium dark:text-gray-400">
                {logic.dragDrop.dragOperation.value === 'copy' ? '复制' : '移动'}{' '}
                {logic.dragDrop.dragState.value.draggedItems.length} 个项目
              </span>
            </div>

            {/* 预览项列表 */}
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

            {/* 更多项提示 */}
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

      // 其他项目返回空 fragment，因为已经在第一个项目中渲染了所有内容
      return <></>;
    };

    // 组件挂载后自动聚焦，使快捷键立即可用
    onMounted(async () => {
      // 如果数据源可用，刷新文件列表
      if (logic.dataSource.value) {
        await logic.refreshFileList();
      } else {
        // 模拟初始加载
        logic.setLoading(true, '加载文件列表...');
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), 800);
        });
        logic.setLoading(false);
      }

      // 聚焦容器
      containerRef.value?.focus();
    });

    /** 渲染 */
    return () => (
      <div ref={containerRef} class={'h-full w-full flex flex-col'}>
        {/* 工具栏 */}
        <FileToolbar
          viewMode={logic.viewMode.value}
          sortField={logic.sortField.value}
          sortOrder={logic.sortOrder.value}
          gridSize={logic.gridSize.value}
          onSortChange={logic.setSorting}
          onGridSizeChange={logic.handleGridSizeChange}
          onViewModeChange={logic.handleViewModeChange}
          dataSourceType={logic.dataSourceType.value}
          onDataSourceTypeChange={logic.switchDataSource}
          onOpenLocalFolder={logic.openLocalFolder}
          onUpload={handleOpenUploadDrawer}
        />

        {/* 面包屑 */}
        <FileBreadcrumb
          path={logic.currentPath.value}
          maxItems={5}
          items={logic.breadcrumbItems.value}
          onNavigate={logic.handleBreadcrumbNavigate}
        />

        {/* 状态栏 */}
        <FileStatusBar
          totalItems={logic.mockItems.value.length}
          fileCount={logic.mockItems.value.filter(f => f.type === 'file').length}
          folderCount={logic.mockItems.value.filter(f => f.type === 'folder').length}
          selectedItems={logic.selectedFiles.value}
          totalSize={logic.totalSize.value}
          selectedSize={logic.selectedSize.value}
          loading={logic.loading.value}
          operationProgress={logic.operationProgress.value}
          operationText={logic.operationText.value}
          storageUsed={logic.storageUsed.value}
          storageTotal={logic.storageTotal.value}
          showStorage={logic.showStorage.value}
          uploadProgress={uploadIntegration.uploadProgressInfo.value}
          onUploadProgressClick={handleOpenUploadDrawer}
        />

        {/* 视图布局 */}
        <div class="flex-1 overflow-hidden">
          <ResizableLayout
            v-model:collapsed={logic.collapsed.value}
            config={logic.layoutConfig.value}
          >
            {{
              left: () => (
                <FileSidebar
                  treeData={[]}
                  currentPath="/"
                  onNavigate={() => {}}
                  collapsed={logic.collapsed.value}
                />
              ),
              default: () => (
                <ViewContainer
                  items={logic.paginatedSortedFiles.value}
                  viewMode={logic.viewMode.value}
                  gridSize={logic.gridSize.value}
                  selectedIds={logic.selectedIds}
                  onSelect={logic.selectFile}
                  onOpen={handleOpenFile}
                  sortField={logic.sortField.value}
                  sortOrder={logic.sortOrder.value}
                  onSort={logic.setSorting}
                  loading={logic.loading.value}
                  loadingTip={logic.loadingTip.value}
                  onContextMenuSelect={logic.handleContextMenuSelect}
                  currentPage={logic.pagination.currentPage.value}
                  pageSize={logic.pagination.pageSize.value}
                  total={logic.pagination.total.value}
                  totalPages={logic.pagination.totalPages.value}
                  showPagination={logic.pagination.showPagination.value}
                  onPageChange={logic.pagination.goToPage}
                  onPageSizeChange={logic.pagination.setPageSize}
                  dataSourceType={logic.dataSourceType.value}
                >
                  {{
                    uploadDropOverlay: () => (
                      <UploadDropOverlay
                        onFilesDrop={uploadIntegration.addFilesAndStart}
                        disabled={logic.dataSourceType.value !== 'server'}
                        currentPath={logic.currentPath.value}
                      />
                    )
                  }}
                </ViewContainer>
              ),
              right: () => (
                <FileInfoPanel
                  selectedFiles={logic.selectedFiles.value}
                  show={logic.showInfoPanel.value}
                  onClose={() => {
                    logic.toggleInfoPanel();
                  }}
                />
              )
            }}
          </ResizableLayout>
        </div>

        {/* 拖拽预览 */}
        <DragPreview
          items={convertToDragItems(logic.dragDrop.dragState.value.draggedItems)}
          isDragging={logic.dragDrop.isDragging.value}
          dragStartPos={logic.dragDrop.dragState.value.dragStartPos}
          dragCurrentPos={logic.dragDrop.dragState.value.dragCurrentPos}
          operation={logic.dragDrop.dragOperation.value}
          itemRenderer={renderFileItem}
          showOperationIcon={false}
          showCountBadge={false}
          showRemainingCount={false}
          maxItems={1}
        />

        {/* 文件预览/编辑抽屉 */}
        <NDrawer
          v-model:show={preview.showFileDrawer.value}
          placement="right"
          width="80%"
          resizable
          contentClass="h-full"
        >
          <NDrawerContent closable nativeScrollbar={false}>
            {{
              header: () => (
                <div class="flex items-center justify-between">
                  <span class="font-medium">{preview.openedFile.value?.name || '文件'}</span>
                  {preview.editorMode.value === 'preview' && preview.openedFile.value && (
                    <NButton size="small" onClick={preview.editFile}>
                      编辑
                    </NButton>
                  )}
                </div>
              ),
              default: () => {
                if (!preview.openedFile.value) return null;

                if (
                  preview.editorMode.value === 'edit' &&
                  typeof preview.fileContent.value === 'string'
                ) {
                  return (
                    <FileEditor
                      file={preview.openedFile.value}
                      dataSource={logic.dataSource.value!}
                      content={preview.fileContent.value}
                      onClose={preview.closeFile}
                      onSave={preview.saveFile}
                    />
                  );
                }

                return (
                  <FilePreview
                    file={preview.openedFile.value}
                    content={preview.fileContent.value}
                    loading={preview.fileLoading.value}
                  />
                );
              }
            }}
          </NDrawerContent>
        </NDrawer>

        {/* 上传管理抽屉 */}
        <NDrawer
          v-model:show={uploadIntegration.showUploadDrawer.value}
          placement="right"
          width="60%"
          resizable
          contentClass="h-full"
        >
          <NDrawerContent closable nativeScrollbar={false}>
            {{
              header: () => <span class="font-medium">文件上传</span>,
              default: () => (
                <UploadDrawer
                  upload={uploadIntegration.upload}
                  onClose={uploadIntegration.closeUploadDrawer}
                />
              )
            }}
          </NDrawerContent>
        </NDrawer>
      </div>
    );
  }
});
