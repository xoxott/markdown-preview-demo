/**
 * Flow 小地图组件
 *
 * 提供画布的缩略图视图，支持快速导航
 */

import { defineComponent, computed, ref, onMounted, onUnmounted, type PropType } from 'vue';
import type { FlowViewport, FlowNode } from '../types';

/**
 * FlowMinimap 组件属性
 */
export interface FlowMinimapProps {
  /** 视口状态 */
  viewport: FlowViewport;
  /** 节点列表 */
  nodes: FlowNode[];
  /** 小地图位置 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 小地图大小 */
  size?: { width: number; height: number };
  /** 是否显示 */
  visible?: boolean;
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
  /** 视口变化事件 */
  onViewportChange?: (viewport: FlowViewport) => void;
}

/**
 * Flow 小地图组件
 */
export default defineComponent({
  name: 'FlowMinimap',
  props: {
    viewport: {
      type: Object as PropType<FlowViewport>,
      required: true
    },
    nodes: {
      type: Array as PropType<FlowNode[]>,
      default: () => []
    },
    position: {
      type: String as PropType<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>,
      default: 'bottom-right'
    },
    size: {
      type: Object as PropType<{ width: number; height: number }>,
      default: () => ({ width: 200, height: 150 })
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
    onViewportChange: {
      type: Function as PropType<(viewport: FlowViewport) => void>,
      default: undefined
    }
  },
  setup(props) {
    const minimapRef = ref<HTMLElement | null>(null);
    const isDragging = ref(false);
    const dragStartX = ref(0);
    const dragStartY = ref(0);

    // 计算节点边界
    const bounds = computed(() => {
      if (props.nodes.length === 0) {
        return {
          minX: 0,
          minY: 0,
          maxX: 1000,
          maxY: 1000,
          width: 1000,
          height: 1000
        };
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      props.nodes.forEach(node => {
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        const nodeWidth = node.size?.width || 220;
        const nodeHeight = node.size?.height || 72;

        minX = Math.min(minX, nodeX);
        minY = Math.min(minY, nodeY);
        maxX = Math.max(maxX, nodeX + nodeWidth);
        maxY = Math.max(maxY, nodeY + nodeHeight);
      });

      // 添加边距
      const padding = 100;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY
      };
    });

    // 计算缩放比例
    const scale = computed(() => {
      const { width, height } = props.size;
      const scaleX = width / bounds.value.width;
      const scaleY = height / bounds.value.height;
      return Math.min(scaleX, scaleY, 1); // 不放大
    });

    // 计算视口框位置和大小（在小地图中）
    const viewportBox = computed(() => {
      const { width, height } = props.size;
      const { minX, minY } = bounds.value;
      const scaleValue = scale.value;

      // 计算视口在小地图中的位置
      const viewportX = (-props.viewport.x / props.viewport.zoom - minX) * scaleValue;
      const viewportY = (-props.viewport.y / props.viewport.zoom - minY) * scaleValue;
      const viewportWidth = (window.innerWidth || 1000) / props.viewport.zoom * scaleValue;
      const viewportHeight = (window.innerHeight || 1000) / props.viewport.zoom * scaleValue;

      return {
        x: Math.max(0, Math.min(width - viewportWidth, viewportX)),
        y: Math.max(0, Math.min(height - viewportHeight, viewportY)),
        width: Math.min(viewportWidth, width),
        height: Math.min(viewportHeight, height)
      };
    });

    // 计算小地图位置样式
    const positionStyle = computed(() => {
      const baseStyle: Record<string, any> = {
        position: 'absolute',
        zIndex: 10,
        ...props.style
      };

      switch (props.position) {
        case 'top-left':
          baseStyle.top = '10px';
          baseStyle.left = '10px';
          break;
        case 'top-right':
          baseStyle.top = '10px';
          baseStyle.right = '10px';
          break;
        case 'bottom-left':
          baseStyle.bottom = '10px';
          baseStyle.left = '10px';
          break;
        case 'bottom-right':
        default:
          baseStyle.bottom = '10px';
          baseStyle.right = '10px';
          break;
      }

      return baseStyle;
    });

    // 处理小地图点击（跳转到对应位置）
    const handleMinimapClick = (event: MouseEvent) => {
      if (!minimapRef.value) return;

      const rect = minimapRef.value.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const { minX, minY } = bounds.value;
      const scaleValue = scale.value;

      // 计算画布坐标
      const canvasX = x / scaleValue + minX;
      const canvasY = y / scaleValue + minY;

      // 计算新的视口位置（居中显示）
      const newViewportX = -(canvasX - (window.innerWidth || 1000) / 2 / props.viewport.zoom);
      const newViewportY = -(canvasY - (window.innerHeight || 1000) / 2 / props.viewport.zoom);

      if (props.onViewportChange) {
        props.onViewportChange({
          ...props.viewport,
          x: newViewportX,
          y: newViewportY
        });
      }
    };

    // 处理视口框拖拽
    const handleViewportBoxMouseDown = (event: MouseEvent) => {
      event.stopPropagation();
      isDragging.value = true;
      dragStartX.value = event.clientX;
      dragStartY.value = event.clientY;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.value || !minimapRef.value) return;

      const deltaX = event.clientX - dragStartX.value;
      const deltaY = event.clientY - dragStartY.value;

      const scaleValue = scale.value;
      const deltaCanvasX = deltaX / scaleValue;
      const deltaCanvasY = deltaY / scaleValue;

      const newViewportX = props.viewport.x - deltaCanvasX * props.viewport.zoom;
      const newViewportY = props.viewport.y - deltaCanvasY * props.viewport.zoom;

      if (props.onViewportChange) {
        props.onViewportChange({
          ...props.viewport,
          x: newViewportX,
          y: newViewportY
        });
      }

      dragStartX.value = event.clientX;
      dragStartY.value = event.clientY;
    };

    const handleMouseUp = () => {
      isDragging.value = false;
    };

    onMounted(() => {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    onUnmounted(() => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });

    return () => {
      if (!props.visible) {
        return null;
      }

      const { width, height } = props.size;
      const { minX, minY } = bounds.value;
      const scaleValue = scale.value;
      const viewportBoxValue = viewportBox.value;

      return (
        <div
          ref={minimapRef}
          class={`flow-minimap ${props.class}`}
          style={{
            ...positionStyle.value,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer'
          }}
          onClick={handleMinimapClick}
        >
          <svg
            width={width}
            height={height}
            style={{ display: 'block' }}
          >
            {/* 渲染节点 */}
            {props.nodes.map(node => {
              const nodeX = (node.position.x - minX) * scaleValue;
              const nodeY = (node.position.y - minY) * scaleValue;
              const nodeWidth = (node.size?.width || 220) * scaleValue;
              const nodeHeight = (node.size?.height || 72) * scaleValue;

              return (
                <rect
                  key={node.id}
                  x={nodeX}
                  y={nodeY}
                  width={nodeWidth}
                  height={nodeHeight}
                  fill="#2080f0"
                  opacity={0.3}
                  stroke="#2080f0"
                  stroke-width={1}
                />
              );
            })}

            {/* 视口框 */}
            <rect
              x={viewportBoxValue.x}
              y={viewportBoxValue.y}
              width={viewportBoxValue.width}
              height={viewportBoxValue.height}
              fill="none"
              stroke="#f5576c"
              stroke-width={2}
              style={{ cursor: 'move' }}
              onMousedown={handleViewportBoxMouseDown}
            />
          </svg>
        </div>
      );
    };
  }
});

