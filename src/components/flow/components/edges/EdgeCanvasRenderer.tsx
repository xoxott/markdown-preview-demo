/**
 * 连接线 Canvas 渲染器组件
 *
 * 负责使用 Canvas 渲染大量连接线，提供更好的性能
 */

import { defineComponent, ref, onMounted, watch, computed, type PropType } from 'vue';
import { useRafThrottle } from '../../hooks/useRafThrottle';
import type { FlowEdge, FlowViewport } from '../../types';
import type { EdgePositions } from '../../hooks/useEdgePositions';
import {
  ARROW_SIZES,
  CANVAS_CONSTANTS,
  EDGE_COLORS,
  STROKE_WIDTHS
} from '../../constants/edge-constants';

/**
 * EdgeCanvasRenderer 组件属性
 */
export interface EdgeCanvasRendererProps {
  /** 可见连接线列表 */
  visibleEdges: FlowEdge[];
  /** 连接线位置计算函数 */
  getEdgePositions: (edge: FlowEdge) => EdgePositions | null;
  /** 选中的连接线 ID 集合 */
  selectedEdgeIdsSet: Set<string>;
  /** 视口状态 */
  viewport: FlowViewport;
  /** z-index 值 */
  zIndex?: number;
}

/**
 * 连接线 Canvas 渲染器组件
 */
export default defineComponent({
  name: 'EdgeCanvasRenderer',
  props: {
    visibleEdges: {
      type: Array as PropType<FlowEdge[]>,
      required: true
    },
    getEdgePositions: {
      type: Function as PropType<(edge: FlowEdge) => EdgePositions | null>,
      required: true
    },
    selectedEdgeIdsSet: {
      type: Object as PropType<Set<string>>,
      required: true
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      required: true
    },
    zIndex: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);

    /**
     * 渲染 Canvas
     */
    const renderCanvas = () => {
      if (!canvasRef.value) {
        return;
      }

      const canvas = canvasRef.value;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      // 设置画布尺寸
      const container = canvas.parentElement;
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制连接线
      props.visibleEdges.forEach(edge => {
        const positions = props.getEdgePositions(edge);
        if (!positions) {
          return;
        }

        const isSelected = props.selectedEdgeIdsSet.has(edge.id);

        // 设置样式
        ctx.strokeStyle = isSelected ? EDGE_COLORS.SELECTED : EDGE_COLORS.DEFAULT;
        const zoom = props.viewport.zoom;
        const baseLineWidth = isSelected ? STROKE_WIDTHS.SELECTED : STROKE_WIDTHS.BASE;
        ctx.lineWidth = Math.max(
          STROKE_WIDTHS.MIN,
          Math.min(STROKE_WIDTHS.MAX, baseLineWidth * zoom)
        );
        ctx.lineCap = CANVAS_CONSTANTS.LINE_CAP;
        ctx.lineJoin = CANVAS_CONSTANTS.LINE_JOIN;

        // 使用端口位置或节点中心
        const startX = positions.sourceHandleX ?? positions.sourceX;
        const startY = positions.sourceHandleY ?? positions.sourceY;
        let endX = positions.targetHandleX ?? positions.targetX;
        let endY = positions.targetHandleY ?? positions.targetY;

        // 如果显示箭头，缩短路径终点
        const showArrow = edge.showArrow !== false;
        if (showArrow) {
          const currentZoom = props.viewport.zoom;
          const currentArrowSize = Math.max(
            ARROW_SIZES.MIN,
            Math.min(ARROW_SIZES.MAX, ARROW_SIZES.BASE * currentZoom)
          );
          const ARROW_LENGTH = (currentArrowSize / ARROW_SIZES.BASE) * ARROW_SIZES.LENGTH_RATIO;

          const dx = endX - startX;
          const dy = endY - startY;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length > 0) {
            endX = endX - (dx / length) * ARROW_LENGTH;
            endY = endY - (dy / length) * ARROW_LENGTH;
          }
        }

        // 绘制路径（简单直线，Canvas 渲染不支持贝塞尔曲线）
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      });
    };

    /**
     * 节流渲染函数
     */
    const renderCanvasThrottled = () => {
      if (canvasRef.value) {
        renderCanvas();
      }
    };

    // 使用 RAF 节流渲染
    const { throttled: scheduleRender } = useRafThrottle(renderCanvasThrottled);

    // 监听变化，重新渲染
    onMounted(() => {
      scheduleRender();
    });

    watch(
      [
        () => props.visibleEdges.length,
        () => props.viewport.zoom,
        () => props.viewport.x,
        () => props.viewport.y
      ],
      () => {
        scheduleRender();
      },
      { deep: false }
    );

    return () => (
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: props.zIndex
        }}
      />
    );
  }
});

