import { defineComponent, ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import {
  NCard,
  NGrid,
  NGi,
  NAlert,
  NSpin,
  NSpace,
  NButton,
  NProgress
} from 'naive-ui';
import { useMonitoringSSE } from '@/hooks/monitoring/useMonitoringSSE';
import {
  MemoryUsageCard,
  CPUUsageCard,
  HealthCheckDrawer,
  SystemMonitoringDrawer
} from '@/components/monitoring';
import { formatUptime, formatTimestamp, getMemoryUsageColor, getCpuUsageColor } from '@/utils/monitoring';

export default defineComponent({
  name: 'MonitoringDashboard',
  setup() {
    // Health check states
    const healthStatus = ref<'ok' | 'error' | 'loading'>('loading');
    const livenessStatus = ref<'ok' | 'error' | 'loading'>('loading');
    const readinessStatus = ref<'ok' | 'error' | 'loading'>('loading');

    // Metrics summary
    const metricsSummary = ref<Api.Monitoring.MetricsSummary | null>(null);
    const systemInfo = ref<Api.System.SystemInfo | null>(null);
    const performanceMetrics = ref<Api.System.PerformanceMetrics | null>(null);

    const loading = ref(false);
    const error = ref<string | null>(null);

    // Drawer states
    const healthDrawerVisible = ref(false);
    const systemDrawerVisible = ref(false);

    // Last update time (for display only, SSE handles real-time updates)
    const lastUpdateTime = ref<Date | null>(null);

    // SSE hook
    const {
      status: sseStatus,
      isConnected,
      isConnecting,
      isReconnecting,
      error: sseError,
      connect: connectSSE,
      disconnect: disconnectSSE,
      onHealth,
      onLiveness,
      onReadiness,
      onMetrics,
      onSystem,
      onPerformance
    } = useMonitoringSSE({
      autoConnect: true,
      autoReconnect: true,
      maxReconnectAttempts: 5
    });

    // Update loading state based on SSE status
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

    // Subscribe to health events
    onHealth((data) => {
      const newStatus = data?.status === 'ok' ? 'ok' : 'error';
      if (healthStatus.value !== newStatus) {
        healthStatus.value = newStatus;
      }
      lastUpdateTime.value = new Date();
    });

    // Subscribe to liveness events
    onLiveness((data) => {
      const newStatus = data?.status === 'ok' ? 'ok' : 'error';
      if (livenessStatus.value !== newStatus) {
        livenessStatus.value = newStatus;
      }
      lastUpdateTime.value = new Date();
    });

    // Subscribe to readiness events
    onReadiness((data) => {
      const newStatus = data?.status === 'ok' ? 'ok' : 'error';
      if (readinessStatus.value !== newStatus) {
        readinessStatus.value = newStatus;
      }
      lastUpdateTime.value = new Date();
    });

    // Subscribe to metrics events
    onMetrics((data) => {
      if (data) {
        metricsSummary.value = data;
        lastUpdateTime.value = new Date();
      }
    });

    // Subscribe to system events
    onSystem((data) => {
      if (data) {
        systemInfo.value = data;
        lastUpdateTime.value = new Date();
      }
    });

    // Subscribe to performance events
    onPerformance((data) => {
      if (data) {
        performanceMetrics.value = data;
        lastUpdateTime.value = new Date();
      }
    });


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
      return lastUpdateTime.value.toLocaleTimeString('zh-CN');
    });

    // Calculate CPU usage percent
    const cpuUsagePercent = computed(() => {
      if (systemInfo.value?.cpu?.usage?.usage) {
        return parseFloat(systemInfo.value.cpu.usage.usage);
      }
      return 0;
    });

    // Calculate memory usage percent
    const memoryUsagePercent = computed(() => {
      if (systemInfo.value?.memory) {
        return parseFloat(systemInfo.value.memory.usagePercent || '0');
      }
      if (metricsSummary.value?.memory?.heapTotal && metricsSummary.value.memory.heapUsed !== undefined) {
        return (metricsSummary.value.memory.heapUsed / metricsSummary.value.memory.heapTotal) * 100;
      }
      return 0;
    });

    // Lifecycle
    onMounted(() => {
      // SSE will auto-connect via hook
    });

    onBeforeUnmount(() => {
      // 显式断开 SSE 连接，避免给服务器造成压力
      disconnectSSE();
    });

    return () => (
      <NSpace vertical size={16}>
        {/* Header - 标准后台管理系统风格 */}
        <NCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>系统监控仪表盘</h2>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                实时监控系统运行状态和性能指标
              </div>
            </div>
            <NSpace>
              <NButton
                type="info"
                onClick={() => { healthDrawerVisible.value = true; }}
                style={{ fontWeight: 500 }}
              >
                健康检查详情
              </NButton>
              <NButton
                type="primary"
                onClick={() => { systemDrawerVisible.value = true; }}
                style={{ fontWeight: 500 }}
              >
                系统监控详情
              </NButton>
              {lastUpdateTimeStr.value && lastUpdateTimeStr.value !== '-' && (
                <span style={{ fontSize: '14px', color: '#666', lineHeight: '32px' }}>
                  最后更新: {lastUpdateTimeStr.value}
                </span>
              )}
            </NSpace>
          </div>
        </NCard>

        {/* Error alert */}
        {error.value && (
          <NAlert type="error" title="错误" closable onClose={() => { error.value = null; }}>
            {error.value}
          </NAlert>
        )}

        {/* 关键指标卡片区 - 4列网格布局 */}
        <NGrid cols="s:2 m:4" responsive="screen" xGap={16} yGap={16}>
          {/* 系统健康状态 */}
          <NGi>
            <NCard>
              <NSpace vertical size={8}>
                <div style={{ fontSize: '14px', color: '#666' }}>系统健康状态</div>
                <NSpin show={overallHealth.value === 'loading'}>
                  {overallHealth.value === 'ok' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#18a058' }} />
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#18a058' }}>正常</span>
                    </div>
                  ) : overallHealth.value === 'error' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d03050' }} />
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#d03050' }}>异常</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '18px', color: '#666' }}>检查中...</span>
                  )}
                </NSpin>
              </NSpace>
            </NCard>
          </NGi>

          {/* CPU 使用率 */}
          <NGi>
            <NCard>
              <NSpace vertical size={8}>
                <div style={{ fontSize: '14px', color: '#666' }}>CPU 使用率</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getCpuUsageColor(cpuUsagePercent.value) }}>
                  {cpuUsagePercent.value.toFixed(2)}%
                </div>
                <NProgress
                  type="line"
                  percentage={cpuUsagePercent.value}
                  color={getCpuUsageColor(cpuUsagePercent.value)}
                  showIndicator={false}
                  height={6}
                />
              </NSpace>
            </NCard>
          </NGi>

          {/* 内存使用率 */}
          <NGi>
            <NCard>
              <NSpace vertical size={8}>
                <div style={{ fontSize: '14px', color: '#666' }}>内存使用率</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getMemoryUsageColor(memoryUsagePercent.value) }}>
                  {memoryUsagePercent.value.toFixed(2)}%
                </div>
                <NProgress
                  type="line"
                  percentage={memoryUsagePercent.value}
                  color={getMemoryUsageColor(memoryUsagePercent.value)}
                  showIndicator={false}
                  height={6}
                />
              </NSpace>
            </NCard>
          </NGi>

          {/* 运行时间 */}
          <NGi>
            <NCard>
              <NSpace vertical size={8}>
                <div style={{ fontSize: '14px', color: '#666' }}>运行时间</div>
                {performanceMetrics.value?.uptime !== undefined ? (
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                    {formatUptime(performanceMetrics.value.uptime)}
                  </div>
                ) : metricsSummary.value?.uptime !== undefined ? (
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                    {formatUptime(metricsSummary.value.uptime)}
                  </div>
                ) : (
                  <span style={{ fontSize: '18px', color: '#666' }}>-</span>
                )}
              </NSpace>
            </NCard>
          </NGi>
        </NGrid>

        {/* 健康检查卡片区 - 3列网格 */}
        <NCard title="健康检查">
          <NGrid cols="s:1 m:3" responsive="screen" xGap={16} yGap={16}>
            <NGi>
              <NCard size="small">
                <NSpace vertical size={12}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>健康检查</div>
                  <NSpin show={healthStatus.value === 'loading'}>
                    {healthStatus.value === 'ok' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#18a058' }} />
                        <span style={{ color: '#18a058', fontWeight: 500 }}>正常</span>
                      </div>
                    ) : healthStatus.value === 'error' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d03050' }} />
                        <span style={{ color: '#d03050', fontWeight: 500 }}>异常</span>
                      </div>
                    ) : (
                      <span style={{ color: '#666' }}>检查中...</span>
                    )}
                  </NSpin>
                </NSpace>
              </NCard>
            </NGi>
            <NGi>
              <NCard size="small">
                <NSpace vertical size={12}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>存活探针</div>
                  <NSpin show={livenessStatus.value === 'loading'}>
                    {livenessStatus.value === 'ok' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#18a058' }} />
                        <span style={{ color: '#18a058', fontWeight: 500 }}>正常</span>
                      </div>
                    ) : livenessStatus.value === 'error' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d03050' }} />
                        <span style={{ color: '#d03050', fontWeight: 500 }}>异常</span>
                      </div>
                    ) : (
                      <span style={{ color: '#666' }}>检查中...</span>
                    )}
                  </NSpin>
                </NSpace>
              </NCard>
            </NGi>
            <NGi>
              <NCard size="small">
                <NSpace vertical size={12}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>就绪探针</div>
                  <NSpin show={readinessStatus.value === 'loading'}>
                    {readinessStatus.value === 'ok' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#18a058' }} />
                        <span style={{ color: '#18a058', fontWeight: 500 }}>正常</span>
                      </div>
                    ) : readinessStatus.value === 'error' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d03050' }} />
                        <span style={{ color: '#d03050', fontWeight: 500 }}>异常</span>
                      </div>
                    ) : (
                      <span style={{ color: '#666' }}>检查中...</span>
                    )}
                  </NSpin>
                </NSpace>
              </NCard>
            </NGi>
          </NGrid>
        </NCard>

        {/* 性能指标区 - 2列布局 */}
        {(metricsSummary.value?.memory || metricsSummary.value?.cpu) && (
          <NGrid cols="s:1 m:2" responsive="screen" xGap={16} yGap={16}>
            {metricsSummary.value.memory && (
              <NGi>
                <MemoryUsageCard
                  title="进程内存使用"
                  memory={metricsSummary.value.memory}
                  showDetails={true}
                />
              </NGi>
            )}
            {metricsSummary.value.cpu && (
              <NGi>
                <CPUUsageCard
                  title="进程 CPU 使用"
                  cpu={metricsSummary.value.cpu}
                  showDetails={true}
                />
              </NGi>
            )}
          </NGrid>
        )}


        {/* Drawers */}
        <HealthCheckDrawer
          show={healthDrawerVisible.value}
          onClose={() => { healthDrawerVisible.value = false; }}
        />
        <SystemMonitoringDrawer
          show={systemDrawerVisible.value}
          onClose={() => { systemDrawerVisible.value = false; }}
        />
      </NSpace>
    );
  }
});
