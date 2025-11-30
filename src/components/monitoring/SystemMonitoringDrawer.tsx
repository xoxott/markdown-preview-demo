import { defineComponent, PropType, ref, watch, computed, nextTick, onBeforeUnmount } from 'vue';
import {
  NDrawer,
  NDrawerContent,
  NCard,
  NGrid,
  NGi,
  NAlert,
  NSpin,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  NStatistic
} from 'naive-ui';
import { useMonitoringSSE } from '@/hooks/monitoring/useMonitoringSSE';
import { useEcharts } from '@/hooks/common/echarts';
import {
  MemoryUsageCard,
  CPUUsageCard,
  SystemInfoCard,
  ProcessInfoCard,
  NetworkInfoCard,
  EnvironmentInfoCard
} from './index';
import { formatUptime } from '@/utils/monitoring';
import { fetchEnvironmentInfo } from '@/service/api/system';

export default defineComponent({
  name: 'SystemMonitoringDrawer',
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
    // System data
    const systemInfo = ref<Api.System.SystemInfo | null>(null);
    const performanceMetrics = ref<Api.System.PerformanceMetrics | null>(null);
    const environmentInfo = ref<Api.System.EnvironmentInfo | null>(null);
    const metricsSummary = ref<Api.Monitoring.MetricsSummary | null>(null);

    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdateTime = ref<Date | null>(null);

    // SSE hook (will reuse existing connection from parent)
    const {
      isConnecting,
      isReconnecting,
      error: sseError,
      onSystem,
      onPerformance,
      onMetrics
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

    // Performance chart data
    const chartData = ref<{
      times: string[];
      memory: number[];
      cpu: number[];
    }>({
      times: [],
      memory: [],
      cpu: []
    });

    // Performance chart
    const { domRef: performanceChartRef, updateOptions: updatePerformanceChart } = useEcharts(() => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['内存使用率', 'CPU 使用率'],
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.value.times
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [
        {
          name: '内存使用率',
          type: 'line',
          smooth: true,
          data: chartData.value.memory,
          itemStyle: { color: '#18a058' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 160, 88, 0.3)' },
                { offset: 1, color: 'rgba(24, 160, 88, 0.05)' }
              ]
            }
          }
        },
        {
          name: 'CPU 使用率',
          type: 'line',
          smooth: true,
          data: chartData.value.cpu,
          itemStyle: { color: '#2080f0' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(32, 128, 240, 0.3)' },
                { offset: 1, color: 'rgba(32, 128, 240, 0.05)' }
              ]
            }
          }
        }
      ]
    }));

    // Update chart
    const updateChart = (memoryPercent: number, cpuPercent: number) => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('zh-CN');

      chartData.value.times.push(timeLabel);
      chartData.value.memory.push(memoryPercent);
      chartData.value.cpu.push(cpuPercent);

      if (chartData.value.times.length > 20) {
        chartData.value.times.shift();
        chartData.value.memory.shift();
        chartData.value.cpu.shift();
      }

      updatePerformanceChart((opts) => ({
        ...opts,
        xAxis: { ...opts.xAxis, data: chartData.value.times },
        series: [
          { ...opts.series[0], data: chartData.value.memory },
          { ...opts.series[1], data: chartData.value.cpu }
        ]
      }));
    };

    // Update chart helper
    const updateChartFromData = () => {
      if (performanceMetrics.value?.memory && performanceMetrics.value.memory.heapTotal) {
        const memoryPercent = (performanceMetrics.value.memory.heapUsed / performanceMetrics.value.memory.heapTotal) * 100;
        const cpuPercent = systemInfo.value?.cpu?.usage?.usage
          ? parseFloat(systemInfo.value.cpu.usage.usage)
          : 0;
        updateChart(memoryPercent, cpuPercent);
      }
    };

    // 保存取消订阅的函数
    const unsubscribeFunctions: Array<() => void> = [];

    // Subscribe to system events
    const unsubscribeSystem = onSystem((data) => {
      systemInfo.value = data;
      lastUpdateTime.value = new Date();
      updateChartFromData();
    });
    unsubscribeFunctions.push(unsubscribeSystem);

    // Subscribe to performance events
    const unsubscribePerformance = onPerformance((data) => {
      performanceMetrics.value = data;
      lastUpdateTime.value = new Date();
      updateChartFromData();
    });
    unsubscribeFunctions.push(unsubscribePerformance);

    // Subscribe to metrics events
    const unsubscribeMetrics = onMetrics((data) => {
      metricsSummary.value = data;
      lastUpdateTime.value = new Date();
    });
    unsubscribeFunctions.push(unsubscribeMetrics);

    // 组件卸载时清理订阅
    onBeforeUnmount(() => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctions.length = 0;
    });

    const lastUpdateTimeStr = computed(() => {
      if (!lastUpdateTime.value) return '-';
      return lastUpdateTime.value.toLocaleTimeString('zh-CN');
    });

    // Fetch environment info when drawer opens (not SSE, regular HTTP request)
    watch(() => props.show, async (show) => {
      if (show) {
        // 确保图表容器有尺寸后再渲染
        await nextTick();
        // 等待抽屉动画完成后再初始化图表
        setTimeout(() => {
          if (performanceChartRef.value) {
            const chartElement = performanceChartRef.value;
            // 图表会自动通过 useEcharts 的 watch 触发渲染
            // 如果容器还没有尺寸，强制设置一个最小尺寸
            if (chartElement.offsetWidth === 0 || chartElement.offsetHeight === 0) {
              chartElement.style.minHeight = '350px';
            }
          }
        }, 300);

        // 获取环境信息（HTTP 接口，不是 SSE）
        if (!environmentInfo.value) {
          try {
            const data = await fetchEnvironmentInfo();
            if (data) {
              environmentInfo.value = data;
              lastUpdateTime.value = new Date();
            }
          } catch (err: any) {

          }
        }
      }
    });

    return () => (
      <NDrawer
        show={props.show}
        width="85%"
        placement="right"
        onUpdateShow={(show) => {
          if (!show) {
            props.onClose();
          }
        }}
      >
        <NDrawerContent title="系统监控详情" closable>
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

            <NSpace vertical size={20}>
              <NSpin show={loading.value && !systemInfo.value && !performanceMetrics.value}>
                {/* 性能趋势图 - 全宽显示 */}
                {performanceMetrics.value && (
                  <NCard title="性能趋势图">
                    <div ref={performanceChartRef} style={{ width: '100%', height: '300px', minHeight: '300px' }} />
                  </NCard>
                )}

                {/* 系统资源监控模块 - 3列布局，充分利用空间 */}
                {systemInfo.value && (
                  <NCard title="系统资源监控">
                    <NGrid cols="s:1 m:3" responsive="screen" xGap={12} yGap={12}>
                      {systemInfo.value.cpu && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <CPUUsageCard cpu={systemInfo.value.cpu} />
                          </div>
                        </NGi>
                      )}
                      {systemInfo.value.memory && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <MemoryUsageCard title="系统内存" memory={systemInfo.value.memory} />
                          </div>
                        </NGi>
                      )}
                      {systemInfo.value.process && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <ProcessInfoCard process={systemInfo.value.process} />
                          </div>
                        </NGi>
                      )}
                    </NGrid>
                  </NCard>
                )}

                {/* 进程性能指标模块 - 3列布局 */}
                {performanceMetrics.value && (
                  <NCard title="进程性能指标">
                    <NGrid cols="s:1 m:3" responsive="screen" xGap={12} yGap={12}>
                      {performanceMetrics.value.memory && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <MemoryUsageCard
                              title="进程内存"
                              memory={performanceMetrics.value.memory}
                              showDetails={true}
                            />
                          </div>
                        </NGi>
                      )}
                      {performanceMetrics.value.cpu && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <CPUUsageCard
                              title="进程 CPU"
                              cpu={performanceMetrics.value.cpu}
                              showDetails={true}
                            />
                          </div>
                        </NGi>
                      )}
                      {/* 运行时间和负载合并到一个卡片 */}
                      <NGi>
                        <NCard size="small" style={{ height: '100%' }}>
                          <NSpace vertical size={16}>
                            {performanceMetrics.value.uptime !== undefined && (
                              <div>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>运行时间</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                                  {formatUptime(performanceMetrics.value.uptime)}
                                </div>
                              </div>
                            )}
                            {performanceMetrics.value.loadAverage && performanceMetrics.value.loadAverage.length > 0 && (
                              <div>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>系统负载</div>
                                <NDescriptions bordered size="small" column={1}>
                                  {performanceMetrics.value.loadAverage.map((load, index) => (
                                    <NDescriptionsItem key={index} label={`${index === 0 ? '1分钟' : index === 1 ? '5分钟' : '15分钟'}`}>
                                      <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{load.toFixed(2)}</span>
                                    </NDescriptionsItem>
                                  ))}
                                </NDescriptions>
                              </div>
                            )}
                          </NSpace>
                        </NCard>
                      </NGi>
                    </NGrid>
                  </NCard>
                )}

                {/* 系统信息模块 - 3列布局（系统信息、环境信息、网络信息） */}
                {(systemInfo.value?.os || systemInfo.value?.network || environmentInfo.value) && (
                  <NCard title="系统信息">
                    <NGrid cols="s:1 m:3" responsive="screen" xGap={12} yGap={12}>
                      {systemInfo.value?.os && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <SystemInfoCard os={systemInfo.value.os} />
                          </div>
                        </NGi>
                      )}
                      {environmentInfo.value && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <EnvironmentInfoCard environment={environmentInfo.value} />
                          </div>
                        </NGi>
                      )}
                      {systemInfo.value?.network && (
                        <NGi>
                          <div style={{ height: '100%' }}>
                            <NetworkInfoCard network={systemInfo.value.network} />
                          </div>
                        </NGi>
                      )}
                    </NGrid>
                  </NCard>
                )}
              </NSpin>
            </NSpace>
          </NSpace>
        </NDrawerContent>
      </NDrawer>
    );
  }
});

