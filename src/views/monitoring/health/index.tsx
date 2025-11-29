import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { NCard, NGrid, NGi, NButton, NSpace, NAlert, NSpin, NDescriptions, NDescriptionsItem } from 'naive-ui';
import { useRouterPush } from '@/hooks/common/router';
import type { RouteKey } from '@elegant-router/types';
import { $t } from '@/locales';
import { fetchHealthCheck, fetchLiveness, fetchReadiness } from '@/service/api/health';

interface HealthCheckData {
  status: 'ok' | 'error';
  timestamp: string;
  data: any;
}

export default defineComponent({
  name: 'HealthCheckDetail',
  setup() {
    const { routerPushByKey } = useRouterPush();

    // Health check data
    const healthCheck = ref<HealthCheckData | null>(null);
    const liveness = ref<HealthCheckData | null>(null);
    const readiness = ref<HealthCheckData | null>(null);

    const loading = ref(false);
    const error = ref<string | null>(null);

    // Auto refresh
    const autoRefreshEnabled = ref(true);
    const refreshInterval = ref(30); // seconds
    let refreshTimer: number | null = null;
    const lastUpdateTime = ref<Date | null>(null);

    // Fetch health data
    const fetchHealthData = async () => {
      try {
        loading.value = true;
        error.value = null;

        const [healthResult, livenessResult, readinessResult] = await Promise.allSettled([
          fetchHealthCheck(),
          fetchLiveness(),
          fetchReadiness()
        ]);

        // Process health check
        if (healthResult.status === 'fulfilled' && !healthResult.value.error) {
          healthCheck.value = {
            status: healthResult.value.data?.status === 'ok' ? 'ok' : 'error',
            timestamp: healthResult.value.data?.timestamp || new Date().toISOString(),
            data: healthResult.value.data
          };
        } else {
          healthCheck.value = {
            status: 'error',
            timestamp: new Date().toISOString(),
            data: null
          };
        }

        // Process liveness
        if (livenessResult.status === 'fulfilled' && !livenessResult.value.error) {
          liveness.value = {
            status: livenessResult.value.data?.status === 'ok' ? 'ok' : 'error',
            timestamp: livenessResult.value.data?.timestamp || new Date().toISOString(),
            data: livenessResult.value.data
          };
        } else {
          liveness.value = {
            status: 'error',
            timestamp: new Date().toISOString(),
            data: null
          };
        }

        // Process readiness
        if (readinessResult.status === 'fulfilled' && !readinessResult.value.error) {
          readiness.value = {
            status: readinessResult.value.data?.status === 'ok' ? 'ok' : 'error',
            timestamp: readinessResult.value.data?.timestamp || new Date().toISOString(),
            data: readinessResult.value.data
          };
        } else {
          readiness.value = {
            status: 'error',
            timestamp: new Date().toISOString(),
            data: null
          };
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch health check data';
        window.$message?.error(error.value);
      } finally {
        loading.value = false;
        lastUpdateTime.value = new Date();
      }
    };

    // Start auto refresh
    const startAutoRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      if (autoRefreshEnabled.value) {
        refreshTimer = window.setInterval(() => {
          fetchHealthData();
        }, refreshInterval.value * 1000);
      }
    };

    // Stop auto refresh
    const stopAutoRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    };

    // Toggle auto refresh
    const toggleAutoRefresh = () => {
      autoRefreshEnabled.value = !autoRefreshEnabled.value;
      if (autoRefreshEnabled.value) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    };

    // Manual refresh
    const handleRefresh = () => {
      fetchHealthData();
    };

    const lastUpdateTimeStr = computed(() => {
      if (!lastUpdateTime.value) return '-';
      return lastUpdateTime.value.toLocaleTimeString();
    });

    const formatTimestamp = (timestamp: string) => {
      try {
        return new Date(timestamp).toLocaleString();
      } catch {
        return timestamp;
      }
    };

    // Lifecycle
    onMounted(() => {
      fetchHealthData();
      startAutoRefresh();
    });

    onBeforeUnmount(() => {
      stopAutoRefresh();
    });

    return () => (
      <NSpace vertical size={16}>
        {/* Header */}
        <NCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>健康检查详情</h2>
            <NSpace>
              <span style={{ fontSize: '14px', color: '#666' }}>
                最后更新: {lastUpdateTimeStr.value}
              </span>
              <NButton onClick={handleRefresh} loading={loading.value}>
                {$t('common.refresh')}
              </NButton>
              <NButton
                type={autoRefreshEnabled.value ? 'primary' : 'default'}
                onClick={toggleAutoRefresh}
              >
                {autoRefreshEnabled.value ? '停止自动刷新' : '开启自动刷新'}
              </NButton>
              <NButton onClick={() => routerPushByKey('monitoring' as RouteKey)}>
                返回仪表盘
              </NButton>
            </NSpace>
          </div>
        </NCard>

        {/* Error alert */}
        {error.value && (
          <NAlert type="error" title="错误">
            {error.value}
          </NAlert>
        )}

        {/* Health check cards */}
        <NSpin show={loading.value}>
          <NGrid cols="s:1 m:1 l:3" responsive="screen" xGap={16} yGap={16}>
            {/* Health Check */}
            <NGi>
              <NCard title="应用健康状态" size="small">
                {healthCheck.value ? (
                  <NSpace vertical size={12}>
                    <NAlert type={healthCheck.value.status === 'ok' ? 'success' : 'error'}>
                      {healthCheck.value.status === 'ok' ? '正常' : '异常'}
                    </NAlert>
                    <NDescriptions bordered size="small" column={1}>
                      <NDescriptionsItem label="状态">
                        {healthCheck.value.status === 'ok' ? '正常' : '异常'}
                      </NDescriptionsItem>
                      <NDescriptionsItem label="检查时间">
                        {formatTimestamp(healthCheck.value.timestamp)}
                      </NDescriptionsItem>
                    </NDescriptions>
                    {healthCheck.value.data && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <pre style={{ margin: 0, overflow: 'auto' }}>
                          {JSON.stringify(healthCheck.value.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </NSpace>
                ) : (
                  <span>加载中...</span>
                )}
              </NCard>
            </NGi>

            {/* Liveness */}
            <NGi>
              <NCard title="存活探针 (Liveness)" size="small">
                {liveness.value ? (
                  <NSpace vertical size={12}>
                    <NAlert type={liveness.value.status === 'ok' ? 'success' : 'error'}>
                      {liveness.value.status === 'ok' ? '正常' : '异常'}
                    </NAlert>
                    <NDescriptions bordered size="small" column={1}>
                      <NDescriptionsItem label="状态">
                        {liveness.value.status === 'ok' ? '正常' : '异常'}
                      </NDescriptionsItem>
                      <NDescriptionsItem label="检查时间">
                        {formatTimestamp(liveness.value.timestamp)}
                      </NDescriptionsItem>
                    </NDescriptions>
                    {liveness.value.data && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <pre style={{ margin: 0, overflow: 'auto' }}>
                          {JSON.stringify(liveness.value.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </NSpace>
                ) : (
                  <span>加载中...</span>
                )}
              </NCard>
            </NGi>

            {/* Readiness */}
            <NGi>
              <NCard title="就绪探针 (Readiness)" size="small">
                {readiness.value ? (
                  <NSpace vertical size={12}>
                    <NAlert type={readiness.value.status === 'ok' ? 'success' : 'error'}>
                      {readiness.value.status === 'ok' ? '正常' : '异常'}
                    </NAlert>
                    <NDescriptions bordered size="small" column={1}>
                      <NDescriptionsItem label="状态">
                        {readiness.value.status === 'ok' ? '正常' : '异常'}
                      </NDescriptionsItem>
                      <NDescriptionsItem label="检查时间">
                        {formatTimestamp(readiness.value.timestamp)}
                      </NDescriptionsItem>
                    </NDescriptions>
                    {readiness.value.data && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <pre style={{ margin: 0, overflow: 'auto' }}>
                          {JSON.stringify(readiness.value.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </NSpace>
                ) : (
                  <span>加载中...</span>
                )}
              </NCard>
            </NGi>
          </NGrid>
        </NSpin>
      </NSpace>
    );
  }
});

