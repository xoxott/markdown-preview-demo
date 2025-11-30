import { defineComponent, PropType, ref, watch, computed, onBeforeUnmount } from 'vue';
import { NDrawer, NDrawerContent, NCard, NGrid, NGi, NAlert, NSpin, NDescriptions, NDescriptionsItem, NSpace, NCollapse, NCollapseItem } from 'naive-ui';
import { useMonitoringSSE } from '@/hooks/monitoring/useMonitoringSSE';
import { formatTimestamp } from '@/utils/monitoring';

interface HealthCheckData {
  status: 'ok' | 'error';
  timestamp: string;
  data: any;
}

export default defineComponent({
  name: 'HealthCheckDrawer',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props) {
    const healthData = ref<HealthCheckData | null>(null);
    const livenessData = ref<HealthCheckData | null>(null);
    const readinessData = ref<HealthCheckData | null>(null);

    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdateTime = ref<Date | null>(null);

    // SSE hook (will reuse existing connection from parent)
    const {
      isConnecting,
      isReconnecting,
      error: sseError,
      onHealth,
      onLiveness,
      onReadiness
    } = useMonitoringSSE({
      autoConnect: false, // Don't create new connection, reuse existing
      autoReconnect: true,
      maxReconnectAttempts: 5
    });

    // Update loading state
    watch([isConnecting, isReconnecting], ([connecting, reconnecting]) => {
      loading.value = connecting || reconnecting;
    }, { immediate: true });

    // Update error state
    watch(sseError, (err) => {
      if (err) {
        error.value = err.message;
      } else {
        error.value = null;
      }
    });

    // 保存取消订阅的函数
    const unsubscribeFunctions: Array<() => void> = [];

    // Subscribe to health events
    const unsubscribeHealth = onHealth((data) => {
      healthData.value = {
        status: data?.status === 'ok' ? 'ok' : 'error',
        timestamp: data?.timestamp || new Date().toISOString(),
        data: data || {}
      };
      lastUpdateTime.value = new Date();
    });
    unsubscribeFunctions.push(unsubscribeHealth);

    // Subscribe to liveness events
    const unsubscribeLiveness = onLiveness((data) => {
      livenessData.value = {
        status: data?.status === 'ok' ? 'ok' : 'error',
        timestamp: data?.timestamp || new Date().toISOString(),
        data: data || {}
      };
      lastUpdateTime.value = new Date();
    });
    unsubscribeFunctions.push(unsubscribeLiveness);

    // Subscribe to readiness events
    const unsubscribeReadiness = onReadiness((data) => {
      readinessData.value = {
        status: data?.status === 'ok' ? 'ok' : 'error',
        timestamp: data?.timestamp || new Date().toISOString(),
        data: data || {}
      };
      lastUpdateTime.value = new Date();
    });
    unsubscribeFunctions.push(unsubscribeReadiness);

    // 组件卸载时清理订阅
    onBeforeUnmount(() => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctions.length = 0;
    });

    const lastUpdateTimeStr = computed(() => {
      if (!lastUpdateTime.value) return '-';
      return lastUpdateTime.value.toLocaleTimeString('zh-CN');
    });

    // No need to fetch on show, SSE will push data automatically

    const renderHealthCard = (title: string, data: HealthCheckData | null, status: 'ok' | 'error' | 'loading') => {
      // 如果数据还在加载中，显示占位卡片
      if (!data) {
        return (
          <NCard title={title}>
            <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              加载中...
            </div>
          </NCard>
        );
      }

      return (
        <NCard title={title}>
          <NSpace vertical size={16}>
            <NAlert type={status === 'ok' ? 'success' : 'error'}>
              {status === 'ok' ? '正常' : '异常'}
            </NAlert>
            <NDescriptions bordered size="small" column={1}>
              <NDescriptionsItem label="状态">
                {status === 'ok' ? '正常' : '异常'}
              </NDescriptionsItem>
              <NDescriptionsItem label="时间戳">
                {formatTimestamp(data.timestamp)}
              </NDescriptionsItem>
            </NDescriptions>
            {data.data && Object.keys(data.data).length > 0 && (
              <NCollapse>
                <NCollapseItem title="详细信息" name="details">
                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                    <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                      {JSON.stringify(data.data, null, 2)}
                    </pre>
                  </div>
                </NCollapseItem>
              </NCollapse>
            )}
          </NSpace>
        </NCard>
      );
    };

    return () => (
      <NDrawer
        show={props.show}
        width="80%"
        placement="right"
        onUpdateShow={(show) => {
          if (!show) {
            props.onClose();
          }
        }}
      >
        <NDrawerContent title="健康检查详情" closable>
          <NSpace vertical size={20}>
            {/* Last update time */}
            {lastUpdateTimeStr.value && lastUpdateTimeStr.value !== '-' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '14px', color: '#666' }}>
                最后更新: {lastUpdateTimeStr.value}
              </div>
            )}

            {/* Error alert */}
            {error.value && (
              <NAlert type="error" title="错误" closable onClose={() => { error.value = null; }}>
                {error.value}
              </NAlert>
            )}

            {/* Health check cards */}
            <NSpin show={loading.value && !healthData.value && !livenessData.value && !readinessData.value}>
              <NGrid cols="s:1 m:3" responsive="screen" xGap={16} yGap={16}>
                <NGi>
                  {renderHealthCard('健康检查', healthData.value, healthData.value?.status || 'loading')}
                </NGi>
                <NGi>
                  {renderHealthCard('存活探针', livenessData.value, livenessData.value?.status || 'loading')}
                </NGi>
                <NGi>
                  {renderHealthCard('就绪探针', readinessData.value, readinessData.value?.status || 'loading')}
                </NGi>
              </NGrid>
            </NSpin>
          </NSpace>
        </NDrawerContent>
      </NDrawer>
    );
  }
});

