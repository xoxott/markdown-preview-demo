import { type PropType, computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NCard } from 'naive-ui';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import type { CodeBlockMeta } from '../plugins/types';

// 注册 ECharts 组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
  CanvasRenderer
]);

export interface EchartsRendererProps {
  /** 代码块元数据（可选，用于 Markdown 集成） */
  meta?: CodeBlockMeta;
  /** 直接传入的 ECharts 配置（独立使用时） */
  option?: EChartsOption | string;
  /** 图表高度 */
  height?: string | number;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否自动调整大小 */
  autoResize?: boolean;
}

/** ECharts 图表渲染器 支持独立使用或通过 Markdown 集成使用 */
export const EchartsRenderer = defineComponent({
  name: 'EchartsRenderer',
  props: {
    meta: {
      type: Object as PropType<CodeBlockMeta>,
      default: undefined
    },
    option: {
      type: [Object, String] as PropType<EChartsOption | string>,
      default: undefined
    },
    height: {
      type: [String, Number],
      default: 300
    },
    bordered: {
      type: Boolean,
      default: true
    },
    autoResize: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const { darkMode } = useMarkdownTheme();
    const chartRef = ref<HTMLDivElement | null>(null);
    let chartInstance: echarts.ECharts | null = null;
    const errorMessage = ref<string | null>(null);

    // 计算图表配置
    const chartOption = computed(() => {
      if (props.option) {
        return typeof props.option === 'string' ? props.option : JSON.stringify(props.option);
      }
      return props.meta?.content || '';
    });

    // 计算图表高度
    const chartHeight = computed(() => {
      if (typeof props.height === 'number') {
        return `${props.height}px`;
      }
      return props.height;
    });

    // 初始化/更新图表
    const renderChart = async () => {
      errorMessage.value = null;

      await nextTick();

      if (!chartRef.value) return;

      try {
        const option = JSON.parse(chartOption.value) as EChartsOption;

        // 销毁旧图表防止重复绑定
        if (chartInstance) {
          chartInstance.dispose();
        }

        // 创建新图表实例
        chartInstance = echarts.init(chartRef.value, darkMode.value ? 'dark' : 'light');

        chartInstance.setOption(option);

        // 监听容器大小变化自动 resize
        if (props.autoResize) {
          window.addEventListener('resize', resizeChart);
        }
      } catch (err) {
        errorMessage.value = `ECharts 配置解析失败: ${(err as Error).message}`;
        console.error('ECharts render error:', err);
      }
    };

    // 响应容器尺寸变化
    const resizeChart = () => {
      if (chartInstance) {
        chartInstance.resize();
      }
    };

    // 监听配置变化
    watch(chartOption, renderChart, { immediate: true });

    // 监听主题变化
    watch(darkMode, renderChart);

    onMounted(() => {
      renderChart();
    });

    onBeforeUnmount(() => {
      if (chartInstance) {
        chartInstance.dispose();
        chartInstance = null;
      }
      if (props.autoResize) {
        window.removeEventListener('resize', resizeChart);
      }
    });

    return () => (
      <NCard bordered={props.bordered} class="mb-2 mt-4">
        <div
          ref={chartRef}
          class="echarts-container"
          style={{
            height: chartHeight.value,
            minHeight: '300px',
            width: '100%',
            transition: 'all 0.3s ease-in-out'
          }}
        />
        {errorMessage.value && <div class="error-overlay">{errorMessage.value}</div>}
      </NCard>
    );
  }
});

// 添加样式
const style = document.createElement('style');
style.textContent = `
.echarts-container {
  position: relative;
}

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  background-color: #fef2f2;
  padding: 1rem;
  color: #dc2626;
  font-family: monospace;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('echarts-renderer-styles')) {
  style.id = 'echarts-renderer-styles';
  document.head.appendChild(style);
}
