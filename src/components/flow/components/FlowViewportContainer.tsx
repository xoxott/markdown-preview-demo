/**
 * Flow 视口容器组件
 *
 * 提供视口变换（平移和缩放）的容器，用于包裹需要应用视口变换的子组件
 */

import { defineComponent, computed, type PropType, CSSProperties } from 'vue';
import type { FlowViewport } from '../types';
import { performanceMonitor } from '../utils/performance-monitor';

/**
 * FlowViewportContainer 组件属性
 */
export interface FlowViewportContainerProps {
  /** 视口状态 */
  viewport: FlowViewport;
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
}

/**
 * Flow 视口容器组件
 *
 * 使用 CSS transform 应用视口的平移和缩放变换
 */
export default defineComponent({
  name: 'FlowViewportContainer',
  props: {
    viewport: {
      type: Object as PropType<FlowViewport>,
      required: true
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
  setup(props, { slots }) {
    /**
     * 计算容器样式
     *
     * 应用视口的平移和缩放变换
     * 性能优化：
     * 1. 使用 translate3d 替代 translate，触发 GPU 加速
     */
    const transformValue = computed(() => {
      const { x, y, zoom } = props.viewport;
      return `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
    });

    const containerStyle = computed<CSSProperties>(() => {
      const perfStart = performance.now();

      const style = {
        transform: transformValue.value,
        transformOrigin: '0 0',
        position: 'absolute' as const,
        top: 0,
        left: 0,
        zIndex: 1,
        willChange: 'transform',
        ...props.style
      };

      const duration = performance.now() - perfStart;
      performanceMonitor.record('viewportTransform', duration, {
        x: props.viewport.x,
        y: props.viewport.y,
        zoom: props.viewport.zoom
      });
      return style;
    });

    return () => (
      <div
        class={`flow-viewport-container ${props.class}`}
        style={containerStyle.value}
      >
        {slots.default && slots.default()}
      </div>
    );
  }
});

