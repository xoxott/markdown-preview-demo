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
      { id: '9', name: 'index.js', type: 'file', size: 12288, extension: 'js', modifiedAt: new Date(2025, 10, 4), createdAt: new Date(2025, 10, 3), path: '/index.js' },
      { id: '10', name: 'test.js', type: 'file', size: 4096, extension: 'js', modifiedAt: new Date(2025, 10, 5), createdAt: new Date(2025, 10, 3), path: '/test.js' },
      { id: '11', name: 'readme.md', type: 'file', size: 2048, extension: 'md', modifiedAt: new Date(2025, 10, 6), createdAt: new Date(2025, 10, 6), path: '/readme.md' },
      { id: '12', name: 'package.json', type: 'file', size: 8192, extension: 'json', modifiedAt: new Date(2025, 10, 6), createdAt: new Date(2025, 10, 5), path: '/package.json' },
      { id: '13', name: 'style.css', type: 'file', size: 10240, extension: 'css', modifiedAt: new Date(2025, 10, 7), createdAt: new Date(2025, 10, 6), path: '/style.css' },
      { id: '14', name: 'app.vue', type: 'file', size: 12288, extension: 'vue', modifiedAt: new Date(2025, 10, 8), createdAt: new Date(2025, 10, 6), path: '/app.vue' },
      { id: '15', name: 'data.json', type: 'file', size: 32768, extension: 'json', modifiedAt: new Date(2025, 10, 8), createdAt: new Date(2025, 10, 7), path: '/data.json' },
      { id: '16', name: 'notes.txt', type: 'file', size: 4096, extension: 'txt', modifiedAt: new Date(2025, 10, 9), createdAt: new Date(2025, 10, 8), path: '/notes.txt' },
      { id: '17', name: 'archive.zip', type: 'file', size: 20480000, extension: 'zip', modifiedAt: new Date(2025, 10, 10), createdAt: new Date(2025, 10, 9), path: '/archive.zip' },
      { id: '18', name: 'report.docx', type: 'file', size: 5120000, extension: 'docx', modifiedAt: new Date(2025, 10, 11), createdAt: new Date(2025, 10, 10), path: '/report.docx' },
      { id: '19', name: 'data-backup.sql', type: 'file', size: 1048576, extension: 'sql', modifiedAt: new Date(2025, 10, 12), createdAt: new Date(2025, 10, 11), path: '/data-backup.sql' },
      { id: '20', name: 'config.yaml', type: 'file', size: 4096, extension: 'yaml', modifiedAt: new Date(2025, 10, 13), createdAt: new Date(2025, 10, 12), path: '/config.yaml' },
      { id: '21', name: 'assets', type: 'folder', size: 0, modifiedAt: new Date(2025, 10, 14), createdAt: new Date(2025, 9, 30), path: '/assets' },
      { id: '22', name: 'database.db', type: 'file', size: 2097152, extension: 'db', modifiedAt: new Date(2025, 10, 14), createdAt: new Date(2025, 10, 13), path: '/database.db' },
      { id: '23', name: 'photo1.jpg', type: 'file', size: 1536000, extension: 'jpg', modifiedAt: new Date(2025, 10, 15), createdAt: new Date(2025, 10, 14), thumbnailUrl: 'https://via.placeholder.com/150/10b981', path: '/photo1.jpg' },
      { id: '24', name: 'photo2.jpg', type: 'file', size: 2048000, extension: 'jpg', modifiedAt: new Date(2025, 10, 15), createdAt: new Date(2025, 10, 14), thumbnailUrl: 'https://via.placeholder.com/150/f97316', path: '/photo2.jpg' },
      { id: '25', name: 'diagram.svg', type: 'file', size: 102400, extension: 'svg', modifiedAt: new Date(2025, 10, 16), createdAt: new Date(2025, 10, 15), path: '/diagram.svg' },
      { id: '26', name: 'server.log', type: 'file', size: 512000, extension: 'log', modifiedAt: new Date(2025, 10, 17), createdAt: new Date(2025, 10, 16), path: '/server.log' },
      { id: '27', name: 'LICENSE', type: 'file', size: 1024, extension: 'txt', modifiedAt: new Date(2025, 10, 17), createdAt: new Date(2025, 9, 1), path: '/LICENSE' },
      { id: '28', name: 'thumbnail.webp', type: 'file', size: 524288, extension: 'webp', modifiedAt: new Date(2025, 10, 18), createdAt: new Date(2025, 10, 18), thumbnailUrl: 'https://via.placeholder.com/150/6366f1', path: '/thumbnail.webp' },
      { id: '29', name: 'guide.pdf', type: 'file', size: 10485760, extension: 'pdf', modifiedAt: new Date(2025, 10, 19), createdAt: new Date(2025, 10, 19), path: '/guide.pdf' },
      { id: '30', name: 'temp', type: 'folder', size: 0, modifiedAt: new Date(2025, 10, 20), createdAt: new Date(2025, 9, 15), path: '/temp' }
    ])

    const breakItems = [
      {id:'1',name:'根目录',path:'/'},
      {id:'2',name:'项目文档',path:'/项目文档'},
      {id:'3',name:'测试',path:'/项目文档/测试'},
      {id:'4',name:'测试1',path:'/项目文档/测试/测试'},
      {id:'5',name:'测试2',path:'/项目文档/测试/测试1/测试2'},
      {id:'6',name:'测试3',path:'/项目文档/测试/测试1/测试2'},
    ]


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
      <div class='flex flex-col h-500px'>
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
          path="/项目文档/测试"
          maxItems={5}
          items={breakItems}
          onNavigate={handleBreadcrumbNavigate}
        />

        {/* 状态栏 */}
        <FileStatusBar
          totalItems={mockItems.value.length}
          fileCount={mockItems.value.filter(f => f.type === 'file').length}
          folderCount={mockItems.value.filter(f => f.type === 'folder').length}
        />

        {/* 视图布局 */}
        <div class="flex-1 overflow-hidden">
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
        </div>

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
