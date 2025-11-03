import {
  ArchiveOutline,
  CodeSlashOutline,
  CopyOutline,
  DocumentOutline,
  FolderOutline,
  ImageOutline,
  MusicalNotesOutline,
  SwapHorizontalOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import { NBadge, NIcon } from 'naive-ui'
import { defineComponent, computed, Teleport, Transition } from 'vue'
import type { CSSProperties } from 'vue'
import type { FileItem } from '../types/file-explorer'

interface Props {
  items: FileItem[]
  isDragging: boolean
  dragStartPos: { x: number; y: number } | null
  dragCurrentPos: { x: number; y: number } | null
  operation: 'move' | 'copy'
}

const MAX_PREVIEW_ITEMS = 3

export default defineComponent({
  name: 'DragPreview',
  props: {
    items: { type: Array as () => FileItem[], required: true },
    isDragging: { type: Boolean, required: true },
    dragStartPos: { type: Object as () => { x: number; y: number } | null, default: null },
    dragCurrentPos: { type: Object as () => { x: number; y: number } | null, default: null },
    operation: { type: String as () => 'move' | 'copy', required: true }
  },
  setup(props) {
    const showPreview = computed(() => props.isDragging && props.dragCurrentPos)

    const previewStyle = computed<CSSProperties>(() => {
      if (!props.dragCurrentPos) return {}
      return {
        left: `${props.dragCurrentPos.x + 10}px`,
        top: `${props.dragCurrentPos.y + 10}px`,
        transform: 'translate(0, 0)'
      }
    })

    const previewItems = computed(() => props.items.slice(0, MAX_PREVIEW_ITEMS))
    const remainingCount = computed(() => Math.max(0, props.items.length - MAX_PREVIEW_ITEMS))

    const operationIcon = computed(() =>
      props.operation === 'copy' ? CopyOutline : SwapHorizontalOutline
    )

    const operationText = computed(() =>
      props.operation === 'copy' ? '复制' : '移动'
    )

    const getFileIcon = (item: FileItem) => {
      if (item.type === 'folder') return FolderOutline
      const ext = item.extension?.toLowerCase()
      if (!ext) return DocumentOutline
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return ImageOutline
      if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) return VideocamOutline
      if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return MusicalNotesOutline
      if (
        ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext)
      )
        return CodeSlashOutline
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return ArchiveOutline
      return DocumentOutline
    }

    const getFileColor = (item: FileItem): string => {
      if (item.type === 'folder') return 'text-blue-500'
      const ext = item.extension?.toLowerCase()
      if (!ext) return 'text-gray-500'

      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'text-green-500'
      if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) return 'text-purple-500'
      if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'text-pink-500'
      if (
        ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext)
      )
        return 'text-yellow-500'
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'text-orange-500'

      return 'text-gray-500'
    }

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    return () => (
      <Teleport to="body">
        <Transition
          enterActiveClass="transition-opacity duration-150"
          leaveActiveClass="transition-opacity duration-150"
          enterFromClass="opacity-0"
          leaveToClass="opacity-0"
        >
          {showPreview.value && (
            <div
              class="fixed z-[9999] pointer-events-none select-none"
              style={previewStyle.value}
              onMousedown={handleMouseDown}
            >
              {/* 拖拽预览卡片 */}
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-3 min-w-[240px] max-w-[320px]">
                {/* 操作类型指示器 */}
                <div class="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <NIcon component={operationIcon.value} size={16} class="text-blue-500" />
                  <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {operationText.value} {props.items.length} 个项目
                  </span>
                </div>

                {/* 预览项列表 */}
                <div class="space-y-1.5">
                  {previewItems.value.map((item, index) => (
                    <div
                      key={item.id}
                      class="flex items-center gap-2 p-1.5 rounded bg-gray-50 dark:bg-gray-700/50"
                      style={{ opacity: 1 - index * 0.15 }}
                    >
                      <div class={['flex-shrink-0', getFileColor(item)]}>
                        <NIcon component={getFileIcon(item)} size={20} />
                      </div>
                      <span class="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.name}
                      </span>
                      <span class="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {item.type === 'folder' ? '文件夹' : item.extension?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 更多项提示 */}
                {remainingCount.value > 0 && (
                  <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <NBadge value={`+${remainingCount.value}`} type="info" show-zero={false}>
                      {{
                        default: () => (
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            还有 {remainingCount.value} 个项目
                          </span>
                        )
                      }}
                    </NBadge>
                  </div>
                )}

                {/* 拖拽提示 */}
                <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {props.operation === 'move' ? '按住 Ctrl 复制' : '松开 Ctrl 移动'}
                  </p>
                </div>
              </div>

              {/* 拖拽阴影效果 */}
              <div class="absolute inset-0 -z-10 blur-xl opacity-30 bg-blue-500 rounded-lg" />
            </div>
          )}
        </Transition>
      </Teleport>
    )
  }
})
