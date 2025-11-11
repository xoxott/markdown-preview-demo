/**
 * 文件/文件夹拖拽操作时的悬浮预览组件。 用于在拖动文件或文件夹时显示简洁的预览卡片， 支持移动与复制操作的动态提示。
 *
 * 特性：
 *
 * - 支持显示多个被拖拽的项目（最多 3 个）
 * - 支持文件类型图标自动识别（图片 / 视频 / 音频 / 代码 / 压缩包 / 普通文件）
 * - 实时跟随鼠标位置渲染
 * - 显示操作类型（复制 / 移动）与剩余数量提示
 * - 使用 Naive UI 图标与动画效果
 *
 * @file DragPreview.vue
 */

import { Teleport, Transition, computed, defineComponent } from 'vue';
import type { CSSProperties } from 'vue';
import { NIcon } from 'naive-ui';
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
} from '@vicons/ionicons5';
import type { FileItem } from '../types/file-explorer';

/**
 * @typedef {Object} FileItem
 * @property {string} id - 文件唯一 ID
 * @property {string} name - 文件或文件夹名称
 * @property {'file' | 'folder'} type - 项目类型
 * @property {string} [extension] - 文件扩展名（文件类型为 file 时可选）
 */

interface Props {
  /** 拖拽的文件/文件夹项目集合 */
  items: FileItem[];
  /** 是否处于拖拽中状态 */
  isDragging: boolean;
  /** 拖拽起始位置（通常为鼠标按下位置） */
  dragStartPos: { x: number; y: number } | null;
  /** 拖拽当前鼠标位置 */
  dragCurrentPos: { x: number; y: number } | null;
  /** 当前操作类型：move（移动）或 copy（复制） */
  operation: 'move' | 'copy';
}

const MAX_PREVIEW_ITEMS = 3;

export default defineComponent({
  name: 'DragPreview',
  props: {
    items: { type: Array as () => FileItem[], required: true },
    isDragging: { type: Boolean, required: true },
    dragStartPos: {
      type: Object as () => { x: number; y: number } | null,
      default: null
    },
    dragCurrentPos: {
      type: Object as () => { x: number; y: number } | null,
      default: null
    },
    operation: { type: String as () => 'move' | 'copy', required: true }
  },
  setup(props: Props) {
    /** 是否显示预览 仅在拖拽中并存在当前位置时显示 */
    const showPreview = computed(() => props.isDragging && props.dragCurrentPos);

    /** 拖拽预览的样式，实时跟随鼠标偏移 */
    const previewStyle = computed<CSSProperties>(() => {
      if (!props.dragCurrentPos) return {};
      return {
        left: `${props.dragCurrentPos.x + 10}px`,
        top: `${props.dragCurrentPos.y + 10}px`,
        transform: 'translate(0, 0)'
      };
    });

    /** 显示的前几个预览项（最多 3 个） */
    const previewItems = computed(() => props.items.slice(0, MAX_PREVIEW_ITEMS));

    /** 超出部分数量 */
    const remainingCount = computed(() => Math.max(0, props.items.length - MAX_PREVIEW_ITEMS));

    /** 操作图标（复制或移动） */
    const operationIcon = computed(() => (props.operation === 'copy' ? CopyOutline : SwapHorizontalOutline));

    /** 操作文案 */
    const operationText = computed(() => (props.operation === 'copy' ? '复制' : '移动'));

    /** 根据文件类型或扩展名获取图标 */
    const getFileIcon = (item: FileItem) => {
      if (item.type === 'folder') return FolderOutline;
      const ext = item.extension?.toLowerCase();
      if (!ext) return DocumentOutline;
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return ImageOutline;
      if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) return VideocamOutline;
      if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return MusicalNotesOutline;
      if (
        [
          'js',
          'ts',
          'jsx',
          'tsx',
          'vue',
          'html',
          'css',
          'scss',
          'json',
          'xml',
          'py',
          'java',
          'cpp',
          'c',
          'go',
          'rs'
        ].includes(ext)
      )
        return CodeSlashOutline;
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return ArchiveOutline;
      return DocumentOutline;
    };

    /** 根据文件类型获取颜色 */
    const getFileColor = (item: FileItem): string => {
      if (item.type === 'folder') return 'text-blue-500';
      const ext = item.extension?.toLowerCase();
      if (!ext) return 'text-gray-500';

      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'text-green-500';
      if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) return 'text-purple-500';
      if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'text-pink-500';
      if (
        [
          'js',
          'ts',
          'jsx',
          'tsx',
          'vue',
          'html',
          'css',
          'scss',
          'json',
          'xml',
          'py',
          'java',
          'cpp',
          'c',
          'go',
          'rs'
        ].includes(ext)
      )
        return 'text-yellow-500';
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'text-orange-500';

      return 'text-gray-500';
    };

    /** 阻止鼠标事件干扰页面 */
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

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
              class="pointer-events-none fixed z-[9999] select-none"
              style={previewStyle.value}
              onMousedown={handleMouseDown}
            >
              {/* 拖拽预览卡片 */}
              <div class="max-w-[320px] min-w-[240px] border border-gray-200 rounded-lg bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                {/* 操作类型指示器 */}
                <div class="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
                  <NIcon component={operationIcon.value} size={16} class="text-blue-500" />
                  <span class="text-xs text-gray-600 font-medium dark:text-gray-400">
                    {operationText.value} {props.items.length} 个项目
                  </span>
                </div>

                {/* 预览项列表 */}
                <div class="space-y-1.5">
                  {previewItems.value.map((item, index) => (
                    <div
                      key={item.id}
                      class="flex items-center gap-2 rounded bg-gray-50 p-1.5 dark:bg-gray-700/50"
                      style={{ opacity: 1 - index * 0.15 }}
                    >
                      <div class={['flex-shrink-0', getFileColor(item)]}>
                        <NIcon component={getFileIcon(item)} size={20} />
                      </div>
                      <span class="flex-1 truncate text-sm text-gray-900 font-medium dark:text-gray-100">
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
                  <div class="mt-2 flex items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                    <span class="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400">
                      +{remainingCount.value}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">还有 {remainingCount.value} 个项目</span>
                  </div>
                )}

                {/* 拖拽提示 */}
                <div class="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {props.operation === 'move' ? '按住 Ctrl 复制' : '松开 Ctrl 移动'}
                  </p>
                </div>
              </div>

              {/* 拖拽阴影效果 */}
              <div class="absolute inset-0 rounded-lg bg-blue-500 opacity-30 blur-xl -z-10" />
            </div>
          )}
        </Transition>
      </Teleport>
    );
  }
});
