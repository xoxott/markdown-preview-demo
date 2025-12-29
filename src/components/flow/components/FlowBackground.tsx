/**
 * Flow 网格背景组件
 *
 * 提供网格背景渲染，支持多种网格类型
 */

import { defineComponent, computed, type PropType, CSSProperties } from 'vue';
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
      default: 20
    },
    gridColor: {
      type: String,
      default: '#d1d5db'
    },
    gridOpacity: {
      type: Number,
      default: 0.8
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
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
    // 计算网格样式
    const gridStyle = computed(() => {
      if (!props.showGrid || props.gridType === 'none') {
        return { display: 'none' };
      }

      return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      };
    });

    // 计算背景样式
    const backgroundStyle = computed(() => {
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: props.backgroundColor,
        ...props.style
      };
    });

    // 计算网格图案大小（根据缩放动态调整）
    const patternSize = computed(() => {
      return props.gridSize * props.viewport.zoom;
    });

    // 计算网格图案的偏移（使用取模运算实现连续滚动）
    const patternX = computed(() => {
      return props.viewport.x % patternSize.value;
    });

    const patternY = computed(() => {
      return props.viewport.y % patternSize.value;
    });

    // 计算网格图案（根据缩放动态调整）
    const gridPattern = computed(() => {
      if (!props.showGrid || props.gridType === 'none') {
        return null;
      }

      const zoom = props.viewport.zoom;
      const color = props.gridColor;
      const size = patternSize.value;

      switch (props.gridType) {
        case 'dots':
          return (
            <pattern
              id="flow-grid-dots"
              x={patternX.value}
              y={patternY.value}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={size / 2} cy={size / 2} r={1.5 * zoom} fill={color} opacity={props.gridOpacity} />
            </pattern>
          );

        case 'lines':
          return (
            <pattern
              id="flow-grid-lines"
              x={patternX.value}
              y={patternY.value}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={size}
                stroke={color}
                stroke-width={1 * zoom}
                opacity={props.gridOpacity}
              />
              <line
                x1={0}
                y1={0}
                x2={size}
                y2={0}
                stroke={color}
                stroke-width={1 * zoom}
                opacity={props.gridOpacity}
              />
            </pattern>
          );

        case 'cross':
          return (
            <pattern
              id="flow-grid-cross"
              x={patternX.value}
              y={patternY.value}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              <line
                x1={size / 2}
                y1={0}
                x2={size / 2}
                y2={size}
                stroke={color}
                stroke-width={1 * zoom}
                opacity={props.gridOpacity}
              />
              <line
                x1={0}
                y1={size / 2}
                x2={size}
                y2={size / 2}
                stroke={color}
                stroke-width={1 * zoom}
                opacity={props.gridOpacity}
              />
            </pattern>
          );

        default:
          return null;
      }
    });


    return () => (
      <div
        class={`flow-background ${props.class}`}
        style={backgroundStyle.value as CSSProperties}
      >
        {props.showGrid && props.gridType !== 'none' && gridPattern.value && (
          <svg
            class="flow-grid"
            style={gridStyle.value as CSSProperties}
          >
            <defs>{gridPattern.value}</defs>
            <rect
              width="100%"
              height="100%"
              fill={`url(#flow-grid-${props.gridType})`}
            />
          </svg>
        )}
      </div>
    );
  }
});

