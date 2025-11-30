import { defineComponent, PropType } from 'vue';
import { NCard, NDescriptions, NDescriptionsItem } from 'naive-ui';
import { formatUptime, formatBytes } from '@/utils/monitoring';

interface ProcessInfo {
  pid?: number;
  version?: string;
  uptime?: number;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers?: number;
  };
}

export default defineComponent({
  name: 'ProcessInfoCard',
  props: {
    title: {
      type: String,
      default: '进程信息'
    },
    process: {
      type: Object as PropType<ProcessInfo | null>,
      default: null
    }
  },
  setup(props) {
    return () => {
      if (!props.process) return null;

      return (
        <NCard title={props.title} style={{ height: '100%' }}>
          <NDescriptions bordered size="small" column={1}>
            {props.process.pid !== undefined && (
              <NDescriptionsItem label="进程 ID">
                {props.process.pid}
              </NDescriptionsItem>
            )}
            {props.process.version && (
              <NDescriptionsItem label="版本">
                {props.process.version}
              </NDescriptionsItem>
            )}
            {props.process.uptime !== undefined && (
              <NDescriptionsItem label="运行时间">
                {formatUptime(props.process.uptime)}
              </NDescriptionsItem>
            )}
            {props.process.memoryUsage && (
              <>
                <NDescriptionsItem label="RSS">
                  {formatBytes(props.process.memoryUsage.rss)}
                </NDescriptionsItem>
                <NDescriptionsItem label="堆总计">
                  {formatBytes(props.process.memoryUsage.heapTotal)}
                </NDescriptionsItem>
                <NDescriptionsItem label="堆已使用">
                  {formatBytes(props.process.memoryUsage.heapUsed)}
                </NDescriptionsItem>
                <NDescriptionsItem label="外部">
                  {formatBytes(props.process.memoryUsage.external)}
                </NDescriptionsItem>
                {props.process.memoryUsage.arrayBuffers !== undefined && (
                  <NDescriptionsItem label="Array Buffers">
                    {formatBytes(props.process.memoryUsage.arrayBuffers)}
                  </NDescriptionsItem>
                )}
              </>
            )}
          </NDescriptions>
        </NCard>
      );
    };
  }
});

