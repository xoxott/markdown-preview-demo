<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-05 23:10:03
 * @FilePath: \markdown-preview-demo\src\views\component\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <n-card bordered>
    <n-h3 class="text-lg font-semibold border-b pb-2">
      组件示例:
    </n-h3>
    <n-form label-placement="left" :show-label="true">
      <n-form-item label="自定义上传组件" class="flex items-center">
        <custom-upload :multiple="true" :maxCount="5" :accept="'.png,.jpg,.jpeg,.gif'" @change="handleChange"
          abstract />
      </n-form-item>

      <n-form-item label="倒计时组件" class="flex items-center">
        <countdownTimer :seconds="35" label="预计剩余时间:" :showTrend="true" />
      </n-form-item>

      <n-form-item label="可编辑文本组件" class="flex items-center">
        <editableText value="可编辑内容" />
      </n-form-item>

      <n-form-item label="圈选组件" class="flex items-center">
        <SelectionRect auto-scroll :selection-change="handleSelectionChange" scrollContainerSelector=".select-node"
          :selection-start="handleSelectionStart" :selection-end="handleSelectionEnd">
          <div class="w-100 h-50 rounded border-2 border-dashed overflow-auto select-node">
            <p v-for="(item, index) in 50" :data-selectable-id="`${index}`"
              :style="{ marginTop: index === 49 ? '50px' : '', marginBottom: index === 0 ? '50px' : '' }">{{
                `在此区域内拖动鼠标进行圈选${index}` }}</p>
          </div>
        </SelectionRect>
      </n-form-item>

      <n-form-item label="右键菜单" class="flex items-center">
        <ContextMenu @select="handleSelect" triggerSelector="[data-selectable-id]" @hide="() => console.log('菜单隐藏')"
          @show="e => console.log('菜单显示', e)" :options="fileMenuOptions">
          <div class="flex gap-4">
            <div data-selectable-id="item-1">
              右键我试试1
            </div>
            <ContextMenu @select="handleSelect" triggerSelector="[data-selectable-id]" @hide="() => console.log('菜单隐藏')"
              @show="e => console.log('菜单显示', e)" :options="fileMenuOptions1">
              <div>
                <div>
                  <div>
                    <div data-selectable-id="item-1">
                      右键我试试2
                    </div>
                  </div>
                </div>
              </div>
            </ContextMenu>
          </div>
        </ContextMenu>
      </n-form-item>
    </n-form>


    <FileToolbar :viewMode="viewMode" :grid-size="gridSize" :sort-field="sortField" :sort-order="sortOrder"
      :onSortChange="setSorting" :onViewModeChange="handleModelChange" :onGridSizeChange="handleGridSizeChange" />
    <FileBreadcrumb path="" :items="[]" :onNavigate="() => '/a'" />

    <FileStatusBar :totalItems="mockItems.length" :folderCount="10" :fileCount="100" />

    <ViewContainer :items="sortedFiles" :viewMode="viewMode" :selectedIds="selectedIds" @select="handleSelect"
      @open="handleOpen" :gridSize="gridSize" @sort="handleSort" :sort-field="sortField" :sort-order="sortOrder" />

    <DragPreview :items="dragDrop.dragState.value.draggedItems" :is-dragging="dragDrop.isDragging.value" :drag-start-pos="dragDrop.dragState.value.dragStartPos"
      :drag-current-pos="dragDrop.dragState.value.dragCurrentPos" :operation="dragDrop.dragOperation.value" />

    <div @dragover="handleDragMove" @dragend="endDrag">
      <!-- <div v-for="file in mockItems" :key="file.id" draggable="true" @dragstart="handleDragStart(file, $event)">
        {{ file.name }}
      </div> -->

      <!-- <div class="flex gap-2">
        <DropZone class="flex" v-for="folder in folders" :key="folder.id" :zone-id="folder.id"
          :target-path="folder.path || 'xxx'" :is-over="getDropZoneState(folder.id)?.isOver"
          :can-drop="getDropZoneState(folder.id)?.canDrop" as-folder-zone
          @drag-enter="enterDropZone(folder.id, folder.path || 'xxx')" @drag-leave="leaveDropZone(folder.id)"
          @drop="handleDrop(folder.id)">
          <div class="p-4 mt-4 border-2 rounded-lg" :class="getDropZoneState(folder.id)?.isOver
            ? getDropZoneState(folder.id)?.canDrop
              ? 'border-green-500 bg-green-50'
              : 'border-red-500 bg-red-50'
            : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'">
            {{ folder.name }}
          </div>
        </DropZone>
      </div> -->
      <!-- <DragPreview :items="dragState.draggedItems" :is-dragging="isDragging" :drag-start-pos="dragState.dragStartPos"
        :drag-current-pos="dragState.dragCurrentPos" :operation="dragOperation" /> -->
    </div>

    <!-- <test /> -->
  </n-card>
</template>

<script lang="ts" setup>
import customUpload from '@/components/custom-upload'
import countdownTimer from '@/components/custom/countdown-timer.vue'
import editableText from '@/components/custom/editable-text.vue'
import SelectionRect from '@/components/file-explorer/interaction/SelectionRectV1'
import ContextMenu, { ContextMenuItem } from '@/components/file-explorer/interaction/ContextMenu'
import ViewContainer from '@/components/file-explorer/container/ViewContainer'
import FileToolbar from '@/components/file-explorer/layout/FileToolbar'
import FileBreadcrumb from '@/components/file-explorer/layout/FileBreadcrumb'
import FileSidebar from '@/components/file-explorer/layout/FileSidebar'
import FileStatusBar from '@/components/file-explorer/layout/FileStatusBar'
import DropZone from '@/components/file-explorer/interaction/DropZone'
import DragPreview from '@/components/file-explorer/interaction/DragPreview'
import { computed, provide, ref } from 'vue'
import {
  CopyOutline,
  CreateOutline,
  CutOutline,
  DownloadOutline,
  InformationCircleOutline,
  OpenOutline,
  ShareSocialOutline,
  StarOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { FileItem, GridSize, SortField, SortOrder, ViewMode } from '@/components/file-explorer/types/file-explorer'
import { useFileDragDrop } from '@/components/file-explorer/hooks/useFileDragDrop'
import { useFileSort } from '@/components/file-explorer/hooks/useFileSort'
import test from './test.vue'
import { useFileDragDropEnhanced } from '@/components/file-explorer/hooks/useFileDragDropEnhanced'
const gridSize = ref<GridSize>('medium')
const viewMode = ref<ViewMode>('grid')
const dragDrop = useFileDragDropEnhanced()
provide('FILE_DRAG_DROP', dragDrop)
const mockItems = ref<FileItem[]>([
  { id: '1', name: '项目文档', type: 'folder', size: 0, modifiedAt: new Date(2025, 10, 1), createdAt: new Date(2025, 9, 1), path: '/' },
  { id: '2', name: '设计稿.fig', type: 'file', size: 2457600, extension: 'fig', modifiedAt: new Date(2025, 10, 2), createdAt: new Date(2025, 10, 2), path: '/' },
  { id: '3', name: 'banner.png', type: 'file', size: 1024000, extension: 'png', modifiedAt: new Date(2025, 10, 3), createdAt: new Date(2025, 10, 3), thumbnailUrl: 'https://via.placeholder.com/150/3b82f6', path: '/' },
  { id: '4', name: '代码库', type: 'folder', size: 0, modifiedAt: new Date(2025, 9, 15), createdAt: new Date(2025, 8, 1), path: '/' },
  { id: '5', name: 'presentation.pptx', type: 'file', size: 5242880, extension: 'pptx', modifiedAt: new Date(2025, 10, 1), createdAt: new Date(2025, 10, 1), path: '/' },
  { id: '6', name: 'video-demo.mp4', type: 'file', size: 15728640, extension: 'mp4', modifiedAt: new Date(2025, 9, 28), createdAt: new Date(2025, 9, 28), thumbnailUrl: 'https://via.placeholder.com/150/ec4899', path: '/' },
  { id: '7', name: 'music.mp3', type: 'file', size: 3145728, extension: 'mp3', modifiedAt: new Date(2025, 10, 2), createdAt: new Date(2025, 10, 2), path: '/' },
  { id: '8', name: 'script.js', type: 'file', size: 8192, extension: 'js', modifiedAt: new Date(2025, 10, 3), createdAt: new Date(2025, 10, 3), path: '/' },
]);
const { setSorting, sortedFiles, sortOrder, sortField } = useFileSort(mockItems)



const folders = ref<FileItem[]>([
  {
    id: 'folder-1',
    name: 'Documents',
    type: 'folder',
    path: '/Users/username/Documents'
  },
  {
    id: 'folder-2',
    name: 'Documents',
    type: 'file',
    path: '/Users/username/Documents'
  }
])

const selectedIds = ref<Set<string>>(new Set())

const selectedFiles = ref<Set<string>>(new Set())
const {
  getDropZoneState,
  enterDropZone,
  leaveDropZone,
  startDrag,
  updateDragPosition,
  updateDragOperation,
  executeDrop,
  endDrag,
  dragState,
  isDragging,
  dragOperation
} = useFileDragDrop({
  onMove: async (items, targetPath) => {
    // API 调用：移动文件
    console.log(items, targetPath);
  },
  onCopy: async (items, targetPath) => {
    // API 调用：复制文件
    console.log(items, targetPath);
  }
})

// 开始拖拽
const handleDragStart = (file: FileItem, event: DragEvent) => {
  const itemsToDrag = selectedFiles.value.has(file.id)
    ? files.value.filter(f => selectedFiles.value.has(f.id))
    : [file]

  startDrag(itemsToDrag, event)
}

// 拖拽移动时更新位置和操作类型
const handleDragMove = (event: DragEvent) => {
  updateDragPosition(event)
  updateDragOperation(event)
}

// 处理放置
const handleDrop = async (zoneId: string) => {
  await executeDrop(zoneId)
  selectedFiles.value.clear()
}

const fileMenuOptions = computed<ContextMenuItem[]>(() => {
  const isMultiple = true // 示例中假设为多选状态
  return [
    {
      key: 'open',
      label: '打开',
      icon: OpenOutline,
      // show: !isMultiple && props.fileType !== 'empty',
      show: true,
      shortcut: 'Enter'
    },
    {
      key: 'open-with',
      label: '打开方式',
      icon: OpenOutline,
      show: true,
      // show: !isMultiple && props.fileType === 'file',
      children: [
        { key: 'open-default', label: '默认程序' },
        { key: 'open-text', label: '文本编辑器' },
        { key: 'open-code', label: '代码编辑器' }
      ]
    },
    {
      key: 'divider-1',
      label: '',
      divider: true,
      show: true,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'cut',
      label: '剪切',
      icon: CutOutline,
      // show: props.fileType !== 'empty',
      shortcut: 'Ctrl+X'
    },
    {
      key: 'copy',
      label: '复制',
      icon: CopyOutline,
      // show: props.fileType !== 'empty',
      shortcut: 'Ctrl+C'
    },
    {
      key: 'paste',
      label: '粘贴',
      icon: CopyOutline,
      shortcut: 'Ctrl+V'
    },
    {
      key: 'divider-2',
      label: '',
      divider: true
    },
    {
      key: 'rename',
      label: '重命名',
      icon: CreateOutline,
      // show: !isMultiple && props.fileType !== 'empty',
      shortcut: 'F2'
    },
    {
      key: 'delete',
      // label: isMultiple ? `删除 ${props.selectedCount} 项` : '删除',
      label: '删除',
      icon: TrashOutline,
      // show: props.fileType !== 'empty',
      danger: true,
      shortcut: 'Delete'
    },
    {
      key: 'divider-3',
      label: '',
      divider: true,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'download',
      label: '下载',
      icon: DownloadOutline,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'share',
      label: '分享',
      icon: ShareSocialOutline,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'favorite',
      label: '收藏',
      icon: StarOutline,
      // show: !isMultiple && props.fileType !== 'empty'
    },
    {
      key: 'divider-4',
      label: '',
      divider: true,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'properties',
      label: '属性',
      icon: InformationCircleOutline,
      // show: !isMultiple && props.fileType !== 'empty',
      shortcut: 'Alt+Enter'
    },
    {
      key: 'new-folder',
      label: '新建文件夹',
      icon: CreateOutline,
      // show: props.fileType === 'empty',
      shortcut: 'Ctrl+Shift+N'
    }
  ]
})

const fileMenuOptions1 = computed<ContextMenuItem[]>(() => {
  const isMultiple = true // 示例中假设为多选状态
  return [
    {
      key: 'open',
      label: '打开',
      icon: OpenOutline,
      // show: !isMultiple && props.fileType !== 'empty',
      show: true,
      shortcut: 'Enter'
    }
  ]
})

const handleModelChange = (value: ViewMode) => {
  viewMode.value = value
}

const handleGridSizeChange = (value: GridSize) => {
  gridSize.value = value
}

const handleChange = (files: File[]) => {
  console.log('上传的文件:', files)
}

const handleSelect = (key: string[]) => {
  selectedIds.value = new Set(key)
}

const handleOpen = (file: FileItem) => {
  console.log('打开文件:', file)
}

const handleSort = (field: string) => {
  setSorting(field as SortField)
}

const handleSelectionChange = (selected: FileItem[]) => {
  console.log('圈选的文件:', selected)
}

const handleSelectionStart = (selected: FileItem[]) => {
  console.log('开始圈选', selected)
}

const handleSelectionEnd = (selected: FileItem[]) => {
  console.log('结束圈选', selected)
}
</script>
