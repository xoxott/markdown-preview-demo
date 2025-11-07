import { defineComponent, provide, reactive, ref } from "vue";
import { FileItem, GridSize, ViewMode } from "./types/file-explorer";
import { useFileDragDropEnhanced } from "./hooks/useFileDragDropEnhanced";
import { useFileSort } from "./hooks/useFileSort";
import { useFileSelection } from "./hooks/useFileSelection";
import FileToolbar from "./layout/FileToolbar";
import FileStatusBar from "./layout/FileStatusBar";
import ViewContainer from "./container/ViewContainer";
import DragPreview from "./interaction/DragPreview";
import FileBreadcrumb from './layout/FileBreadcrumb';
import FileSidebar from "./layout/FileSidebar";
import ResizableLayout, { LayoutConfig } from "./layout/ResizableLayout";
import { useToggle } from "./hooks/useToggle";

export default defineComponent({
  name: 'FileExplorer',
  setup() {
    /** 状态: view / grid / selection / sorting */
    const collapsed = ref(false)
    const gridSize = ref<GridSize>('small')
    const viewMode = ref<ViewMode>('grid')

    const mockItems = ref<FileItem[]>([
      { id: '1', name: '项目文档', type: 'folder', size: 0, modifiedAt: new Date(2025, 10, 1), createdAt: new Date(2025, 9, 1), path: '/项目文档' },
      { id: '2', name: '设计稿.fig', type: 'file', size: 2457600, extension: 'fig', modifiedAt: new Date(2025, 10, 2), createdAt: new Date(2025, 10, 2), path: '/设计稿.fig' },
      { id: '3', name: 'banner.png', type: 'file', size: 1024000, extension: 'png', modifiedAt: new Date(2025, 10, 3), createdAt: new Date(2025, 10, 3), thumbnailUrl: 'https://via.placeholder.com/150/3b82f6', path: '/banner.png' },
      { id: '4', name: '代码库', type: 'folder', size: 0, modifiedAt: new Date(2025, 9, 15), createdAt: new Date(2025, 8, 1), path: '/代码库' },
      { id: '5', name: 'presentation.pptx', type: 'file', size: 5242880, extension: 'pptx', modifiedAt: new Date(2025, 10, 1), createdAt: new Date(2025, 10, 1), path: '/presentation.pptx' },
      { id: '6', name: 'video-demo.mp4', type: 'file', size: 15728640, extension: 'mp4', modifiedAt: new Date(2025, 9, 28), createdAt: new Date(2025, 9, 28), thumbnailUrl: 'https://via.placeholder.com/150/ec4899', path: '/video-demo.mp4' },
      { id: '7', name: 'music.mp3', type: 'file', size: 3145728, extension: 'mp3', modifiedAt: new Date(2025, 10, 2), createdAt: new Date(2025, 10, 2), path: '/music.mp3' },
      { id: '8', name: 'script.js', type: 'file', size: 8192, extension: 'js', modifiedAt: new Date(2025, 10, 3), createdAt: new Date(2025, 10, 3), path: '/script.js' },
    ]);

    /** hooks: selection / drag-drop / sort */
    const dragDrop = useFileDragDropEnhanced({
      validateDrop: (items, targetPath) => {
        return mockItems.value.find(it => it.path === targetPath)?.type === 'folder'
      }
    })
    provide('FILE_DRAG_DROP', dragDrop)

    const { setSorting, sortedFiles, sortOrder, sortField } = useFileSort(mockItems)
    const { selectedIds, selectFile } = useFileSelection(sortedFiles)

    /** 事件处理 */
    const handleViewModeChange = (value: ViewMode) => viewMode.value = value
    const handleOpen = (file: FileItem) => console.log('打开文件:', file)
    const handleBreadcrumbNavigate = (path: string) => console.log('导航到路径:', path)
    const handleGridSizeChange = (size: GridSize) => gridSize.value = size

    /** 渲染 */
    return () => (
      <div>
        {/* 工具栏 */}
        <FileToolbar
          viewMode={viewMode.value}
          sortField={sortField.value}
          sortOrder={sortOrder.value}
          gridSize={gridSize.value}
          onSortChange={setSorting}
          onGridSizeChange={handleGridSizeChange}
          onViewModeChange={handleViewModeChange}
        />

        {/* 面包屑 */}
        <FileBreadcrumb
          path="/"
          items={mockItems.value}
          maxItems={1}
          onNavigate={handleBreadcrumbNavigate}
        />

        {/* 状态栏 */}
        <FileStatusBar
          totalItems={mockItems.value.length}
          fileCount={mockItems.value.filter(f => f.type === 'file').length}
          folderCount={mockItems.value.filter(f => f.type === 'folder').length}
        />

        {/* 视图布局 */}
        <ResizableLayout v-model:collapsed={collapsed.value}> 
          {{
            left: <FileSidebar treeData={[]} currentPath="/" onNavigate={() => { }} collapsed={collapsed.value}/>,
            default: <ViewContainer
              items={sortedFiles.value}
              viewMode={viewMode.value}
              gridSize={gridSize.value}
              selectedIds={selectedIds}
              onSelect={selectFile}
              onOpen={handleOpen}
              sortField={sortField.value}
              sortOrder={sortOrder.value}
              onSort={setSorting}
            />,
            right: <div>right</div>
          }}
        </ResizableLayout>

        {/* 拖拽预览 */}
        <DragPreview
          items={dragDrop.dragState.value.draggedItems}
          isDragging={dragDrop.isDragging.value}
          dragStartPos={dragDrop.dragState.value.dragStartPos}
          dragCurrentPos={dragDrop.dragState.value.dragCurrentPos}
          operation={dragDrop.dragOperation.value}
        />
      </div>
    )
  }
})
