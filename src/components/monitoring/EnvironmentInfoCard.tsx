import { defineComponent, PropType } from 'vue';
import { NCard, NDescriptions, NDescriptionsItem } from 'naive-ui';

interface EnvironmentInfo {
  nodeVersion?: string;
  platform?: string;
  arch?: string;
  env?: string;
  cwd?: string;
  execPath?: string;
}

export default defineComponent({
  name: 'EnvironmentInfoCard',
  props: {
    title: {
      type: String,
      default: '环境信息'
    },
    environment: {
      type: Object as PropType<EnvironmentInfo | null>,
      default: null
    }
  },
  setup(props) {
    return () => {
      if (!props.environment) return null;

      return (
        <NCard title={props.title} style={{ height: '100%' }}>
          <NDescriptions bordered size="small" column={1}>
            {props.environment.nodeVersion && (
              <NDescriptionsItem label="Node.js 版本">
                {props.environment.nodeVersion}
              </NDescriptionsItem>
            )}
            {props.environment.platform && (
              <NDescriptionsItem label="平台">
                {props.environment.platform}
              </NDescriptionsItem>
            )}
            {props.environment.arch && (
              <NDescriptionsItem label="架构">
                {props.environment.arch}
              </NDescriptionsItem>
            )}
            {props.environment.env && (
              <NDescriptionsItem label="环境">
                {props.environment.env}
              </NDescriptionsItem>
            )}
            {props.environment.cwd && (
              <NDescriptionsItem label="工作目录">
                <code style={{ fontSize: '12px' }}>{props.environment.cwd}</code>
              </NDescriptionsItem>
            )}
            {props.environment.execPath && (
              <NDescriptionsItem label="执行路径">
                <code style={{ fontSize: '12px' }}>{props.environment.execPath}</code>
              </NDescriptionsItem>
            )}
          </NDescriptions>
        </NCard>
      );
    };
  }
});

