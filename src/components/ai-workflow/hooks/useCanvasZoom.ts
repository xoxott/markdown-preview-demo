import { ref, computed, type Ref } from 'vue';

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface UseCanvasZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  initialViewport?: CanvasViewport;
}

export function useCanvasZoom(options: UseCanvasZoomOptions = {}) {
  const { minZoom = 0.1, maxZoom = 2, zoomStep = 0.1, initialViewport } = options;

  const viewport = ref<CanvasViewport>(
    initialViewport || {
      x: 0,
      y: 0,
      zoom: 1
    }
  );

  const transformStyle = computed(() => ({
    transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
    transformOrigin: '0 0'
    // 移除 transition，避免动画期间连接线位置不同步
    // transition: 'transform 0.2s ease-out'
  }));

  /** 缩放 */
  function zoom(delta: number, centerX?: number, centerY?: number) {
    const newZoom = Math.max(minZoom, Math.min(maxZoom, viewport.value.zoom + delta));

    if (centerX !== undefined && centerY !== undefined) {
      // 以指定点为中心缩放
      const zoomRatio = newZoom / viewport.value.zoom;
      const newX = centerX - (centerX - viewport.value.x) * zoomRatio;
      const newY = centerY - (centerY - viewport.value.y) * zoomRatio;
      
      // 一次性更新所有值，避免触发多次响应式更新
      viewport.value = {
        x: newX,
        y: newY,
        zoom: newZoom
      };
    } else {
      viewport.value = {
        ...viewport.value,
        zoom: newZoom
      };
    }
  }

  /** 放大 */
  function zoomIn(centerX?: number, centerY?: number) {
    zoom(zoomStep, centerX, centerY);
  }

  /** 缩小 */
  function zoomOut(centerX?: number, centerY?: number) {
    zoom(-zoomStep, centerX, centerY);
  }

  /** 重置缩放 */
  function resetZoom() {
    viewport.value.zoom = 1;
  }

  /** 设置缩放 */
  function setZoom(newZoom: number) {
    viewport.value.zoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
  }

  /** 平移 */
  function pan(deltaX: number, deltaY: number) {
    // 一次性更新，避免触发多次响应式更新
    viewport.value = {
      ...viewport.value,
      x: viewport.value.x + deltaX,
      y: viewport.value.y + deltaY
    };
  }

  /** 设置视口 */
  function setViewport(newViewport: Partial<CanvasViewport>) {
    if (newViewport.x !== undefined) viewport.value.x = newViewport.x;
    if (newViewport.y !== undefined) viewport.value.y = newViewport.y;
    if (newViewport.zoom !== undefined) {
      viewport.value.zoom = Math.max(minZoom, Math.min(maxZoom, newViewport.zoom));
    }
  }

  /** 重置视口 */
  function resetViewport() {
    viewport.value = { x: 0, y: 0, zoom: 1 };
  }

  /** 适应画布 */
  function fitView(containerWidth: number, containerHeight: number, contentWidth: number, contentHeight: number) {
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9; // 留10%边距

    viewport.value.zoom = Math.max(minZoom, Math.min(maxZoom, scale));
    viewport.value.x = (containerWidth - contentWidth * scale) / 2;
    viewport.value.y = (containerHeight - contentHeight * scale) / 2;
  }

  return {
    viewport,
    transformStyle,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    pan,
    setViewport,
    resetViewport,
    fitView
  };
}

