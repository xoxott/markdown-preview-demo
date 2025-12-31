/**
 * 画布缩放 Hook
 * 
 * 处理画布的滚轮缩放功能
 */

import { type Ref } from 'vue';
import type { FlowConfig, FlowViewport } from '../types';

export interface UseCanvasZoomOptions {
  /** 画布配置 */
  config: Ref<Readonly<FlowConfig>>;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 画布容器引用 */
  canvasRef: Ref<HTMLElement | null>;
  /** 缩放视口的回调 */
  onZoom: (zoom: number, centerX?: number, centerY?: number) => void;
  /** 视口变化事件 */
  onViewportChange?: (viewport: FlowViewport) => void;
}

/**
 * 画布缩放 Hook
 */
export function useCanvasZoom(options: UseCanvasZoomOptions) {
  const { config, canvasRef, onZoom, onViewportChange } = options;

  const handleWheel = (event: WheelEvent) => {
    if (!config.value.canvas?.zoomOnScroll) {
      return;
    }

    event.preventDefault();

    const delta = event.deltaY > 0 ? -1 : 1;
    const zoomStep = config.value.canvas?.zoomStep || 0.1;
    const minZoom = config.value.canvas?.minZoom || 0.1;
    const maxZoom = config.value.canvas?.maxZoom || 4;

    const currentZoom = options.viewport.value.zoom;
    const newZoom = Math.max(
      minZoom,
      Math.min(maxZoom, currentZoom + delta * zoomStep)
    );

    // 获取鼠标位置（相对于画布）
    const rect = canvasRef.value?.getBoundingClientRect();
    if (rect) {
      const centerX = event.clientX - rect.left;
      const centerY = event.clientY - rect.top;
      onZoom(newZoom, centerX, centerY);
    } else {
      onZoom(newZoom);
    }

    // 触发视口变化事件
    if (onViewportChange) {
      onViewportChange(options.viewport.value);
    }
  };

  return {
    handleWheel
  };
}

