import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue';
import {
  NCard,
  NGrid,
  NGi,
  NButton,
  NSpace,
  NAlert,
  NSpin,
  NDescriptions,
  NDescriptionsItem,
  NProgress,
  NStatistic
} from 'naive-ui';
import { useRouterPush } from '@/hooks/common/router';
import type { RouteKey } from '@elegant-router/types';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { fetchSystemInfo, fetchPerformanceMetrics, fetchEnvironmentInfo } from '@/service/api/system';
import { fetchMetricsSummary } from '@/service/api/monitoring';

export default defineComponent({
  name: 'SystemMonitoringDetail',
  setup() {
    const { routerPushByKey } = useRouterPush();

    // System data
    const systemInfo = ref<Api.System.SystemInfo | null>(null);
    const performanceMetrics = ref<Api.System.PerformanceMetrics | null>(null);
    const environmentInfo = ref<Api.System.EnvironmentInfo | null>(null);
    const metricsSummary = ref<Api.Monitoring.MetricsSummary | null>(null);

    const loading = ref(false);
    const error = ref<string | null>(null);

    // Auto refresh
    const autoRefreshEnabled = ref(true);
    const refreshInterval = ref(30); // seconds
    let refreshTimer: number | null = null;
    const lastUpdateTime = ref<Date | null>(null);

    // Performance chart
    const { domRef: performanceChartRef, updateOptions: updatePerformanceChart } = useEcharts(() => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['CPU使用率', '内存使用率', '磁盘使用率']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [] as string[]
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          name: 'CPU使用率',
          type: 'line',
          smooth: true,
          data: [] as number[]
        },
        {
          name: '内存使用率',
          type: 'line',
          smooth: true,
          data: [] as number[]
        },
        {
          name: '磁盘使用率',
          type: 'line',
          smooth: true,
          data: [] as number[]
        }
      ]
    }));

    // Fetch system data
    const fetchSystemData = async () => {
      try {
        loading.value = true;
        error.value = null;

        const [systemResult, performanceResult, environmentResult, metricsResult] = await Promise.allSettled([
          fetchSystemInfo(),
          fetchPerformanceMetrics(),
          fetchEnvironmentInfo(),
          fetchMetricsSummary()
        ]);

        // Process system info
        if (systemResult.status === 'fulfilled' && !systemResult.value.error) {
          systemInfo.value = systemResult.value.data;
        }

        // Process performance metrics
        if (performanceResult.status === 'fulfilled' && !performanceResult.value.error) {
          performanceMetrics.value = performanceResult.value.data;
          updatePerformanceChart(opts => {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString();

            // Add new data point
            if (!opts.xAxis.data) opts.xAxis.data = [];
            if (!opts.series[0].data) opts.series[0].data = [];
            if (!opts.series[1].data) opts.series[1].data = [];
            if (!opts.series[2].data) opts.series[2].data = [];

            opts.xAxis.data.push(timeLabel);
            opts.series[0].data.push(performanceMetrics.value?.cpu?.usage || 0);
            opts.series[1].data.push(performanceMetrics.value?.memory?.usage || 0);
            opts.series[2].data.push(performanceMetrics.value?.disk?.usage || 0);

            // Keep only last 20 data points
            if (opts.xAxis.data.length > 20) {
              opts.xAxis.data.shift();
              opts.series[0].data.shift();
              opts.series[1].data.shift();
              opts.series[2].data.shift();
            }

            return opts;
          });
        }

        // Process environment info
        if (environmentResult.status === 'fulfilled' && !environmentResult.value.error) {
          environmentInfo.value = environmentResult.value.data;
        }

        // Process metrics summary
        if (metricsResult.status === 'fulfilled' && !metricsResult.value.error) {
          metricsSummary.value = metricsResult.value.data;
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch system data';
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
          fetchSystemData();
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
      fetchSystemData();
    };

    const lastUpdateTimeStr = computed(() => {
      if (!lastUpdateTime.value) return '-';
      return lastUpdateTime.value.toLocaleTimeString();
    });

    const formatBytes = (bytes: number | undefined) => {
      if (!bytes) return '-';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    const formatUptime = (seconds: number | undefined) => {
      if (!seconds) return '-';
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (days > 0) {
        return `${days}天 ${hours}小时 ${minutes}分钟`;
      } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟`;
      }
      return `${minutes}分钟`;
    };

    // Lifecycle
    onMounted(() => {
      fetchSystemData();
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
            <h2 style={{ margin: 0 }}>系统监控详情</h2>
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

        <NSpin show={loading.value}>
          {/* Performance Metrics */}
          {performanceMetrics.value && (
            <NGrid cols="s:1 m:3" responsive="screen" xGap={16} yGap={16}>
              {/* CPU Usage */}
              {performanceMetrics.value.cpu !== undefined && (
                <NGi>
                  <NCard title="CPU使用率">
                    <NSpace vertical size={12}>
                      <NProgress
                        type="line"
                        percentage={performanceMetrics.value.cpu.usage || 0}
                        status={performanceMetrics.value.cpu.usage && performanceMetrics.value.cpu.usage > 80 ? 'error' : undefined}
                      />
                      <NDescriptions bordered size="small" column={1}>
                        <NDescriptionsItem label="使用率">
                          {performanceMetrics.value.cpu.usage?.toFixed(2)}%
                        </NDescriptionsItem>
                        <NDescriptionsItem label="核心数">
                          {performanceMetrics.value.cpu.cores || '-'}
                        </NDescriptionsItem>
                        {performanceMetrics.value.cpu.model && (
                          <NDescriptionsItem label="型号">
                            {performanceMetrics.value.cpu.model}
                          </NDescriptionsItem>
                        )}
                      </NDescriptions>
                    </NSpace>
                  </NCard>
                </NGi>
              )}

              {/* Memory Usage */}
              {performanceMetrics.value.memory !== undefined && (
                <NGi>
                  <NCard title="内存使用">
                    <NSpace vertical size={12}>
                      <NProgress
                        type="line"
                        percentage={performanceMetrics.value.memory.usage || 0}
                        status={performanceMetrics.value.memory.usage && performanceMetrics.value.memory.usage > 80 ? 'error' : undefined}
                      />
                      <NDescriptions bordered size="small" column={1}>
                        <NDescriptionsItem label="使用率">
                          {performanceMetrics.value.memory.usage?.toFixed(2)}%
                        </NDescriptionsItem>
                        <NDescriptionsItem label="已使用">
                          {formatBytes(performanceMetrics.value.memory.used)}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="总容量">
                          {formatBytes(performanceMetrics.value.memory.total)}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="可用">
                          {formatBytes(performanceMetrics.value.memory.free)}
                        </NDescriptionsItem>
                      </NDescriptions>
                    </NSpace>
                  </NCard>
                </NGi>
              )}

              {/* Disk Usage */}
              {performanceMetrics.value.disk !== undefined && (
                <NGi>
                  <NCard title="磁盘使用">
                    <NSpace vertical size={12}>
                      <NProgress
                        type="line"
                        percentage={performanceMetrics.value.disk.usage || 0}
                        status={performanceMetrics.value.disk.usage && performanceMetrics.value.disk.usage > 80 ? 'error' : undefined}
                      />
                      <NDescriptions bordered size="small" column={1}>
                        <NDescriptionsItem label="使用率">
                          {performanceMetrics.value.disk.usage?.toFixed(2)}%
                        </NDescriptionsItem>
                        <NDescriptionsItem label="已使用">
                          {formatBytes(performanceMetrics.value.disk.used)}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="总容量">
                          {formatBytes(performanceMetrics.value.disk.total)}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="可用">
                          {formatBytes(performanceMetrics.value.disk.free)}
                        </NDescriptionsItem>
                        {performanceMetrics.value.disk.path && (
                          <NDescriptionsItem label="路径">
                            {performanceMetrics.value.disk.path}
                          </NDescriptionsItem>
                        )}
                      </NDescriptions>
                    </NSpace>
                  </NCard>
                </NGi>
              )}
            </NGrid>
          )}

          {/* Performance Chart */}
          <NCard title="性能指标趋势">
            <div ref={performanceChartRef} style={{ height: '400px', width: '100%' }} />
          </NCard>

          {/* System Info */}
          {systemInfo.value && (
            <NCard title="系统信息">
              <NDescriptions bordered column={2}>
                {systemInfo.value.os && (
                  <NDescriptionsItem label="操作系统">
                    {systemInfo.value.os}
                  </NDescriptionsItem>
                )}
                {systemInfo.value.version && (
                  <NDescriptionsItem label="系统版本">
                    {systemInfo.value.version}
                  </NDescriptionsItem>
                )}
                {systemInfo.value.nodeVersion && (
                  <NDescriptionsItem label="Node版本">
                    {systemInfo.value.nodeVersion}
                  </NDescriptionsItem>
                )}
                {systemInfo.value.hostname && (
                  <NDescriptionsItem label="主机名">
                    {systemInfo.value.hostname}
                  </NDescriptionsItem>
                )}
                {systemInfo.value.platform && (
                  <NDescriptionsItem label="平台">
                    {systemInfo.value.platform}
                  </NDescriptionsItem>
                )}
                {systemInfo.value.arch && (
                  <NDescriptionsItem label="架构">
                    {systemInfo.value.arch}
                  </NDescriptionsItem>
                )}
                {systemInfo.value.cpuCount !== undefined && (
                  <NDescriptionsItem label="CPU核心数">
                    {systemInfo.value.cpuCount}
                  </NDescriptionsItem>
                )}
                {systemInfo.value.uptime !== undefined && (
                  <NDescriptionsItem label="运行时间">
                    {formatUptime(systemInfo.value.uptime)}
                  </NDescriptionsItem>
                )}
              </NDescriptions>
            </NCard>
          )}

          {/* Environment Info */}
          {environmentInfo.value && (
            <NCard title="环境信息">
              <NDescriptions bordered column={2}>
                {environmentInfo.value.nodeEnv && (
                  <NDescriptionsItem label="运行环境">
                    {environmentInfo.value.nodeEnv}
                  </NDescriptionsItem>
                )}
                {environmentInfo.value.process && (
                  <>
                    <NDescriptionsItem label="进程ID">
                      {environmentInfo.value.process.pid}
                    </NDescriptionsItem>
                    <NDescriptionsItem label="父进程ID">
                      {environmentInfo.value.process.ppid}
                    </NDescriptionsItem>
                    <NDescriptionsItem label="进程标题" span={2}>
                      {environmentInfo.value.process.title}
                    </NDescriptionsItem>
                    <NDescriptionsItem label="执行路径" span={2}>
                      {environmentInfo.value.process.execPath}
                    </NDescriptionsItem>
                  </>
                )}
              </NDescriptions>
              {environmentInfo.value.env && Object.keys(environmentInfo.value.env).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h3>环境变量</h3>
                  <div style={{ fontSize: '12px', color: '#666', overflow: 'auto', maxHeight: '300px' }}>
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify(environmentInfo.value.env, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </NCard>
          )}

          {/* Metrics Summary */}
          {metricsSummary.value && (
            <NCard title="监控指标摘要">
              <NGrid cols="s:2 m:4" responsive="screen" xGap={16} yGap={16}>
                {metricsSummary.value.totalRequests !== undefined && (
                  <NGi>
                    <NStatistic label="总请求数" value={metricsSummary.value.totalRequests} />
                  </NGi>
                )}
                {metricsSummary.value.activeConnections !== undefined && (
                  <NGi>
                    <NStatistic label="活跃连接" value={metricsSummary.value.activeConnections} />
                  </NGi>
                )}
                {metricsSummary.value.requestRate !== undefined && (
                  <NGi>
                    <NStatistic
                      label="请求速率"
                      value={`${metricsSummary.value.requestRate} req/s`}
                    />
                  </NGi>
                )}
                {metricsSummary.value.avgResponseTime !== undefined && (
                  <NGi>
                    <NStatistic
                      label="平均响应时间"
                      value={`${metricsSummary.value.avgResponseTime} ms`}
                    />
                  </NGi>
                )}
              </NGrid>
            </NCard>
          )}
        </NSpin>
      </NSpace>
    );
  }
});

