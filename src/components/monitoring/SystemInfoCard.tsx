import { defineComponent, PropType } from 'vue';
import { NCard, NDescriptions, NDescriptionsItem } from 'naive-ui';
import { formatUptime } from '@/utils/monitoring';

interface OSInfo {
  platform?: string;
  type?: string;
  release?: string;
  arch?: string;
  hostname?: string;
  uptime?: number;
}

export default defineComponent({
  name: 'SystemInfoCard',
  props: {
    title: {
      type: String,
      default: '系统信息'
    },
    os: {
      type: Object as PropType<OSInfo | null>,
      default: null
    }
  },
  setup(props) {
    return () => {
      if (!props.os) return null;

      return (
        <NCard title={props.title} style={{ height: '100%' }}>
          <NDescriptions bordered size="small" column={1}>
            {props.os.platform && (
              <NDescriptionsItem label="平台">
                {props.os.platform}
              </NDescriptionsItem>
            )}
            {props.os.type && (
              <NDescriptionsItem label="类型">
                {props.os.type}
              </NDescriptionsItem>
            )}
            {props.os.release && (
              <NDescriptionsItem label="版本">
                {props.os.release}
              </NDescriptionsItem>
            )}
            {props.os.arch && (
              <NDescriptionsItem label="架构">
                {props.os.arch}
              </NDescriptionsItem>
            )}
            {props.os.hostname && (
              <NDescriptionsItem label="主机名">
                {props.os.hostname}
              </NDescriptionsItem>
            )}
            {props.os.uptime !== undefined && (
              <NDescriptionsItem label="运行时间">
                {formatUptime(props.os.uptime)}
              </NDescriptionsItem>
            )}
          </NDescriptions>
        </NCard>
      );
    };
  }
});

