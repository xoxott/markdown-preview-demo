import { defineComponent, type PropType, ref } from 'vue';
import { NButton, NCard, NIcon, NTag } from 'naive-ui';
import {
  CloudUploadOutline,
  PlayOutline,
  PauseOutline,
  CloseCircleOutline,
  RefreshOutline
} from '@vicons/ionicons5';
import CustomUpload from '@/components/custom-upload';
import type { CustomUploadFileInfo } from '@/components/custom-upload';
import type { UploadConfig } from '@/hooks/upload-v2';
import { CONSTANTS } from '@/hooks/upload-v2';

interface Props {
  settings: Partial<UploadConfig>;
  isUploading: boolean;
  isPaused: boolean;
  uploadQueueLength: number;
  failedCount: number;
  themeVars: {
    primaryColor: string;
    primaryColorHover: string;
  };
  onFilesChange: (files: CustomUploadFileInfo[]) => Promise<void>;
  onUploadError: (error: { file: File; message: string }) => void;
  onExceed: (data: { files: File[]; max: number }) => void;
  onStartUpload: () => Promise<void>;
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
    failedCount: {
      type: Number,
      required: true
    },
    themeVars: {
      type: Object as PropType<Props['themeVars']>,
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

    return () => (
      <NCard class="flex-[2]" title="文件上传">
        {{
          'header-extra': () => (
            <NTag type="info" size="small">
              支持拖拽、多选、文件夹
            </NTag>
          ),
          default: () => (
            <div class="flex flex-col gap-4">
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
                  default: ({ isDragOver, isProcessing, fileCount }: {
                    isDragOver: boolean;
                    isProcessing: boolean;
                    fileCount: number;
                  }) => (
                    <div class="flex flex-col items-center justify-center px-4 py-8 text-center">
                      <NIcon
                        component={CloudUploadOutline}
                        size={64}
                        color={
                          isDragOver
                            ? props.themeVars.primaryColor
                            : props.themeVars.primaryColorHover
                        }
                        class="transition-all duration-300"
                      />
                      <p class="mt-4 text-base font-medium">
                        {isProcessing ? '处理中...' : '拖拽文件到此处或点击选择'}
                      </p>
                      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        已选择 {fileCount} 个文件
                      </p>
                    </div>
                  )
                }}
              </CustomUpload>

              {/* 控制按钮 */}
              <div class="flex flex-wrap gap-2">
                <NButton
                  type="primary"
                  disabled={props.uploadQueueLength === 0 || props.isUploading || props.isPaused}
                  loading={props.isUploading}
                  onClick={props.onStartUpload}
                >
                  {{
                    icon: () => <NIcon component={PlayOutline} />,
                    default: () => '开始上传'
                  }}
                </NButton>
                <NButton disabled={!props.isUploading || props.isPaused} onClick={props.onPauseAll}>
                  {{
                    icon: () => <NIcon component={PauseOutline} />,
                    default: () => '暂停全部'
                  }}
                </NButton>
                <NButton
                  disabled={!props.isPaused || props.isUploading}
                  onClick={props.onResumeAll}
                >
                  {{
                    icon: () => <NIcon component={PlayOutline} />,
                    default: () => '恢复全部'
                  }}
                </NButton>
                <NButton
                  disabled={!props.isUploading && !props.isPaused}
                  type="error"
                  onClick={props.onCancelAll}
                >
                  {{
                    icon: () => <NIcon component={CloseCircleOutline} />,
                    default: () => '取消全部'
                  }}
                </NButton>
                <NButton
                  disabled={props.failedCount === 0}
                  type="warning"
                  onClick={props.onRetryFailed}
                >
                  {{
                    icon: () => <NIcon component={RefreshOutline} />,
                    default: () => `重试失败 (${props.failedCount})`
                  }}
                </NButton>
              </div>
            </div>
          )
        }}
      </NCard>
    );
  }
});

