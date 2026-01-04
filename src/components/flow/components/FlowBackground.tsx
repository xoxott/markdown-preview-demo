/**
 * Flow 网格背景组件
 *
 * 提供网格背景渲染，支持多种网格类型
 */

import { defineComponent, computed, type PropType, CSSProperties } from 'vue';
import { getConditionalGpuAccelerationStyle } from '../utils/style-utils';
import { GRID_CONSTANTS } from '../constants/grid-constants';
import { generateGridPattern } from './background/GridPatternGenerator';
import type { FlowGridType, FlowViewport } from '../types';

/**
 * FlowBackground 组件属性
 */
export interface FlowBackgroundProps {
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 网格类型 */
  gridType?: FlowGridType;
  /** 网格大小（像素） */
  gridSize?: number;
  /** 网格颜色 */
  gridColor?: string;
  /** 网格透明度 */
  gridOpacity?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 视口状态 */
  viewport?: FlowViewport;
  /** 实例 ID（用于生成唯一的 SVG ID） */
  instanceId?: string;
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
}

/**
 * Flow 网格背景组件
 */
export default defineComponent({
  name: 'FlowBackground',
  props: {
    showGrid: {
      type: Boolean,
      default: true
    },
    gridType: {
      type: String as PropType<FlowGridType>,
      default: 'dots'
    },
    gridSize: {
      type: Number,
      default: GRID_CONSTANTS.DEFAULT_GRID_SIZE
    },
    gridColor: {
      type: String,
      default: GRID_CONSTANTS.DEFAULT_GRID_COLOR
    },
    gridOpacity: {
      type: Number,
      default: GRID_CONSTANTS.DEFAULT_GRID_OPACITY
    },
    backgroundColor: {
      type: String,
      default: GRID_CONSTANTS.DEFAULT_BACKGROUND_COLOR
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    instanceId: {
      type: String,
      default: 'default'
    },
    style: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    class: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const idPrefix = computed(() => `flow-grid-${props.instanceId}`);
    // 计算网格样式
    const gridStyle = computed(() => {
      if (!props.showGrid || props.gridType === 'none')  return { display: 'none' };

      return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: GRID_CONSTANTS.GRID_Z_INDEX
      };
    });

    // 计算背景样式
    const backgroundStyle = computed(() => ({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: props.backgroundColor,
        ...props.style
    }));

    // 计算网格图案大小（根据缩放动态调整）
    const patternSize = computed(() => props.gridSize * props.viewport.zoom);

    /**
     * 计算网格图案的偏移（使用取模运算实现连续滚动）
     */
    const patternX = computed(() => {
      const size = patternSize.value;
      if (size <= 0) return 0;
      const mod = props.viewport.x % size;
      return mod < 0 ? mod + size : mod;
    });

    const patternY = computed(() => {
      const size = patternSize.value;
      if (size <= 0) return 0;
      const mod = props.viewport.y % size;
      return mod < 0 ? mod + size : mod;
    });

    /**
     * 判断是否需要 GPU 加速优化
     */
    const shouldOptimize = computed(() => {
      return props.viewport.zoom > GRID_CONSTANTS.GPU_ACCELERATION_ZOOM_THRESHOLD ||
             props.viewport.x !== 0 ||
             props.viewport.y !== 0;
    });

    /**
     * 计算 SVG 容器样式（条件性应用 GPU 加速）
     */
    const svgContainerStyle = computed(() => {
      return {
        ...gridStyle.value as CSSProperties,
        ...getConditionalGpuAccelerationStyle(shouldOptimize.value, {
          includeBackfaceVisibility: false // SVG 中效果有限
        })
      };
    });

    /**
     * 检查是否应该显示网格
     */
    const shouldShowGrid = computed(() => {
      return props.showGrid && props.gridType !== 'none';
    });

    /**
     * 计算网格图案中心位置
     */
    const patternCenter = computed(() => {
      return patternSize.value * GRID_CONSTANTS.PATTERN_CENTER_RATIO;
    });

    /**
     * 计算网格图案（使用策略模式，支持扩展）
     */
    const gridPatternResult = computed(() => {
      if (!shouldShowGrid.value) {
        return null;
      }

      return generateGridPattern(props.gridType, {
        patternSize: patternSize.value,
        gridColor: props.gridColor,
        gridOpacity: props.gridOpacity,
        zoom: props.viewport.zoom,
        idPrefix: idPrefix.value,
        patternX: patternX.value,
        patternY: patternY.value,
        patternCenter: patternCenter.value
      });
    });



    return () => {
      const result = gridPatternResult.value;
      const prefix = idPrefix.value;

      return (
        <div
          class={`flow-background ${props.class}`}
          style={backgroundStyle.value as CSSProperties}
        >
          {shouldShowGrid.value && result && (
            <svg
              class="flow-grid"
              style={svgContainerStyle.value}
            >
              <defs>
                {result.defs}
                {result.pattern}
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={`url(#${prefix}-${props.gridType})`}
              />
            </svg>
          )}
        </div>
      );
    };
  }
});

