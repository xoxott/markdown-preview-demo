import { defineComponent, onMounted, ref } from 'vue';
import { NButton, NDrawer, NDrawerContent, useMessage } from 'naive-ui';
import DrawerExample from '@/components/base-drawer/DrawerExample';
import ViewContainer from './container/ViewContainer';
import { DragPreview } from '@/components/common-interaction';
import type { DragItem } from '@/components/common-interaction';
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
import DialogTestPanel from './test/DialogTestPanel';
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
    const message = useMessage();

    // 文件预览和编辑状态
    const openedFile = ref<FileItem | null>(null);
    const fileContent = ref<string | Blob | undefined>(undefined);
    const fileLoading = ref(false);
    const editorMode = ref<'preview' | 'edit'>('preview');
    const showFileDrawer = ref(false);

    // 使用封装的业务逻辑
    const logic = useFileExplorerLogic({
      initialItems: mockFileItems,
      containerRef,
      validateDrop: (items, targetPath) => {
        return logic.mockItems.value.find(it => it.path === targetPath)?.type === 'folder';
      }
    });

    // 打开文件
    const handleOpenFile = async (file: FileItem) => {
      if (file.type === 'folder') {
        // 文件夹：导航到该文件夹
        // 确保路径格式正确（移除开头的斜杠，因为 handleBreadcrumbNavigate 会处理）
        const targetPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        logic.handleBreadcrumbNavigate(targetPath);
        return;
      }

      // 文件：打开预览或编辑
      try {
        openedFile.value = file;
        fileLoading.value = true;
        showFileDrawer.value = true;
        editorMode.value = 'preview';

        if (logic.dataSource.value) {
          // 从数据源读取文件内容
          const content = await logic.dataSource.value.readFile(file.path);
          fileContent.value = content;
        } else {
          // 降级：使用空内容
          fileContent.value = '';
        }
      } catch (error: any) {
        message.error(`打开文件失败: ${error.message}`);
        console.error('打开文件失败:', error);
      } finally {
        fileLoading.value = false;
      }
    };

    // 切换到编辑模式
    const handleEditFile = () => {
      if (openedFile.value && typeof fileContent.value === 'string') {
        editorMode.value = 'edit';
      }
    };

    // 保存文件
    const handleSaveFile = async (file: FileItem, content: string) => {
      if (logic.dataSource.value) {
        await logic.dataSource.value.writeFile(file.path, content);
        fileContent.value = content;
        // 刷新文件列表
        await logic.refreshFileList();
      }
    };

    // 关闭文件
    const handleCloseFile = () => {
      openedFile.value = null;
      fileContent.value = undefined;
      showFileDrawer.value = false;
      editorMode.value = 'preview';
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

    // 自定义文件项渲染器（返回包装容器）
    const renderFileItem = (item: DragItem, index: number) => {
      const fileItem = item.data as FileItem;
      const getFileColor = (): string => {
        if (fileItem.type === 'folder') return 'text-blue-500';
        const ext = fileItem.extension?.toLowerCase();
        if (!ext) return 'text-gray-500';
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'text-green-500';
        if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) return 'text-purple-500';
        if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'text-pink-500';
        if (['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext)) return 'text-yellow-500';
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'text-orange-500';
        return 'text-gray-500';
      };

      // 只在第一个项目时返回完整的包装容器
      if (index === 0) {
        const displayItems = logic.dragDrop.dragState.value.draggedItems.slice(0, 3);
        const remainingCount = Math.max(0, logic.dragDrop.dragState.value.draggedItems.length - 3);

        return (
          <div key="file-preview-wrapper" class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-3 min-w-[240px] max-w-[320px]">
            {/* 操作类型指示器 */}
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                {logic.dragDrop.dragOperation.value === 'copy' ? '复制' : '移动'} {logic.dragDrop.dragState.value.draggedItems.length} 个项目
              </span>
            </div>

            {/* 预览项列表 */}
            <div class="space-y-1.5">
              {displayItems.map((fileItem, idx) => (
                <div
                  key={fileItem.id}
                  class="flex items-center gap-2 p-1.5 rounded bg-gray-50 dark:bg-gray-700/50"
                  style={{ opacity: 1 - idx * 0.15 }}
                >
                  <div class={['flex-shrink-0', getFileColor()]}>
                    <FileIcon item={fileItem} size={20} />
                  </div>
                  <span class="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
              <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
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
        await new Promise(resolve => setTimeout(resolve, 800));
        logic.setLoading(false);
      }

      // 聚焦容器
      containerRef.value?.focus();
    });

    /** 渲染 */
    return () => (
      <div ref={containerRef} class="h-500px flex flex-col" tabindex={0} style={{ outline: 'none' }}>
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
        />

        {/* 视图布局 */}
        <div class="flex-1 overflow-hidden">
          <ResizableLayout v-model:collapsed={logic.collapsed.value} config={logic.layoutConfig.value}>
            {{
              left: (
                <FileSidebar treeData={[]} currentPath="/" onNavigate={() => {}} collapsed={logic.collapsed.value} />
              ),
              default: (
                <ViewContainer
                  items={logic.sortedFiles.value}
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
                />
              ),
              right: (
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
          v-model:show={showFileDrawer.value}
          placement="right"
          width="80%"
          resizable
          contentClass='h-full'>
          <NDrawerContent closable nativeScrollbar={false}>
            {{
              header: () => (
                <div class="flex items-center justify-between">
                  <span class="font-medium">{openedFile.value?.name || '文件'}</span>
                  {editorMode.value === 'preview' && openedFile.value && (
                    <NButton size="small" onClick={handleEditFile}>
                      编辑
                    </NButton>
                  )}
                </div>
              ),
              default: () => {
                if (!openedFile.value) return null;

                if (editorMode.value === 'edit' && typeof fileContent.value === 'string') {
                  return (
                    <FileEditor
                      file={openedFile.value}
                      dataSource={logic.dataSource.value!}
                      content={fileContent.value}
                      onClose={handleCloseFile}
                      onSave={handleSaveFile}
                    />
                  );
                }

                return (
                  <FilePreview
                    file={openedFile.value}
                    content={fileContent.value}
                    loading={fileLoading.value}
                  />
                );
              }
            }}
          </NDrawerContent>
        </NDrawer>
      </div>
    );
  }
});
