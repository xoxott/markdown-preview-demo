import { defineComponent, PropType, computed } from 'vue';
import { NCard, NProgress, NDescriptions, NDescriptionsItem, NStatistic, NSpace } from 'naive-ui';
import { formatBytes, calculateMemoryUsagePercent, getMemoryUsageColor } from '@/utils/monitoring';

interface MemoryData {
  total?: number;
  used?: number;
  free?: number;
  rss?: number;
  heapTotal?: number;
  heapUsed?: number;
  external?: number;
  arrayBuffers?: number;
  usagePercent?: string;
}

export default defineComponent({
  name: 'MemoryUsageCard',
  props: {
    title: {
      type: String,
      default: '内存使用'
    },
    memory: {
      type: Object as PropType<MemoryData | null>,
      default: null
    },
    showDetails: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const usagePercent = computed(() => {
      if (!props.memory) return 0;

      if (props.memory.usagePercent) {
        return parseFloat(props.memory.usagePercent);
      }

      if (props.memory.total && props.memory.used !== undefined) {
        return calculateMemoryUsagePercent(props.memory.used, props.memory.total);
      }

      if (props.memory.heapTotal && props.memory.heapUsed !== undefined) {
        return calculateMemoryUsagePercent(props.memory.heapUsed, props.memory.heapTotal);
      }

      return 0;
    });

    const color = computed(() => getMemoryUsageColor(usagePercent.value));

    return () => {
      if (!props.memory) return null;

      const isSystemMemory = props.memory.total !== undefined;
      const isProcessMemory = props.memory.heapTotal !== undefined;

      return (
        <NCard title={props.title} style={{ height: '100%' }}>
          <NSpace vertical size={16}>
            {/* 使用率进度条 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>使用率</span>
                <span style={{ color: color.value, fontWeight: 'bold' }}>
                  {usagePercent.value.toFixed(2)}%
                </span>
              </div>
              <NProgress
                type="line"
                percentage={usagePercent.value}
                color={color.value}
                showIndicator={false}
              />
            </div>

            {/* 详细信息 */}
            {props.showDetails && (
              <NDescriptions bordered size="small" column={1}>
                {isSystemMemory && (
                  <>
                    <NDescriptionsItem label="总内存">
                      <NStatistic value={formatBytes(props.memory.total!)} />
                    </NDescriptionsItem>
                    <NDescriptionsItem label="已使用">
                      <NStatistic value={formatBytes(props.memory.used!)} />
                    </NDescriptionsItem>
                    <NDescriptionsItem label="可用">
                      <NStatistic value={formatBytes(props.memory.free!)} />
                    </NDescriptionsItem>
                  </>
                )}
                {isProcessMemory && (
                  <>
                    <NDescriptionsItem label="RSS">
                      <NStatistic value={formatBytes(props.memory.rss!)} />
                    </NDescriptionsItem>
                    <NDescriptionsItem label="堆总计">
                      <NStatistic value={formatBytes(props.memory.heapTotal!)} />
                    </NDescriptionsItem>
                    <NDescriptionsItem label="堆已使用">
                      <NStatistic value={formatBytes(props.memory.heapUsed!)} />
                    </NDescriptionsItem>
                    <NDescriptionsItem label="外部">
                      <NStatistic value={formatBytes(props.memory.external!)} />
                    </NDescriptionsItem>
                    {props.memory.arrayBuffers !== undefined && (
                      <NDescriptionsItem label="Array Buffers">
                        <NStatistic value={formatBytes(props.memory.arrayBuffers)} />
                      </NDescriptionsItem>
                    )}
                  </>
                )}
              </NDescriptions>
            )}
          </NSpace>
        </NCard>
      );
    };
  }
});

