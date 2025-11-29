import { defineComponent, type PropType } from 'vue';
import { NCard, NIcon, NProgress, NTag } from 'naive-ui';
import {
  SpeedometerOutline,
  TimeOutline,
  WifiOutline,
  DocumentsOutline,
  FolderOpenOutline
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
    }
  },
  setup(props) {
    return () => (
      <NCard class="flex-1 max-w-[280px]" title="上传统计">
        <div class="flex flex-col gap-4">
          {/* 全局进度 */}
          <div>
            <div class="mb-2 flex items-center justify-between text-sm">
              <span>总进度</span>
              <span class="font-semibold">{Math.round(props.totalProgress)}%</span>
            </div>
            <NProgress
              type="line"
              percentage={props.totalProgress}
              status={props.getProgressStatus()}
              height={16}
              border-radius={8}
              fill-border-radius={8}
            />
          </div>

          {/* 详细信息 */}
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2">
                <NIcon component={SpeedometerOutline} size={16} />
                上传速度
              </span>
              <span class="font-semibold">{props.formatSpeed(props.uploadSpeed)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2">
                <NIcon component={TimeOutline} size={16} />
                预计剩余时间
              </span>
              <span class="font-semibold">{props.formatTime(props.displayEstimatedTime)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2">
                <NIcon component={WifiOutline} size={16} />
                网络质量
              </span>
              <NTag type={props.networkQualityColor} size="small" bordered={false}>
                {props.networkQualityText}
              </NTag>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2">
                <NIcon component={DocumentsOutline} size={16} />
                已上传大小
              </span>
              <span class="font-semibold">{props.formatFileSize(props.uploadedSize)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2">
                <NIcon component={FolderOpenOutline} size={16} />
                总大小
              </span>
              <span class="font-semibold">{props.formatFileSize(props.totalSize)}</span>
            </div>
          </div>
        </div>
      </NCard>
    );
  }
});

