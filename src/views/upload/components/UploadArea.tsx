import { type PropType, defineComponent, ref } from 'vue';
import { NButton, NCard, NIcon, NTag, NTooltip } from 'naive-ui';
import {
  CloseCircleOutline,
  CloudUploadOutline,
  PauseOutline,
  PlayOutline,
  RefreshOutline
} from '@vicons/ionicons5';
import type { UploadConfig } from '@/hooks/upload';
import { CONSTANTS } from '@/hooks/upload';
import CustomUpload from '@/components/custom-upload';
import type { CustomUploadFileInfo } from '@/components/custom-upload';

interface Props {
  settings: Partial<UploadConfig>;
  isUploading: boolean;
  isPaused: boolean;
  uploadQueueLength: number;
  totalFiles: number;
  failedCount: number;
  themeVars: {
    primaryColor: string;
    primaryColorHover: string;
  };
  isMobile: boolean;
  onFilesChange: (files: CustomUploadFileInfo[]) => Promise<void>;
  onUploadError: (error: { file: File; message: string }) => void;
  onExceed: (data: { files: File[]; max: number }) => void;
  onStartUpload: () => void;
  onPauseAll: () => Promise<void>;
  onResumeAll: () => void;
  onCancelAll: () => Promise<void>;
  onRetryFailed: () => void;
}

export default defineComponent({
  name: 'UploadArea',
  props: {
    settings: {
      type: Object as PropType<Partial<UploadConfig>>,
      required: true
    },
    isUploading: {
      type: Boolean,
      required: true
    },
    isPaused: {
      type: Boolean,
      required: true
    },
    uploadQueueLength: {
      type: Number,
      required: true
    },
    totalFiles: {
      type: Number,
      required: true
    },
    failedCount: {
      type: Number,
      required: true
    },
    themeVars: {
      type: Object as PropType<Props['themeVars']>,
      required: true
    },
    isMobile: {
      type: Boolean,
      required: true
    },
    onFilesChange: {
      type: Function as PropType<Props['onFilesChange']>,
      required: true
    },
    onUploadError: {
      type: Function as PropType<Props['onUploadError']>,
      required: true
    },
    onExceed: {
      type: Function as PropType<Props['onExceed']>,
      required: true
    },
    onStartUpload: {
      type: Function as PropType<Props['onStartUpload']>,
      required: true
    },
    onPauseAll: {
      type: Function as PropType<Props['onPauseAll']>,
      required: true
    },
    onResumeAll: {
      type: Function as PropType<Props['onResumeAll']>,
      required: true
    },
    onCancelAll: {
      type: Function as PropType<Props['onCancelAll']>,
      required: true
    },
    onRetryFailed: {
      type: Function as PropType<Props['onRetryFailed']>,
      required: true
    }
  },
  setup(props) {
    const fileInputRef = ref<InstanceType<typeof CustomUpload>>();

    /** 渲染按钮 — 桌面端显示文字+图标，移动端只显示图标 */
    const renderButton = (config: {
      type?: 'primary' | 'error' | 'warning' | 'default';
      disabled: boolean;
      loading?: boolean;
      onClick: () => void;
      icon: any;
      text: string;
      mobileText?: string;
    }) => {
      if (props.isMobile) {
        return (
          <NTooltip trigger="hover">
            {{
              trigger: () => (
                <NButton
                  type={config.type || 'default'}
                  disabled={config.disabled}
                  loading={config.loading}
                  size="small"
                  circle
                  onClick={config.onClick}
                >
                  {{
                    icon: () => <NIcon component={config.icon} size={18} />
                  }}
                </NButton>
              ),
              default: () => config.mobileText || config.text
            }}
          </NTooltip>
        );
      }

      return (
        <NButton
          type={config.type || 'default'}
          disabled={config.disabled}
          loading={config.loading}
          size="small"
          onClick={config.onClick}
        >
          {{
            icon: () => <NIcon component={config.icon} size={16} />,
            default: () => config.text
          }}
        </NButton>
      );
    };

    return () => (
      <NCard class="card-wrapper lg:flex-[3]" bordered={false}>
        {{
          'header-extra': () => (
            <NTag type="info" size="small" bordered={false}>
              拖拽 / 多选 / 文件夹
            </NTag>
          ),
          'default': () => (
            <div class="flex flex-col gap-3">
              <CustomUpload
                ref={fileInputRef}
                abstract={true}
                multiple={true}
                directory-dnd={true}
                max={props.settings.maxFiles || CONSTANTS.UPLOAD.MAX_FILES}
                max-size={props.settings.maxFileSize || CONSTANTS.UPLOAD.MAX_FILESIZE}
                disabled={props.isUploading && !props.isPaused}
                batch-size={100}
                processing-timeout={20}
                onChange={props.onFilesChange}
                onError={props.onUploadError}
                onExceed={props.onExceed}
              >
                {{
                  default: ({
                    isDragOver,
                    isProcessing,
                    fileCount: _fileCount
                  }: {
                    isDragOver: boolean;
                    isProcessing: boolean;
                    fileCount: number;
                  }) => (
                    <div class="flex flex-col items-center justify-center py-6 text-center sm:py-8">
                      <NIcon
                        component={CloudUploadOutline}
                        size={48}
                        color={
                          isDragOver
                            ? props.themeVars.primaryColor
                            : props.themeVars.primaryColorHover
                        }
                        class="transition-all duration-300"
                      />
                      <p class="mt-3 text-sm font-medium">
                        {isProcessing ? '处理中...' : '拖拽文件到此处或点击选择'}
                      </p>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {props.uploadQueueLength > 0
                          ? `队列中 ${props.uploadQueueLength} 个文件`
                          : '支持拖拽、多选、文件夹'}
                      </p>
                    </div>
                  )
                }}
              </CustomUpload>

              {/* 控制按钮 — 分组布局 */}
              <div class="flex flex-wrap items-center gap-2">
                {/* 主操作组 */}
                <div class="flex items-center gap-1.5">
                  {renderButton({
                    type: 'primary',
                    disabled: props.totalFiles === 0 || props.isUploading || props.isPaused,
                    loading: props.isUploading,
                    onClick: props.onStartUpload,
                    icon: PlayOutline,
                    text: '开始上传',
                    mobileText: '开始'
                  })}
                  {renderButton({
                    disabled: !props.isUploading || props.isPaused,
                    onClick: props.onPauseAll,
                    icon: PauseOutline,
                    text: '暂停',
                    mobileText: '暂停'
                  })}
                  {renderButton({
                    disabled: !props.isPaused || props.isUploading,
                    onClick: props.onResumeAll,
                    icon: PlayOutline,
                    text: '恢复',
                    mobileText: '恢复'
                  })}
                </div>

                {/* 分隔 */}
                <div class="hidden h-4 w-px bg-gray-300 sm:block dark:bg-gray-600" />

                {/* 危险操作 */}
                {renderButton({
                  type: 'error',
                  disabled: !props.isUploading && !props.isPaused,
                  onClick: props.onCancelAll,
                  icon: CloseCircleOutline,
                  text: '取消全部',
                  mobileText: '取消'
                })}

                {/* 分隔 */}
                <div class="hidden h-4 w-px bg-gray-300 sm:block dark:bg-gray-600" />

                {/* 修复操作 */}
                {renderButton({
                  type: 'warning',
                  disabled: props.failedCount === 0,
                  onClick: props.onRetryFailed,
                  icon: RefreshOutline,
                  text: `重试 (${props.failedCount})`,
                  mobileText: `重试${props.failedCount > 0 ? ` ${props.failedCount}` : ''}`
                })}
              </div>
            </div>
          )
        }}
      </NCard>
    );
  }
});
