import { defineComponent, PropType, computed } from 'vue';
import { NCard, NProgress, NDescriptions, NDescriptionsItem, NStatistic, NSpace } from 'naive-ui';
import { formatCpuTime, getCpuUsageColor } from '@/utils/monitoring';

interface CPUData {
  usage?: {
    usage: string;
    idle: number;
    total: number;
  };
  user?: number;
  system?: number;
  model?: string;
  cores?: number;
  speed?: number;
}

export default defineComponent({
  name: 'CPUUsageCard',
  props: {
    title: {
      type: String,
      default: 'CPU 使用'
    },
    cpu: {
      type: Object as PropType<CPUData | null>,
      default: null
    },
    showDetails: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const usagePercent = computed(() => {
      if (!props.cpu) return 0;

      if (props.cpu.usage?.usage) {
        return parseFloat(props.cpu.usage.usage);
      }

      return 0;
    });

    const color = computed(() => getCpuUsageColor(usagePercent.value));

    return () => {
      if (!props.cpu) return null;

      const isSystemCPU = props.cpu.usage !== undefined;
      const isProcessCPU = props.cpu.user !== undefined;

      return (
        <NCard title={props.title} style={{ height: '100%' }}>
          <NSpace vertical size={16}>
            {/* 使用率进度条 */}
            {isSystemCPU && (
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
            )}

            {/* 详细信息 */}
            {props.showDetails && (
              <NDescriptions bordered size="small" column={1}>
                {isSystemCPU && (
                  <>
                    {props.cpu.model && (
                      <NDescriptionsItem label="型号">
                        {props.cpu.model}
                      </NDescriptionsItem>
                    )}
                    {props.cpu.cores !== undefined && (
                      <NDescriptionsItem label="核心数">
                        <NStatistic value={props.cpu.cores} />
                      </NDescriptionsItem>
                    )}
                    {props.cpu.speed !== undefined && (
                      <NDescriptionsItem label="频率">
                        <NStatistic value={`${props.cpu.speed} MHz`} />
                      </NDescriptionsItem>
                    )}
                    {props.cpu.usage && (
                      <>
                        <NDescriptionsItem label="空闲时间">
                          <NStatistic value={formatCpuTime(props.cpu.usage.idle)} />
                        </NDescriptionsItem>
                        <NDescriptionsItem label="总时间">
                          <NStatistic value={formatCpuTime(props.cpu.usage.total)} />
                        </NDescriptionsItem>
                      </>
                    )}
                  </>
                )}
                {isProcessCPU && (
                  <>
                    <NDescriptionsItem label="用户时间">
                      <NStatistic value={formatCpuTime(props.cpu.user!)} />
                    </NDescriptionsItem>
                    <NDescriptionsItem label="系统时间">
                      <NStatistic value={formatCpuTime(props.cpu.system!)} />
                    </NDescriptionsItem>
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

