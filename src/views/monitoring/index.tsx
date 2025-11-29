import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { NCard, NGrid, NGi, NButton, NSpace, NAlert, NStatistic, NSpin } from 'naive-ui';
import { useRouterPush } from '@/hooks/common/router';
import type { RouteKey } from '@elegant-router/types';
import { $t } from '@/locales';
import { fetchHealthCheck, fetchLiveness, fetchReadiness } from '@/service/api/health';
import { fetchMetricsSummary } from '@/service/api/monitoring';

export default defineComponent({
  name: 'MonitoringDashboard',
  setup() {
    const { routerPushByKey } = useRouterPush();

    // Health check states
    const healthStatus = ref<'ok' | 'error' | 'loading'>('loading');
    const livenessStatus = ref<'ok' | 'error' | 'loading'>('loading');
    const readinessStatus = ref<'ok' | 'error' | 'loading'>('loading');

    // Metrics summary
    const metricsSummary = ref<Api.Monitoring.MetricsSummary | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Auto refresh
    const autoRefreshEnabled = ref(true);
    const refreshInterval = ref(30); // seconds
    let refreshTimer: number | null = null;
    const lastUpdateTime = ref<Date | null>(null);

    // Fetch health checks
    const fetchHealthData = async () => {
      try {
        loading.value = true;
        error.value = null;

        // Fetch all health checks in parallel
        const [healthResult, livenessResult, readinessResult, metricsResult] = await Promise.allSettled([
          fetchHealthCheck(),
          fetchLiveness(),
          fetchReadiness(),
          fetchMetricsSummary()
        ]);

        // Update health status
        if (healthResult.status === 'fulfilled' && !healthResult.value.error) {
          healthStatus.value = healthResult.value.data?.status === 'ok' ? 'ok' : 'error';
        } else {
          healthStatus.value = 'error';
        }

        // Update liveness status
        if (livenessResult.status === 'fulfilled' && !livenessResult.value.error) {
          livenessStatus.value = livenessResult.value.data?.status === 'ok' ? 'ok' : 'error';
        } else {
          livenessStatus.value = 'error';
        }

        // Update readiness status
        if (readinessResult.status === 'fulfilled' && !readinessResult.value.error) {
          readinessStatus.value = readinessResult.value.data?.status === 'ok' ? 'ok' : 'error';
        } else {
          readinessStatus.value = 'error';
        }

        // Update metrics summary
        if (metricsResult.status === 'fulfilled' && !metricsResult.value.error) {
          metricsSummary.value = metricsResult.value.data;
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch monitoring data';
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

    // Computed values
    const overallHealth = computed(() => {
      if (healthStatus.value === 'loading' || livenessStatus.value === 'loading' || readinessStatus.value === 'loading') {
        return 'loading';
      }
      if (healthStatus.value === 'ok' && livenessStatus.value === 'ok' && readinessStatus.value === 'ok') {
        return 'ok';
      }
      return 'error';
    });

    const lastUpdateTimeStr = computed(() => {
      if (!lastUpdateTime.value) return '-';
      return lastUpdateTime.value.toLocaleTimeString();
    });

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
        {/* Header with refresh controls */}
        <NCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>系统监控仪表盘</h2>
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
            </NSpace>
          </div>
        </NCard>

        {/* Error alert */}
        {error.value && (
          <NAlert type="error" title="错误">
            {error.value}
          </NAlert>
        )}

        {/* Overall health status */}
        <NCard title="总体健康状态">
          <NSpin show={overallHealth.value === 'loading'}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px' }}>
              {overallHealth.value === 'ok' ? (
                <NAlert type="success" title="系统运行正常">
                  所有健康检查通过
                </NAlert>
              ) : overallHealth.value === 'error' ? (
                <NAlert type="error" title="系统异常">
                  部分健康检查失败，请查看详情
                </NAlert>
              ) : (
                <span>加载中...</span>
              )}
            </div>
          </NSpin>
        </NCard>

        {/* Health check cards */}
        <NGrid cols="s:1 m:3" responsive="screen" xGap={16} yGap={16}>
          <NGi>
            <NCard title="健康检查">
              <NSpin show={healthStatus.value === 'loading'}>
                {healthStatus.value === 'ok' ? (
                  <NAlert type="success">正常</NAlert>
                ) : healthStatus.value === 'error' ? (
                  <NAlert type="error">异常</NAlert>
                ) : (
                  <span>检查中...</span>
                )}
              </NSpin>
            </NCard>
          </NGi>
          <NGi>
            <NCard title="存活探针">
              <NSpin show={livenessStatus.value === 'loading'}>
                {livenessStatus.value === 'ok' ? (
                  <NAlert type="success">正常</NAlert>
                ) : livenessStatus.value === 'error' ? (
                  <NAlert type="error">异常</NAlert>
                ) : (
                  <span>检查中...</span>
                )}
              </NSpin>
            </NCard>
          </NGi>
          <NGi>
            <NCard title="就绪探针">
              <NSpin show={readinessStatus.value === 'loading'}>
                {readinessStatus.value === 'ok' ? (
                  <NAlert type="success">正常</NAlert>
                ) : readinessStatus.value === 'error' ? (
                  <NAlert type="error">异常</NAlert>
                ) : (
                  <span>检查中...</span>
                )}
              </NSpin>
            </NCard>
          </NGi>
        </NGrid>

        {/* Metrics summary */}
        {metricsSummary.value && (
          <NGrid cols="s:2 m:4" responsive="screen" xGap={16} yGap={16}>
            {metricsSummary.value.totalRequests !== undefined && (
              <NGi>
                <NCard>
                  <NStatistic label="总请求数" value={metricsSummary.value.totalRequests} />
                </NCard>
              </NGi>
            )}
            {metricsSummary.value.activeConnections !== undefined && (
              <NGi>
                <NCard>
                  <NStatistic label="活跃连接" value={metricsSummary.value.activeConnections} />
                </NCard>
              </NGi>
            )}
            {metricsSummary.value.requestRate !== undefined && (
              <NGi>
                <NCard>
                  <NStatistic
                    label="请求速率"
                    value={`${metricsSummary.value.requestRate} req/s`}
                  />
                </NCard>
              </NGi>
            )}
            {metricsSummary.value.errorRate !== undefined && (
              <NGi>
                <NCard>
                  <NStatistic
                    label="错误率"
                    value={`${metricsSummary.value.errorRate}%`}
                  />
                </NCard>
              </NGi>
            )}
          </NGrid>
        )}

        {/* Quick links */}
        <NCard title="快速链接">
          <NSpace>
            <NButton type="primary" onClick={() => routerPushByKey('monitoring_health' as RouteKey)}>
              健康检查详情
            </NButton>
            <NButton type="primary" onClick={() => routerPushByKey('monitoring_system' as RouteKey)}>
              系统监控详情
            </NButton>
          </NSpace>
        </NCard>
      </NSpace>
    );
  }
});

