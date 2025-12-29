/**
 * Flow 工具栏组件
 *
 * 提供画布操作工具栏，包括缩放、适应视图等操作
 */

import { defineComponent, computed, type PropType } from 'vue';
import type { FlowViewport } from '../types';

/**
 * FlowToolbar 组件属性
 */
export interface FlowToolbarProps {
  /** 视口状态 */
  viewport: FlowViewport;
  /** 最小缩放 */
  minZoom?: number;
  /** 最大缩放 */
  maxZoom?: number;
  /** 缩放步长 */
  zoomStep?: number;
  /** 工具栏位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 是否显示 */
  visible?: boolean;
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
  /** 缩放变化事件 */
  onZoomChange?: (zoom: number) => void;
  /** 适应视图事件 */
  onFitView?: () => void;
  /** 重置视图事件 */
  onResetView?: () => void;
}

/**
 * Flow 工具栏组件
 */
export default defineComponent({
  name: 'FlowToolbar',
  props: {
    viewport: {
      type: Object as PropType<FlowViewport>,
      required: true
    },
    minZoom: {
      type: Number,
      default: 0.1
    },
    maxZoom: {
      type: Number,
      default: 4
    },
    zoomStep: {
      type: Number,
      default: 0.1
    },
    position: {
      type: String as PropType<'top' | 'bottom' | 'left' | 'right'>,
      default: 'top'
    },
    visible: {
      type: Boolean,
      default: true
    },
    style: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    class: {
      type: String,
      default: ''
    },
    onZoomChange: {
      type: Function as PropType<(zoom: number) => void>,
      default: undefined
    },
    onFitView: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onResetView: {
      type: Function as PropType<() => void>,
      default: undefined
    }
  },
  setup(props) {
    // 计算缩放百分比
    const zoomPercent = computed(() => {
      return Math.round(props.viewport.zoom * 100);
    });

    // 计算工具栏位置样式
    const positionStyle = computed(() => {
      const baseStyle: Record<string, any> = {
        position: 'absolute',
        zIndex: 10,
        display: 'flex',
        gap: '8px',
        padding: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        ...props.style
      };

      switch (props.position) {
        case 'top':
          baseStyle.top = '10px';
          baseStyle.left = '50%';
          baseStyle.transform = 'translateX(-50%)';
          baseStyle.flexDirection = 'row';
          break;
        case 'bottom':
          baseStyle.bottom = '10px';
          baseStyle.left = '50%';
          baseStyle.transform = 'translateX(-50%)';
          baseStyle.flexDirection = 'row';
          break;
        case 'left':
          baseStyle.left = '10px';
          baseStyle.top = '50%';
          baseStyle.transform = 'translateY(-50%)';
          baseStyle.flexDirection = 'column';
          break;
        case 'right':
          baseStyle.right = '10px';
          baseStyle.top = '50%';
          baseStyle.transform = 'translateY(-50%)';
          baseStyle.flexDirection = 'column';
          break;
      }

      return baseStyle;
    });

    // 缩放操作
    const handleZoomIn = () => {
      const newZoom = Math.min(
        props.maxZoom,
        props.viewport.zoom + props.zoomStep
      );
      if (props.onZoomChange) {
        props.onZoomChange(newZoom);
      }
    };

    const handleZoomOut = () => {
      const newZoom = Math.max(
        props.minZoom,
        props.viewport.zoom - props.zoomStep
      );
      if (props.onZoomChange) {
        props.onZoomChange(newZoom);
      }
    };

    const handleResetZoom = () => {
      if (props.onZoomChange) {
        props.onZoomChange(1);
      }
    };

    return () => {
      if (!props.visible) {
        return null;
      }

      return (
        <div
          class={`flow-toolbar ${props.class}`}
          style={positionStyle.value}
        >
          {/* 缩小 */}
          <button
            class="flow-toolbar-button"
            onClick={handleZoomOut}
            disabled={props.viewport.zoom <= props.minZoom}
            style={{
              padding: '4px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: props.viewport.zoom <= props.minZoom ? 'not-allowed' : 'pointer'
            }}
          >
            −
          </button>

          {/* 缩放显示 */}
          <div
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              lineHeight: '20px',
              color: '#64748b'
            }}
          >
            {zoomPercent.value}%
          </div>

          {/* 放大 */}
          <button
            class="flow-toolbar-button"
            onClick={handleZoomIn}
            disabled={props.viewport.zoom >= props.maxZoom}
            style={{
              padding: '4px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: props.viewport.zoom >= props.maxZoom ? 'not-allowed' : 'pointer'
            }}
          >
            +
          </button>

          {/* 适应视图 */}
          {props.onFitView && (
            <button
              class="flow-toolbar-button"
              onClick={props.onFitView}
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                marginLeft: '8px'
              }}
            >
              适应
            </button>
          )}

          {/* 重置视图 */}
          {props.onResetView && (
            <button
              class="flow-toolbar-button"
              onClick={props.onResetView}
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              重置
            </button>
          )}
        </div>
      );
    };
  }
});

