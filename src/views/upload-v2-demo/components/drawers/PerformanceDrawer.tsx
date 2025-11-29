import { defineComponent, type PropType } from 'vue';
import { NCard, NCode } from 'naive-ui';
import type { PerformanceMetricsData } from '../../types';

interface Props {
  performanceMetrics: PerformanceMetricsData;
  performanceReport: unknown;
  formatFileSize: (bytes: number) => string;
}

export default defineComponent({
  name: 'PerformanceDrawer',
  props: {
    performanceMetrics: {
      type: Object as PropType<PerformanceMetricsData>,
      required: true
    },
    performanceReport: {
      type: Object as PropType<unknown>,
      required: true
    },
    formatFileSize: {
      type: Function as PropType<Props['formatFileSize']>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <div class="mt-4 space-y-4">
        <NCard title="性能指标">
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>网络请求数:</span>
              <span class="font-semibold">{props.performanceMetrics.networkRequestCount}</span>
            </div>
            <div class="flex justify-between">
              <span>总上传时间:</span>
              <span class="font-semibold">
                {(props.performanceMetrics.totalUploadTime / 1000).toFixed(2)}s
              </span>
            </div>
            <div class="flex justify-between">
              <span>平均分片时间:</span>
              <span class="font-semibold">
                {props.performanceMetrics.averageChunkTime.toFixed(2)}ms
              </span>
            </div>
            <div class="flex justify-between">
              <span>分片上传次数:</span>
              <span class="font-semibold">{props.performanceMetrics.chunkUploadTimes.length}</span>
            </div>
            {props.performanceMetrics.memoryUsage && (
              <div class="flex justify-between">
                <span>内存使用:</span>
                <span class="font-semibold">
                  {props.formatFileSize(props.performanceMetrics.memoryUsage.used)} /{' '}
                  {props.formatFileSize(props.performanceMetrics.memoryUsage.total)}
                </span>
              </div>
            )}
          </div>
        </NCard>
        <NCard title="性能报告">
          <NCode code={JSON.stringify(props.performanceReport, null, 2)} language="json" />
        </NCard>
      </div>
    );
  }
});
