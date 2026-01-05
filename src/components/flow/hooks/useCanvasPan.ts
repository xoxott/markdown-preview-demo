/**
 * 画布平移 Hook
 *
 * 处理画布的拖拽平移功能，基于通用的 useDrag hook 实现。
 * 支持配置鼠标按键、检查拖拽条件等。
 */

import { type Ref } from 'vue';
import type { FlowConfig, FlowViewport } from '../types';
import { useDrag } from './useDrag';

export interface UseCanvasPanOptions {
  /** 画布配置 */
  config: Ref<Readonly<FlowConfig>>;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 平移视口的回调 */
  onPan: (deltaX: number, deltaY: number) => void;
  /** 视口变化事件 */
  onViewportChange?: (viewport: FlowViewport) => void;
}

export interface UseCanvasPanReturn {
  /** 是否正在平移 */
  isPanning: Ref<boolean>;
  /** 处理鼠标按下事件 */
  handleMouseDown: (event: MouseEvent) => void;
  /** 处理鼠标移动事件 */
  handleMouseMove: (event: MouseEvent) => void;
  /** 处理鼠标抬起事件 */
  handleMouseUp: () => void;
  /** 清理资源 */
  cleanup: () => void;
}

/**
 * 画布平移 Hook
 *
 * 基于通用的 useDrag hook 实现画布平移功能。
 * 支持配置鼠标按键、检查拖拽条件等。
 *
 * @param options 画布平移配置选项
 * @returns 画布平移相关的状态和方法
 */
export function useCanvasPan(options: UseCanvasPanOptions): UseCanvasPanReturn {
  const { config, viewport, onPan, onViewportChange } = options;

  const drag = useDrag({
    // 检查是否启用画布平移
    enabled: () => {
      const panOnDrag = config.value.canvas?.panOnDrag;
      const enableCanvasPan = config.value.interaction?.enableCanvasPan !== false;
      return panOnDrag !== false && enableCanvasPan !== false;
    },
    canStart: (event) => {
      // 如果点击在节点上，不处理画布拖拽
      const target = event.target as HTMLElement;
      if (target.closest('.flow-node')) return false;

      // 检查是否允许拖拽画布
      const panOnDrag = config.value.canvas?.panOnDrag;
      const enableCanvasPan = config.value.interaction?.enableCanvasPan !== false;

      if (panOnDrag === false && enableCanvasPan === false) {
        return false;
      }

      // 检查鼠标按键
      let allowedButtons: number[] = [];
      if (Array.isArray(panOnDrag)) {  // 如果配置是数组，使用配置的按键
        allowedButtons = panOnDrag;
      } else if (panOnDrag === true || (panOnDrag !== false && enableCanvasPan)) {  // 如果启用左键拖拽
        allowedButtons = [0]; // 左键
      } else {  // 默认：中键和右键
        allowedButtons = [1, 2];
      }
      return allowedButtons.includes(event.button);
    },
    // 启用增量模式：每次更新后重置起始位置，使得 deltaX/deltaY 是增量偏移
    incremental: true,
    onDrag: (result) => {
      onPan(result.deltaX, result.deltaY);
      if (onViewportChange) {
        onViewportChange(viewport.value);
      }
    }
  });

  return {
    isPanning: drag.isDragging,
    handleMouseDown: drag.handleMouseDown,
    handleMouseMove: drag.handleMouseMove,
    handleMouseUp: drag.handleMouseUp,
    cleanup: drag.cleanup
  };
}

