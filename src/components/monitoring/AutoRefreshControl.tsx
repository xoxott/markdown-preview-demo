import { defineComponent, PropType } from 'vue';
import { NButton, NSpace } from 'naive-ui';
import { $t } from '@/locales';

export default defineComponent({
  name: 'AutoRefreshControl',
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    autoRefreshEnabled: {
      type: Boolean,
      default: false
    },
    lastUpdateTime: {
      type: String,
      default: ''
    },
    onRefresh: {
      type: Function as PropType<() => void>,
      required: true
    },
    onToggleAutoRefresh: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <NSpace>
        {props.lastUpdateTime && (
          <span style={{ fontSize: '14px', color: '#666', lineHeight: '32px' }}>
            最后更新: {props.lastUpdateTime}
          </span>
        )}
        <NButton onClick={props.onRefresh} loading={props.loading}>
          {$t('common.refresh')}
        </NButton>
        <NButton
          type={props.autoRefreshEnabled ? 'primary' : 'default'}
          onClick={props.onToggleAutoRefresh}
        >
          {props.autoRefreshEnabled ? '停止自动刷新' : '开启自动刷新'}
        </NButton>
      </NSpace>
    );
  }
});

