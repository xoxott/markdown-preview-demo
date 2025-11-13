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
    const { darkMode, themeVars, errorStyle, containerBgStyle } = useMarkdownTheme();
    const chartRef = ref<HTMLDivElement | null>(null);
    let chartInstance: echarts.ECharts | null = null;
    const errorMessage = ref<string | null>(null);

    // 自定义 ECharts 主题配置（适配 Naive UI 主题）
    const customTheme = computed(() => ({
      backgroundColor: 'transparent',
      textStyle: {
        color: themeVars.value.textColor2
      },
      title: {
        textStyle: {
          color: themeVars.value.textColor1
        },
        subtextStyle: {
          color: themeVars.value.textColor3
        }
      },
      line: {
        itemStyle: {
          borderWidth: 1
        },
        lineStyle: {
          width: 2
        },
        symbolSize: 4,
        symbol: 'circle',
        smooth: false
      },
      radar: {
        itemStyle: {
          borderWidth: 1
        },
        lineStyle: {
          width: 2
        },
        symbolSize: 4,
        symbol: 'circle',
        smooth: false
      },
      bar: {
        itemStyle: {
          barBorderWidth: 0,
          barBorderColor: themeVars.value.borderColor
        }
      },
      pie: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        }
      },
      scatter: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        }
      },
      boxplot: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        }
      },
      parallel: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        }
      },
      sankey: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        }
      },
      funnel: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        }
      },
      gauge: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        }
      },
      candlestick: {
        itemStyle: {
          color: '#eb5454',
          color0: '#47b262',
          borderColor: '#eb5454',
          borderColor0: '#47b262',
          borderWidth: 1
        }
      },
      graph: {
        itemStyle: {
          borderWidth: 0,
          borderColor: themeVars.value.borderColor
        },
        lineStyle: {
          width: 1,
          color: themeVars.value.dividerColor
        },
        symbolSize: 4,
        symbol: 'circle',
        smooth: false,
        color: [
          themeVars.value.primaryColor,
          themeVars.value.successColor,
          themeVars.value.warningColor,
          themeVars.value.errorColor,
          themeVars.value.infoColor
        ],
        label: {
          color: themeVars.value.textColor2
        }
      },
      map: {
        itemStyle: {
          areaColor: themeVars.value.cardColor,
          borderColor: themeVars.value.borderColor,
          borderWidth: 0.5
        },
        label: {
          color: themeVars.value.textColor2
        },
        emphasis: {
          itemStyle: {
            areaColor: themeVars.value.primaryColorHover,
            borderColor: themeVars.value.primaryColor,
            borderWidth: 1
          },
          label: {
            color: themeVars.value.textColor1
          }
        }
      },
      geo: {
        itemStyle: {
          areaColor: themeVars.value.cardColor,
          borderColor: themeVars.value.borderColor,
          borderWidth: 0.5
        },
        label: {
          color: themeVars.value.textColor2
        },
        emphasis: {
          itemStyle: {
            areaColor: themeVars.value.primaryColorHover,
            borderColor: themeVars.value.primaryColor,
            borderWidth: 1
          },
          label: {
            color: themeVars.value.textColor1
          }
        }
      },
      categoryAxis: {
        axisLine: {
          show: true,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisLabel: {
          show: true,
          color: themeVars.value.textColor3
        },
        splitLine: {
          show: false,
          lineStyle: {
            color: [themeVars.value.dividerColor]
          }
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [themeVars.value.cardColor]
          }
        }
      },
      valueAxis: {
        axisLine: {
          show: false,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisTick: {
          show: false,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisLabel: {
          show: true,
          color: themeVars.value.textColor3
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: [themeVars.value.dividerColor]
          }
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [themeVars.value.cardColor]
          }
        }
      },
      logAxis: {
        axisLine: {
          show: false,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisTick: {
          show: false,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisLabel: {
          show: true,
          color: themeVars.value.textColor3
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: [themeVars.value.dividerColor]
          }
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [themeVars.value.cardColor]
          }
        }
      },
      timeAxis: {
        axisLine: {
          show: true,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: themeVars.value.dividerColor
          }
        },
        axisLabel: {
          show: true,
          color: themeVars.value.textColor3
        },
        splitLine: {
          show: false,
          lineStyle: {
            color: [themeVars.value.dividerColor]
          }
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [themeVars.value.cardColor]
          }
        }
      },
      toolbox: {
        iconStyle: {
          borderColor: themeVars.value.textColor3
        },
        emphasis: {
          iconStyle: {
            borderColor: themeVars.value.textColor1
          }
        }
      },
      legend: {
        textStyle: {
          color: themeVars.value.textColor2
        }
      },
      tooltip: {
        backgroundColor: themeVars.value.popoverColor,
        borderColor: themeVars.value.borderColor,
        borderWidth: 1,
        textStyle: {
          color: themeVars.value.textColor2
        },
        axisPointer: {
          lineStyle: {
            color: themeVars.value.dividerColor,
            width: 1
          },
          crossStyle: {
            color: themeVars.value.dividerColor,
            width: 1
          }
        }
      },
      timeline: {
        lineStyle: {
          color: themeVars.value.dividerColor,
          width: 1
        },
        itemStyle: {
          color: themeVars.value.primaryColor,
          borderWidth: 1
        },
        controlStyle: {
          color: themeVars.value.primaryColor,
          borderColor: themeVars.value.primaryColor,
          borderWidth: 0.5
        },
        checkpointStyle: {
          color: themeVars.value.primaryColor,
          borderColor: themeVars.value.primaryColorHover
        },
        label: {
          color: themeVars.value.textColor2
        },
        emphasis: {
          itemStyle: {
            color: themeVars.value.primaryColorHover
          },
          controlStyle: {
            color: themeVars.value.primaryColor,
            borderColor: themeVars.value.primaryColor,
            borderWidth: 0.5
          },
          label: {
            color: themeVars.value.textColor1
          }
        }
      },
      visualMap: {
        textStyle: {
          color: themeVars.value.textColor2
        }
      },
      dataZoom: {
        backgroundColor: themeVars.value.cardColor,
        dataBackgroundColor: themeVars.value.dividerColor,
        fillerColor: themeVars.value.primaryColorSuppl,
        handleColor: themeVars.value.primaryColor,
        handleSize: '100%',
        textStyle: {
          color: themeVars.value.textColor2
        }
      },
      markPoint: {
        label: {
          color: themeVars.value.textColor2
        },
        emphasis: {
          label: {
            color: themeVars.value.textColor1
          }
        }
      }
    }));

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

        // 创建新图表实例（不使用内置主题）
        chartInstance = echarts.init(chartRef.value);

        // 合并自定义主题和用户配置
        const mergedOption = {
          ...customTheme.value,
          ...option
        } as EChartsOption;

        chartInstance.setOption(mergedOption);

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
      <NCard
        bordered={props.bordered}
        class={`mb-2 mt-4 ${darkMode.value ? 'color-mode-dark' : 'color-mode-light'}`}
      >
        <div class="relative" style={containerBgStyle.value}>
          <div
            ref={chartRef}
            style={{
              height: chartHeight.value,
              minHeight: '300px',
              width: '100%',
              transition: 'all 0.3s ease-in-out'
            }}
          />
          {errorMessage.value && (
            <div
              class="absolute inset-0 flex items-center justify-center gap-2 p-4 rounded border"
              style={errorStyle.value}
            >
              <span class="shrink-0">❌</span>
              <span class="flex-1 leading-relaxed">{errorMessage.value}</span>
            </div>
          )}
        </div>
      </NCard>
    );
  }
});
