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
    // 生成唯一的 ID 前缀，避免多实例冲突
    const idPrefix = computed(() => `flow-grid-${props.instanceId}`);
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

    // 计算网格图案（根据缩放动态调整，使用 <use> 优化）
    const gridPattern = computed(() => {
      if (!props.showGrid || props.gridType === 'none') {
        return null;
      }

      const zoom = props.viewport.zoom;
      const color = props.gridColor;
      const size = patternSize.value;
      const prefix = idPrefix.value;

      switch (props.gridType) {
        case 'dots':
          return (
            <pattern
              id={`${prefix}-dots`}
              x={patternX.value}
              y={patternY.value}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              {/* 使用 <use> 引用共享的圆形定义 */}
              <use href={`#${prefix}-dot-shape`} x={size / 2} y={size / 2} />
            </pattern>
          );

        case 'lines':
          return (
            <pattern
              id={`${prefix}-lines`}
              x={patternX.value}
              y={patternY.value}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              {/* 使用 <use> 引用共享的线条定义 */}
              <use href={`#${prefix}-line-v`} height={size} />
              <use href={`#${prefix}-line-h`} width={size} />
            </pattern>
          );

        case 'cross':
          return (
            <pattern
              id={`${prefix}-cross`}
              x={patternX.value}
              y={patternY.value}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              {/* 使用 <use> 引用共享的十字线定义 */}
              <use href={`#${prefix}-cross-v`} x={size / 2} height={size} />
              <use href={`#${prefix}-cross-h`} y={size / 2} width={size} />
            </pattern>
          );

        default:
          return null;
      }
    });


    return () => {
      const zoom = props.viewport.zoom;
      const color = props.gridColor;
      const prefix = idPrefix.value;

      return (
        <div
          class={`flow-background ${props.class}`}
          style={backgroundStyle.value as CSSProperties}
        >
          {props.showGrid && props.gridType !== 'none' && gridPattern.value && (
            <svg
              class="flow-grid"
              style={{
                ...gridStyle.value as CSSProperties,
                // ✅ GPU 加速优化
                willChange: 'transform',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden' as const
              }}
            >
              <defs>
                {/* ✅ 共享的图形定义（使用 <use> 引用，带唯一 ID） */}
                {props.gridType === 'dots' && (
                  <circle
                    id={`${prefix}-dot-shape`}
                    r={1.5 * zoom}
                    fill={color}
                    opacity={props.gridOpacity}
                  />
                )}
                {props.gridType === 'lines' && (
                  <>
                    <line
                      id={`${prefix}-line-v`}
                      x1={0}
                      y1={0}
                      x2={0}
                      y2="100%"
                      stroke={color}
                      stroke-width={1 * zoom}
                      opacity={props.gridOpacity}
                    />
                    <line
                      id={`${prefix}-line-h`}
                      x1={0}
                      y1={0}
                      x2="100%"
                      y2={0}
                      stroke={color}
                      stroke-width={1 * zoom}
                      opacity={props.gridOpacity}
                    />
                  </>
                )}
                {props.gridType === 'cross' && (
                  <>
                    <line
                      id={`${prefix}-cross-v`}
                      x1={0}
                      y1={0}
                      x2={0}
                      y2="100%"
                      stroke={color}
                      stroke-width={1 * zoom}
                      opacity={props.gridOpacity}
                    />
                    <line
                      id={`${prefix}-cross-h`}
                      x1={0}
                      y1={0}
                      x2="100%"
                      y2={0}
                      stroke={color}
                      stroke-width={1 * zoom}
                      opacity={props.gridOpacity}
                    />
                  </>
                )}
                {gridPattern.value}
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={`url(#${prefix}-${props.gridType})`}
                // ✅ GPU 加速
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
              />
            </svg>
          )}
        </div>
      );
    };
  }
});

