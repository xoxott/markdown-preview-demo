import { defineComponent, onMounted, ref } from 'vue';
import DrawerExample from '@/components/base-drawer/DrawerExample';
import ViewContainer from './container/ViewContainer';
import DragPreview from './interaction/DragPreview';
import FileBreadcrumb from './layout/FileBreadcrumb';
import FileSidebar from './layout/FileSidebar';
import FileStatusBar from './layout/FileStatusBar';
import FileToolbar from './layout/FileToolbar';
import ResizableLayout from './layout/ResizableLayout';
import FileInfoPanel from './panels/FileInfoPanel';
import { mockBreadcrumbItems, mockFileItems } from './config/mockData';
import { useFileExplorerLogic } from './composables/useFileExplorerLogic';
import DialogTestPanel from './test/DialogTestPanel';

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

    // 使用封装的业务逻辑
    const logic = useFileExplorerLogic({
      initialItems: mockFileItems,
      containerRef,
      validateDrop: (items, targetPath) => {
        return logic.mockItems.value.find(it => it.path === targetPath)?.type === 'folder';
      }
    });

    // 组件挂载后自动聚焦，使快捷键立即可用
    onMounted(async () => {
      // 模拟初始加载
      logic.setLoading(true, '加载文件列表...');
      await new Promise(resolve => setTimeout(resolve, 800));
      logic.setLoading(false);

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
        />

        {/* 面包屑 */}
        <FileBreadcrumb
          path="/项目文档/测试"
          maxItems={5}
          items={mockBreadcrumbItems}
          onNavigate={logic.handleBreadcrumbNavigate}
        />

        {/* 状态栏 */}
        <FileStatusBar
          totalItems={logic.mockItems.value.length}
          fileCount={logic.mockItems.value.filter(f => f.type === 'file').length}
          folderCount={logic.mockItems.value.filter(f => f.type === 'folder').length}
          selectedItems={logic.selectedFiles.value}
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
                  onOpen={logic.handleOpen}
                  sortField={logic.sortField.value}
                  sortOrder={logic.sortOrder.value}
                  onSort={logic.setSorting}
                  loading={logic.loading.value}
                  loadingTip={logic.loadingTip.value}
                  onContextMenuSelect={logic.handleContextMenuSelect}
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
          items={logic.dragDrop.dragState.value.draggedItems}
          isDragging={logic.dragDrop.isDragging.value}
          dragStartPos={logic.dragDrop.dragState.value.dragStartPos}
          dragCurrentPos={logic.dragDrop.dragState.value.dragCurrentPos}
          operation={logic.dragDrop.dragOperation.value}
        />
      </div>
    );
  }
});
