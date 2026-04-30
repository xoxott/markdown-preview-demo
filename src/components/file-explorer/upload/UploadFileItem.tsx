/** 单文件上传进度项 — 显示文件名、大小、状态、进度条和操作按钮 */

import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { NButton, NIcon, NProgress, NTag } from 'naive-ui';
import { CloseOutline, PauseOutline, PlayOutline, RefreshOutline } from '@vicons/ionicons5';
import { File, FileCode, FileText, Folder, Music, Photo, Video } from '@vicons/tabler';
import type { FileTask } from '@/hooks/upload/types';
import { UploadStatus } from '@/hooks/upload/types';
import { formatFileSize, formatSpeed } from '@/hooks/upload/utils/format';
import { getStatusText, getStatusType } from '@/hooks/upload/utils/status-mapper';
import { getFileCategoryByExtension } from '../config/extensionCategories';

/** 分类 → 图标映射（与 fileHelpers 中一致） */
const CATEGORY_ICON_MAP: Record<string, any> = {
  image: Photo,
  video: Video,
  audio: Music,
  code: FileCode,
  document: FileText,
  folder: Folder,
  other: File
};

/** 从 File 对象推导文件图标 */
function getFileIconFromFile(file: File): any {
  const name = file.name;
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  const category = getFileCategoryByExtension(ext);
  return CATEGORY_ICON_MAP[category] ?? File;
}

export default defineComponent({
  name: 'UploadFileItem',
  props: {
    task: { type: Object as PropType<FileTask>, required: true },
    onPause: { type: Function as PropType<(taskId: string) => void>, required: true },
    onResume: { type: Function as PropType<(taskId: string) => void>, required: true },
    onCancel: { type: Function as PropType<(taskId: string) => void>, required: true },
    onRetry: { type: Function as PropType<(taskId: string) => void>, required: true },
    onRemove: { type: Function as PropType<(taskId: string) => void>, required: true }
  },
  setup(props) {
    return () => {
      const { task } = props;
      const IconComp = getFileIconFromFile(task.file);

      // 状态颜色映射
      const statusType = getStatusType(task.status);
      const statusText = getStatusText(task.status);

      const tagColorMap: Record<string, string> = {
        default: 'default',
        info: 'info',
        success: 'success',
        warning: 'warning',
        error: 'error'
      };

      return (
        <div class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
          {/* 文件图标 */}
          <div class="flex-shrink-0">
            <NIcon component={IconComp} size={20} class="text-gray-500 dark:text-gray-400" />
          </div>

          {/* 文件信息 + 进度条 */}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm text-gray-900 font-medium dark:text-gray-100">
                {task.file.name}
              </span>
              <div class="flex flex-shrink-0 items-center gap-2">
                <NTag size="small" type={tagColorMap[statusType] as any} bordered={false} round>
                  {statusText}
                </NTag>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(task.file.size)}
                </span>
              </div>
            </div>

            {/* 进度条（上传中/暂停时显示） */}
            {(task.status === UploadStatus.UPLOADING ||
              task.status === UploadStatus.PAUSED ||
              task.status === UploadStatus.PENDING) && (
              <NProgress
                percentage={task.progress}
                showIndicator={false}
                type="line"
                status={task.status === UploadStatus.PAUSED ? 'warning' : 'default'}
                class="mt-1"
                railColor="var(--n-rail-color)"
              />
            )}

            {/* 速度显示（上传中时） */}
            {task.status === UploadStatus.UPLOADING && task.speed > 0 && (
              <span class="mt-0.5 text-xs text-gray-400">
                {formatSpeed(task.speed * 1024)} {/* speed 是 KB/s，转 B/s 给 formatSpeed */}
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          <div class="flex flex-shrink-0 gap-1">
            {task.status === UploadStatus.UPLOADING && (
              <NButton quaternary size="tiny" onClick={() => props.onPause(task.id)}>
                <NIcon component={PauseOutline} size={16} />
              </NButton>
            )}
            {task.status === UploadStatus.PAUSED && (
              <NButton quaternary size="tiny" onClick={() => props.onResume(task.id)}>
                <NIcon component={PlayOutline} size={16} />
              </NButton>
            )}
            {task.status === UploadStatus.ERROR && (
              <NButton quaternary size="tiny" onClick={() => props.onRetry(task.id)}>
                <NIcon component={RefreshOutline} size={16} />
              </NButton>
            )}
            {task.status !== UploadStatus.SUCCESS && (
              <NButton quaternary size="tiny" onClick={() => props.onCancel(task.id)}>
                <NIcon component={CloseOutline} size={16} />
              </NButton>
            )}
            {task.status === UploadStatus.SUCCESS && (
              <NButton quaternary size="tiny" onClick={() => props.onRemove(task.id)}>
                <NIcon component={CloseOutline} size={16} />
              </NButton>
            )}
          </div>
        </div>
      );
    };
  }
});
