<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { NCard } from 'naive-ui';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { useThemeStore } from '@/store/modules/theme';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer
]);

const props = defineProps<{
  meta: {
    langName: string;
    content: string;
    attrs: Record<string, string>;
    info: string;
    token: any;
  };
}>();

const themeStore = useThemeStore();
const { darkMode } = storeToRefs(themeStore);
const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;
const errorMessage = ref<string | null>(null);

// 初始化图表
const renderChart = async () => {
  errorMessage.value = null;

  await nextTick();

  if (!chartRef.value) return;

  try {
    const option = JSON.parse(props.meta.content) as EChartsOption;

    // 销毁旧图表防止重复绑定
    if (chartInstance) {
      chartInstance.dispose();
    }

    chartInstance = echarts.init(chartRef.value, darkMode.value ? 'dark' : 'light');
    chartInstance.setOption(option);

    // 监听容器大小变化自动 resize
    window.addEventListener('resize', resizeChart);
  } catch (err) {
    errorMessage.value = `ECharts 配置解析失败: ${(err as Error).message}`;
  }
};

// 响应容器尺寸变化
const resizeChart = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

watch(() => props.meta.content, renderChart, { immediate: true });

watch(() => darkMode.value, renderChart);

onMounted(() => {
  renderChart();
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  window.removeEventListener('resize', resizeChart);
});
</script>

<template>
  <NCard :bordered="true" class="mb-2 mt-4">
    <div ref="chartRef" class="h-auto min-h-[300px] w-full transition-all duration-300 ease-in-out" />
    <div
      v-if="errorMessage"
      class="absolute inset-0 flex items-center justify-center border border-red-200 rounded-md bg-red-50 p-4 text-red-600 font-mono"
    >
      {{ errorMessage }}
    </div>
  </NCard>
</template>
