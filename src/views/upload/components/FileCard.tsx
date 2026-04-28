import { type PropType, defineComponent } from 'vue';
import { NButton, NIcon, NProgress, NTag, NTooltip } from 'naive-ui';
import {
  CloseCircleOutline,
  EyeOutline,
  PauseOutline,
  PlayOutline,
  RefreshOutline,
  RemoveCircleOutline
} from '@vicons/ionicons5';
import { UploadStatus } from '@/hooks/upload';
import type { FileListRow } from '../types';
import type { FileListColumnHandlers, FileListColumnUtils } from './FileListColumns';

interface Props {
  row: FileListRow;
  handlers: FileListColumnHandlers;
  utils: FileListColumnUtils;
  themeVars: {
    primaryColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
  };
}

export default defineComponent({
  name: 'FileCard',
  props: {
    row: {
      type: Object as PropType<FileListRow>,
      required: true
    },
    handlers: {
      type: Object as PropType<FileListColumnHandlers>,
      required: true
    },
    utils: {
      type: Object as PropType<FileListColumnUtils>,
      required: true
    },
    themeVars: {
      type: Object as PropType<Props['themeVars']>,
      required: true
    }
  },
  setup(props) {
    const getStatusTagType = (): 'success' | 'error' | 'info' | 'warning' | 'default' => {
      if (props.row.status === UploadStatus.SUCCESS) return 'success';
      if (props.row.status === UploadStatus.ERROR) return 'error';
      if (props.row.status === UploadStatus.UPLOADING) return 'info';
      if (props.row.status === UploadStatus.PAUSED) return 'warning';
      return 'default';
    };

    const getProgressStatus = (): 'success' | 'error' | 'default' => {
      if (props.row.status === UploadStatus.ERROR) return 'error';
      if (props.row.status === UploadStatus.SUCCESS) return 'success';
      return 'default';
    };

    /** 渲染操作图标按钮 */
    const renderActionBtn = (config: {
      icon: any;
      onClick: () => void;
      type?: 'primary' | 'error' | 'warning' | 'default';
      tooltip: string;
      show: boolean;
    }) => {
      if (!config.show) return null;
      return (
        <NTooltip trigger="hover">
          {{
            trigger: () => (
              <NButton
                size="tiny"
                type={config.type || 'default'}
                circle
                quaternary
                onClick={config.onClick}
              >
                {{
                  icon: () => <NIcon component={config.icon} size={14} />
                }}
              </NButton>
            ),
            default: () => config.tooltip
          }}
        </NTooltip>
      );
    };

    return () => {
      const statusTagType = getStatusTagType();
      const progressStatus = getProgressStatus();

      return (
        <div class="border border-gray-200 rounded-md bg-white p-3 transition-shadow duration-200 dark:border-gray-700 dark:bg-[rgb(var(--inverted-bg-color))] hover:shadow-md">
          {/* 顶部：文件名 + 状态 + 操作按钮 */}
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 flex items-center gap-2">
              <NTag type={statusTagType} size="small" bordered={false}>
                {props.utils.getStatusText(props.row.status)}
              </NTag>
              <span class="truncate text-sm font-medium">{props.row.file.name}</span>
            </div>

            {/* 操作按钮 — 右上角 */}
            <div class="flex shrink-0 items-center gap-0.5">
              {renderActionBtn({
                icon: PauseOutline,
                onClick: () => props.handlers.onPause(props.row.id),
                tooltip: '暂停',
                show: props.row.status === UploadStatus.UPLOADING
              })}
              {renderActionBtn({
                icon: PlayOutline,
                onClick: () => props.handlers.onResume(props.row.id),
                type: 'primary',
                tooltip: '恢复',
                show: props.row.status === UploadStatus.PAUSED
              })}
              {renderActionBtn({
                icon: RefreshOutline,
                onClick: () => props.handlers.onRetrySingle(props.row.id),
                type: 'warning',
                tooltip: '重试',
                show: props.row.status === UploadStatus.ERROR
              })}
              {renderActionBtn({
                icon: CloseCircleOutline,
                onClick: () => props.handlers.onCancel(props.row.id),
                type: 'error',
                tooltip: '取消',
                show:
                  props.row.status === UploadStatus.UPLOADING ||
                  props.row.status === UploadStatus.PAUSED ||
                  props.row.status === UploadStatus.PENDING
              })}
              {renderActionBtn({
                icon: EyeOutline,
                onClick: () => props.handlers.onViewTask(props.row),
                tooltip: '详情',
                show: true
              })}
              {renderActionBtn({
                icon: RemoveCircleOutline,
                onClick: () => props.handlers.onRemove(props.row.id),
                type: 'error',
                tooltip: '移除',
                show: true
              })}
            </div>
          </div>

          {/* 中部：进度条 */}
          <div class="mt-2">
            <NProgress
              type="line"
              percentage={props.row.progress}
              status={progressStatus}
              height={6}
              showIndicator={false}
              border-radius={3}
              fill-border-radius={3}
            />
          </div>

          {/* 底部：信息 */}
          <div class="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{props.utils.formatFileSize(props.row.file.size)}</span>
            {props.row.status === UploadStatus.UPLOADING && (
              <span>{props.utils.formatSpeed(props.row.speed)}</span>
            )}
            <span>
              {props.row.uploadedChunks}/{props.row.totalChunks}分片
            </span>
          </div>
        </div>
      );
    };
  }
});
