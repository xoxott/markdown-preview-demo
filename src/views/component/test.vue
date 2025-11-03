<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NSpace, useMessage } from 'naive-ui'
import { FileItem } from '@/components/file-explorer/types/file-explorer'
import { useFileDragDropEnhanced } from '@/components/file-explorer/hooks/useFileDragDropEnhanced'
import DragPreview from '@/components/file-explorer/interaction/DragPreview'
import DropZone from '@/components/file-explorer/interaction/DropZone'

const message = useMessage()

// 示例数据
const files = ref<FileItem[]>([
  {
    id: '1',
    name: 'Annual Report 2024.pdf',
    type: 'file',
    path: '/documents/Annual Report 2024.pdf',
    extension: 'pdf',
    size: 2048000,
    modifiedAt: new Date()
  },
  {
    id: '2',
    name: 'Vacation Photo.jpg',
    type: 'file',
    path: '/pictures/Vacation Photo.jpg',
    extension: 'jpg',
    size: 1024000,
    modifiedAt: new Date()
  },
  {
    id: '3',
    name: 'Music Collection.mp3',
    type: 'file',
    path: '/music/Music Collection.mp3',
    extension: 'mp3',
    size: 5120000,
    modifiedAt: new Date()
  },
  {
    id: '4',
    name: 'Project Alpha',
    type: 'folder',
    path: '/projects/Project Alpha',
    modifiedAt: new Date()
  },
  {
    id: '5',
    name: 'Code.js',
    type: 'file',
    path: '/code/Code.js',
    extension: 'js',
    size: 15360,
    modifiedAt: new Date()
  }
])

const targetFolders = ref([
  { id: 'folder-1', name: '📄 Documents', path: '/documents', color: 'blue' },
  { id: 'folder-2', name: '🖼️ Pictures', path: '/pictures', color: 'green' },
  { id: 'folder-3', name: '🎵 Music', path: '/music', color: 'purple' },
  { id: 'folder-4', name: '💼 Projects', path: '/projects', color: 'orange' }
])

const selectedFiles = ref<Set<string>>(new Set())

// 🔥 使用增强版 Hook（自动处理所有拖拽事件，包括 dragend）
const {
  dragState,
  isDragging,
  dragOperation,
  startDrag,
  getDropZoneState,
  enterDropZone,
  leaveDropZone,
  executeDrop
} = useFileDragDropEnhanced({
  onDragStart: (items) => {
    console.log('🎯 开始拖拽:', items.map(i => i.name))
  },
  onDragEnd: () => {
    console.log('✅ 拖拽结束')
  },
  onMove: async (items, targetPath) => {
    message.success(`移动 ${items.length} 个项目到 ${targetPath}`)
    await new Promise(resolve => setTimeout(resolve, 500)) // 模拟 API 延迟
    console.log('📦 移动:', items.map(i => i.name), '到:', targetPath)
  },
  onCopy: async (items, targetPath) => {
    message.info(`复制 ${items.length} 个项目到 ${targetPath}`)
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('📋 复制:', items.map(i => i.name), '到:', targetPath)
  },
  validateDrop: (items, targetPath) => {
    // 验证：不能拖到源路径
    return !items.some(item => {
      const itemDir = item.path.substring(0, item.path.lastIndexOf('/'))
      return itemDir === targetPath
    })
  }
})

// 切换选择
const toggleFileSelection = (fileId: string, event?: MouseEvent) => {
  if (event?.shiftKey) {
    // Shift 多选
    const currentIndex = files.value.findIndex(f => f.id === fileId)
    const selectedArray = Array.from(selectedFiles.value)
    
    if (selectedArray.length > 0) {
      const lastSelectedId = selectedArray[selectedArray.length - 1]
      const lastIndex = files.value.findIndex(f => f.id === lastSelectedId)
      const start = Math.min(currentIndex, lastIndex)
      const end = Math.max(currentIndex, lastIndex)
      
      for (let i = start; i <= end; i++) {
        selectedFiles.value.add(files.value[i].id)
      }
    } else {
      selectedFiles.value.add(fileId)
    }
  } else if (event?.ctrlKey || event?.metaKey) {
    // Ctrl/Cmd 切换选择
    if (selectedFiles.value.has(fileId)) {
      selectedFiles.value.delete(fileId)
    } else {
      selectedFiles.value.add(fileId)
    }
  } else {
    // 单选
    selectedFiles.value.clear()
    selectedFiles.value.add(fileId)
  }
}

// 获取选中的文件
const getSelectedItems = (): FileItem[] => {
  return files.value.filter(f => selectedFiles.value.has(f.id))
}

// 开始拖拽
const handleFileDragStart = (file: FileItem, event: DragEvent) => {
  const itemsToDrag = selectedFiles.value.has(file.id)
    ? getSelectedItems()
    : [file]
  
  startDrag(itemsToDrag, event)
}

// 处理放置
const handleDrop = async (zoneId: string) => {
  await executeDrop(zoneId)
  selectedFiles.value.clear()
}

// 清空选择
const clearSelection = () => {
  selectedFiles.value.clear()
}

// 全选
const selectAll = () => {
  files.value.forEach(f => selectedFiles.value.add(f.id))
}

// 获取文件夹颜色类
const getFolderColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    orange: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700'
  }
  return colorMap[color] || colorMap.blue
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <!-- 🔥 不需要任何拖拽事件监听！增强版 Hook 自动处理所有事件 -->
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- 标题 -->
      <div class="space-y-3">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          🎯 增强版拖拽示例
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          拖拽预览现在会完美跟随鼠标，即使在目标区域上也不会卡住！
        </p>
        <div class="flex gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>💡 按住 <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Ctrl</kbd> 复制</span>
          <span>💡 <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Shift</kbd> 多选</span>
          <span>💡 拖拽多个文件体验流畅动画</span>
        </div>
      </div>

      <!-- 操作栏 -->
      <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            已选中: {{ selectedFiles.size }} / {{ files.length }}
          </span>
          <div class="h-4 w-px bg-gray-300 dark:bg-gray-600" />
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ isDragging ? '🎯 拖拽中...' : '待命' }}
          </span>
        </div>
        <NSpace>
          <NButton size="small" @click="selectAll">全选</NButton>
          <NButton size="small" @click="clearSelection">清空</NButton>
        </NSpace>
      </div>

      <!-- 文件列表 -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          📁 文件列表
          <span class="text-xs font-normal text-gray-500">(点击选择，拖拽移动)</span>
        </h3>
        
        <div class="grid grid-cols-5 gap-3">
          <div
            v-for="file in files"
            :key="file.id"
            :class="[
              'group relative p-4 rounded-lg cursor-move transition-all duration-200',
              'border-2 hover:shadow-lg',
              selectedFiles.has(file.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
            ]"
            draggable="true"
            @click="toggleFileSelection(file.id, $event)"
            @dragstart="handleFileDragStart(file, $event)"
          >
            <!-- 选择指示器 -->
            <div
              :class="[
                'absolute top-2 right-2 w-5 h-5 rounded-full border-2 transition-all',
                selectedFiles.has(file.id)
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
              ]"
            >
              <svg
                v-if="selectedFiles.has(file.id)"
                class="w-full h-full text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>

            <!-- 文件图标 -->
            <div class="flex flex-col items-center gap-2 text-center">
              <div class="text-4xl">
                {{ file.type === 'folder' ? '📁' : 
                   file.extension === 'pdf' ? '📄' :
                   file.extension === 'jpg' ? '🖼️' :
                   file.extension === 'mp3' ? '🎵' :
                   file.extension === 'js' ? '📜' : '📄' }}
              </div>
              <div class="w-full">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ file.name }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ file.type === 'folder' ? '文件夹' : file.extension?.toUpperCase() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 目标文件夹 -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          🎯 目标文件夹
          <span class="text-xs font-normal text-gray-500">(拖拽到这里)</span>
        </h3>
        
        <div class="grid grid-cols-4 gap-4">
          <DropZone
            v-for="folder in targetFolders"
            :key="folder.id"
            :zone-id="folder.id"
            :target-path="folder.path"
            :can-drop="getDropZoneState(folder.id)?.canDrop ?? true"
            :is-over="getDropZoneState(folder.id)?.isOver ?? false"
            as-folder-zone
            @drag-enter="enterDropZone(folder.id, folder.path)"
            @drag-leave="leaveDropZone(folder.id)"
            @drop="handleDrop(folder.id)"
          >
            <div :class="['rounded-lg p-4 border-2 transition-all', getFolderColorClass(folder.color)]">
              <div class="flex flex-col items-center gap-2 text-center">
                <div class="text-3xl">{{ folder.name.split(' ')[0] }}</div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ folder.name.split(' ').slice(1).join(' ') }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ folder.path }}
                </p>
              </div>
            </div>
          </DropZone>
        </div>
      </div>

      <!-- 独立上传区域 -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
          ☁️ 上传区域
        </h3>
        
        <DropZone
          zone-id="upload-zone"
          target-path="/uploads"
          :can-drop="getDropZoneState('upload-zone')?.canDrop ?? true"
          :is-over="getDropZoneState('upload-zone')?.isOver ?? false"
          hint="拖拽文件到此处上传"
          @drag-enter="enterDropZone('upload-zone', '/uploads')"
          @drag-leave="leaveDropZone('upload-zone')"
          @drop="handleDrop('upload-zone')"
        >
          <template #content>
            <NButton type="primary" size="large" ghost>
              或点击选择文件
            </NButton>
          </template>
        </DropZone>
      </div>

      <!-- 拖拽预览（全局跟随） -->
      <DragPreview
        :items="dragState.draggedItems"
        :is-dragging="isDragging"
        :drag-start-pos="dragState.dragStartPos"
        :drag-current-pos="dragState.dragCurrentPos"
        :operation="dragOperation"
      />

      <!-- 状态面板 -->
      <div class="p-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-inner">
        <h4 class="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">📊 实时状态</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">拖拽状态</p>
            <p class="text-lg font-bold" :class="isDragging ? 'text-green-500' : 'text-gray-400'">
              {{ isDragging ? '✓ 活跃' : '○ 待命' }}
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">操作类型</p>
            <p class="text-lg font-bold text-blue-500">
              {{ dragOperation === 'copy' ? '📋 复制' : '📦 移动' }}
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">拖拽项数</p>
            <p class="text-lg font-bold text-purple-500">
              {{ dragState.draggedItems.length }}
            </p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">选中文件</p>
            <p class="text-lg font-bold text-orange-500">
              {{ selectedFiles.size }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>