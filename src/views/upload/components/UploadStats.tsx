import { type PropType, defineComponent } from 'vue';
import { NIcon, NProgress, NTag } from 'naive-ui';
import {
  DocumentsOutline,
  FolderOpenOutline,
  SpeedometerOutline,
  TimeOutline,
  WifiOutline
} from '@vicons/ionicons5';

interface Props {
  totalProgress: number;
  uploadSpeed: number;
  displayEstimatedTime: number;
  networkQualityText: string;
  networkQualityColor: 'success' | 'warning' | 'error' | 'default';
  uploadedSize: number;
  totalSize: number;
  getProgressStatus: () => 'success' | 'error' | 'default';
  formatSpeed: (bytesPerSecond: number) => string;
  formatTime: (seconds: number) => string;
  formatFileSize: (bytes: number) => string;
  themeVars: {
    primaryColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
  };
}

interface StatRow {
  label: string;
  icon: any;
  value: string;
  tag?: { text: string; type: 'success' | 'warning' | 'error' | 'default' };
}

export default defineComponent({
  name: 'UploadStats',
  props: {
    totalProgress: {
      type: Number,
      required: true
    },
    uploadSpeed: {
      type: Number,
      required: true
    },
    displayEstimatedTime: {
      type: Number,
      required: true
    },
    networkQualityText: {
      type: String,
      required: true
    },
    networkQualityColor: {
      type: String as PropType<Props['networkQualityColor']>,
      required: true
    },
    uploadedSize: {
      type: Number,
      required: true
    },
    totalSize: {
      type: Number,
      required: true
    },
    getProgressStatus: {
      type: Function as PropType<Props['getProgressStatus']>,
      required: true
    },
    formatSpeed: {
      type: Function as PropType<Props['formatSpeed']>,
      required: true
    },
    formatTime: {
      type: Function as PropType<Props['formatTime']>,
      required: true
    },
    formatFileSize: {
      type: Function as PropType<Props['formatFileSize']>,
      required: true
    },
    themeVars: {
      type: Object as PropType<Props['themeVars']>,
      required: true
    }
  },
  setup(props) {
    return () => {
      const progressStatus = props.getProgressStatus();
      const progressColor =
        progressStatus === 'success'
          ? props.themeVars.successColor
          : progressStatus === 'error'
            ? props.themeVars.errorColor
            : props.themeVars.primaryColor;

      const sizePercent =
        props.totalSize > 0 ? Math.round((props.uploadedSize / props.totalSize) * 100) : 0;

      const statRows: StatRow[] = [
        {
          label: '上传速度',
          icon: SpeedometerOutline,
          value: props.formatSpeed(props.uploadSpeed)
        },
        {
          label: '预计时间',
          icon: TimeOutline,
          value: props.formatTime(props.displayEstimatedTime)
        },
        {
          label: '网络质量',
          icon: WifiOutline,
          value: '',
          tag: { text: props.networkQualityText, type: props.networkQualityColor }
        },
        {
          label: '已上传',
          icon: DocumentsOutline,
          value: props.formatFileSize(props.uploadedSize)
        },
        {
          label: '总大小',
          icon: FolderOpenOutline,
          value: props.formatFileSize(props.totalSize)
        }
      ];

      return (
        <div
          class="border border-gray-200 rounded-lg p-4 shadow-sm lg:flex-[2] dark:border-gray-700"
          style={{ backgroundColor: `${props.themeVars.primaryColor}05` }}
        >
          <h3 class="mb-3 text-sm text-gray-700 font-semibold dark:text-gray-300">上传统计</h3>

          {/* 全局进度 */}
          <div class="mb-4">
            <div class="mb-2 flex items-center justify-between text-xs">
              <span class="text-gray-500 dark:text-gray-400">总进度</span>
              <span class="font-bold" style={{ color: progressColor }}>
                {Math.round(props.totalProgress)}%
              </span>
            </div>
            <NProgress
              type="line"
              percentage={props.totalProgress}
              status={progressStatus}
              height={14}
              border-radius={7}
              fill-border-radius={7}
            />
          </div>

          {/* 大小进度条 */}
          {props.totalSize > 0 && (
            <div class="mb-4">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-gray-500 dark:text-gray-400">已上传大小</span>
                <span class="font-semibold" style={{ color: progressColor }}>
                  {props.formatFileSize(props.uploadedSize)} /{' '}
                  {props.formatFileSize(props.totalSize)}
                </span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${sizePercent}%`,
                    backgroundColor: progressColor,
                    minWidth: sizePercent > 0 ? '4px' : '0'
                  }}
                />
              </div>
            </div>
          )}

          {/* 详细信息 */}
          <div class="space-y-2.5">
            {statRows.map(row => (
              <div key={row.label} class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <NIcon component={row.icon} size={14} />
                  {row.label}
                </span>
                {row.tag ? (
                  <NTag type={row.tag.type} size="small" bordered={false}>
                    {row.tag.text}
                  </NTag>
                ) : (
                  <span class="text-xs font-semibold">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    };
  }
});
