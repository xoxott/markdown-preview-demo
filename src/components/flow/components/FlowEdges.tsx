/**
 * Flow 连接线列表组件
 *
 * 负责渲染所有连接线，支持 Canvas/SVG 混合渲染、视口裁剪等性能优化
 */

import { computed, defineComponent, onMounted, watch, ref, type PropType } from 'vue';
import type { FlowEdge, FlowNode, FlowViewport } from '../types';
import BaseEdge from './edges/BaseEdge';

/**
 * FlowEdges 组件属性
 */
export interface FlowEdgesProps {
  /** 连接线列表 */
  edges: FlowEdge[];
  /** 节点列表（用于计算连接线位置） */
  nodes: FlowNode[];
  /** 选中的连接线 ID 列表 */
  selectedEdgeIds?: string[];
  /** 视口状态 */
  viewport?: FlowViewport;
  /** 是否启用视口裁剪 */
  enableViewportCulling?: boolean;
  /** 是否启用 Canvas 渲染（大量连接线时性能更好） */
  enableCanvasRendering?: boolean;
  /** Canvas 渲染阈值（连接线数量超过此值使用 Canvas） */
  canvasThreshold?: number;
  /** 连接线点击事件 */
  onEdgeClick?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线双击事件 */
  onEdgeDoubleClick?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线鼠标进入 */
  onEdgeMouseEnter?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线鼠标离开 */
  onEdgeMouseLeave?: (edge: FlowEdge, event: MouseEvent) => void;
}

/**
 * 计算节点中心位置
 */
function getNodeCenter(node: FlowNode, viewport: FlowViewport): { x: number; y: number } {
  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const nodeWidth = node.size?.width || 220;
  const nodeHeight = node.size?.height || 72;

  // 节点中心（画布坐标）
  const centerX = nodeX + nodeWidth / 2;
  const centerY = nodeY + nodeHeight / 2;

  // 转换为屏幕坐标
  const screenX = centerX * viewport.zoom + viewport.x;
  const screenY = centerY * viewport.zoom + viewport.y;

  return { x: screenX, y: screenY };
}

/**
 * 计算端口位置
 */
function getHandlePosition(
  node: FlowNode,
  handleId: string,
  viewport: FlowViewport
): { x: number; y: number } | null {
  const handle = node.handles?.find(h => h.id === handleId);
  if (!handle) {
    return null;
  }

  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const nodeWidth = node.size?.width || 220;
  const nodeHeight = node.size?.height || 72;

  let handleX = 0;
  let handleY = 0;

  // 根据端口位置计算坐标（画布坐标）
  switch (handle.position) {
    case 'top':
      handleX = nodeX + nodeWidth / 2;
      handleY = nodeY;
      break;
    case 'bottom':
      handleX = nodeX + nodeWidth / 2;
      handleY = nodeY + nodeHeight;
      break;
    case 'left':
      handleX = nodeX;
      handleY = nodeY + nodeHeight / 2;
      break;
    case 'right':
      handleX = nodeX + nodeWidth;
      handleY = nodeY + nodeHeight / 2;
      break;
  }

  // 转换为屏幕坐标
  const screenX = handleX * viewport.zoom + viewport.x;
  const screenY = handleY * viewport.zoom + viewport.y;

  return { x: screenX, y: screenY };
}

/**
 * Flow 连接线列表组件
 */
export default defineComponent({
  name: 'FlowEdges',
  props: {
    edges: {
      type: Array as PropType<FlowEdge[]>,
      required: true
    },
    nodes: {
      type: Array as PropType<FlowNode[]>,
      required: true
    },
    selectedEdgeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    enableViewportCulling: {
      type: Boolean,
      default: true
    },
    enableCanvasRendering: {
      type: Boolean,
      default: false
    },
    canvasThreshold: {
      type: Number,
      default: 200
    },
    onEdgeClick: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    },
    onEdgeDoubleClick: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    },
    onEdgeMouseEnter: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    },
    onEdgeMouseLeave: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    }
  },
  setup(props) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const useCanvas = computed(() => {
      return props.enableCanvasRendering && props.edges.length >= props.canvasThreshold;
    });

    // 计算可见连接线（视口裁剪）
    const visibleEdges = computed(() => {
      if (!props.enableViewportCulling) {
        return props.edges;
      }

      // 获取视口区域
      const viewportX = -props.viewport.x / props.viewport.zoom;
      const viewportY = -props.viewport.y / props.viewport.zoom;
      const viewportWidth = (window.innerWidth || 1000) / props.viewport.zoom;
      const viewportHeight = (window.innerHeight || 1000) / props.viewport.zoom;

      // 过滤可见连接线（检查源节点和目标节点是否在视口内）
      return props.edges.filter(edge => {
        const sourceNode = props.nodes.find(n => n.id === edge.source);
        const targetNode = props.nodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) {
          return false;
        }

        const sourceCenter = getNodeCenter(sourceNode, props.viewport);
        const targetCenter = getNodeCenter(targetNode, props.viewport);

        // 检查连接线的起点和终点是否在视口内
        return (
          (sourceCenter.x >= 0 && sourceCenter.x <= window.innerWidth) ||
          (targetCenter.x >= 0 && targetCenter.x <= window.innerWidth) ||
          (sourceCenter.x < 0 && targetCenter.x > window.innerWidth) ||
          (targetCenter.x < 0 && sourceCenter.x > window.innerWidth)
        );
      });
    });

    // 计算连接线位置
    const getEdgePositions = (edge: FlowEdge) => {
      const sourceNode = props.nodes.find(n => n.id === edge.source);
      const targetNode = props.nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        return null;
      }

      // 如果有端口 ID，使用端口位置；否则使用节点中心
      let sourcePos: { x: number; y: number };
      let targetPos: { x: number; y: number };

      if (edge.sourceHandle) {
        const handlePos = getHandlePosition(sourceNode, edge.sourceHandle, props.viewport);
        sourcePos = handlePos || getNodeCenter(sourceNode, props.viewport);
      } else {
        sourcePos = getNodeCenter(sourceNode, props.viewport);
      }

      if (edge.targetHandle) {
        const handlePos = getHandlePosition(targetNode, edge.targetHandle, props.viewport);
        targetPos = handlePos || getNodeCenter(targetNode, props.viewport);
      } else {
        targetPos = getNodeCenter(targetNode, props.viewport);
      }

      return {
        sourceX: sourcePos.x,
        sourceY: sourcePos.y,
        targetX: targetPos.x,
        targetY: targetPos.y,
        // 确保端口位置正确传递（无论是否有箭头）
        sourceHandleX: edge.sourceHandle ? sourcePos.x : undefined,
        sourceHandleY: edge.sourceHandle ? sourcePos.y : undefined,
        targetHandleX: edge.targetHandle ? targetPos.x : undefined,
        targetHandleY: edge.targetHandle ? targetPos.y : undefined
      };
    };

    // Canvas 渲染（如果启用）
    const renderCanvas = () => {
      if (!canvasRef.value || !useCanvas.value) {
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
      visibleEdges.value.forEach(edge => {
        const positions = getEdgePositions(edge);
        if (!positions) {
          return;
        }

        const isSelected = props.selectedEdgeIds.includes(edge.id);

        // 设置样式
        ctx.strokeStyle = isSelected ? '#f5576c' : '#cbd5e1';
        const zoom = props.viewport.zoom;
        const baseLineWidth = isSelected ? 3.5 : 2.5;
        const minLineWidth = 1;
        const maxLineWidth = 5;
        ctx.lineWidth = Math.max(minLineWidth, Math.min(maxLineWidth, baseLineWidth * zoom));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 使用端口位置或节点中心
        const startX = positions.sourceHandleX ?? positions.sourceX;
        const startY = positions.sourceHandleY ?? positions.sourceY;
        let endX = positions.targetHandleX ?? positions.targetX;
        let endY = positions.targetHandleY ?? positions.targetY;

        // 如果显示箭头，缩短路径终点
        const showArrow = edge.showArrow !== false;
        // 箭头缩短距离应该随箭头大小动态调整
        const currentZoom = props.viewport.zoom;
        const baseArrowSize = 12;
        const minArrowSize = 6;
        const maxArrowSize = 24;
        const currentArrowSize = Math.max(minArrowSize, Math.min(maxArrowSize, baseArrowSize * currentZoom));
        const ARROW_LENGTH = (currentArrowSize / baseArrowSize) * 8; // 基础值 8，随缩放调整
        if (showArrow) {
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

    // 监听视口变化和连接线变化，重新渲染 Canvas
    onMounted(() => {
      // 使用 nextTick 确保 DOM 已更新
      setTimeout(() => {
        if (useCanvas.value && canvasRef.value) {
          renderCanvas();
        }
      }, 0);
    });

    // 监听视口和连接线变化，重新渲染 Canvas
    watch(
      [() => visibleEdges.value, () => props.viewport, () => props.nodes, () => useCanvas.value],
      () => {
        if (useCanvas.value && canvasRef.value) {
          // 使用 nextTick 确保 DOM 已更新
          setTimeout(() => {
            renderCanvas();
          }, 0);
        }
      },
      { deep: true }
    );

    return () => {
      // 如果使用 Canvas 渲染
      if (useCanvas.value) {
        return (
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
        );
      }

      // 使用 SVG 渲染（启用 GPU 加速）
      const zoom = props.viewport?.zoom || 1;

      // 计算箭头大小（随缩放调整，但限制最小和最大值）
      const baseArrowSize = 12;
      const minArrowSize = 6;
      const maxArrowSize = 24;
      const arrowSize = Math.max(minArrowSize, Math.min(maxArrowSize, baseArrowSize * zoom));

      // 箭头参考点和路径大小（按比例缩放）
      const refX = (2 / baseArrowSize) * arrowSize;
      const refY = (6 / baseArrowSize) * arrowSize;
      const pathSize = (8 / baseArrowSize) * arrowSize;

      // 箭头路径定义
      const arrowPath = `M${refX},${refX} L${refX},${refX + pathSize} L${refX + pathSize},${refY} z`;

      return (
        <svg
          class="flow-edges"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 1,
            // GPU 加速优化
            willChange: 'transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {/* 共享的箭头标记定义（使用 <use> 优化） */}
          <defs>
            {/* 默认箭头标记 */}
            <g id="flow-arrow-default">
              <path d={arrowPath} fill="#cbd5e1" />
            </g>
            {/* 选中箭头标记 */}
            <g id="flow-arrow-selected">
              <path d={arrowPath} fill="#f5576c" />
            </g>
            {/* 悬停箭头标记 */}
            <g id="flow-arrow-hovered">
              <path d={arrowPath} fill="#94a3b8" />
            </g>

            {/* 箭头标记（使用 <use> 引用共享定义） */}
            <marker
              id="flow-arrow-marker-default"
              markerWidth={arrowSize}
              markerHeight={arrowSize}
              refX={refX}
              refY={refY}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <use href="#flow-arrow-default" />
            </marker>

            <marker
              id="flow-arrow-marker-selected"
              markerWidth={arrowSize}
              markerHeight={arrowSize}
              refX={refX}
              refY={refY}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <use href="#flow-arrow-selected" />
            </marker>

            <marker
              id="flow-arrow-marker-hovered"
              markerWidth={arrowSize}
              markerHeight={arrowSize}
              refX={refX}
              refY={refY}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <use href="#flow-arrow-hovered" />
            </marker>
          </defs>
          {visibleEdges.value.map(edge => {
            const positions = getEdgePositions(edge);
            if (!positions) {
              return null;
            }

            const isSelected = props.selectedEdgeIds.includes(edge.id);

            // 生成路径（使用端口位置或节点中心）
            const startX = positions.sourceHandleX ?? positions.sourceX;
            const startY = positions.sourceHandleY ?? positions.sourceY;
            // 保存原始终点（用于计算控制点和无箭头时的连接）
            const originalEndX = positions.targetHandleX ?? positions.targetX;
            const originalEndY = positions.targetHandleY ?? positions.targetY;
            let endX = originalEndX;
            let endY = originalEndY;

            // 如果显示箭头，缩短路径终点为箭头留出空间
            const showArrow = edge.showArrow !== false;
            // 箭头缩短距离应该随箭头大小动态调整，与箭头标记的 refX 保持一致
            // refX = (2 / baseArrowSize) * arrowSize，所以缩短距离应该是 arrowSize / 6
            // 但为了更好的视觉效果，我们使用一个基于箭头大小的动态值
            const currentZoom = props.viewport?.zoom || 1;
            const baseArrowSize = 12;
            const minArrowSize = 6;
            const maxArrowSize = 24;
            const currentArrowSize = Math.max(minArrowSize, Math.min(maxArrowSize, baseArrowSize * currentZoom));
            // ARROW_LENGTH 应该与箭头大小成比例，使用 refX 的值作为参考
            // refX = (2 / baseArrowSize) * currentArrowSize，但实际需要的缩短距离应该更大
            // 使用箭头大小的一半作为缩短距离，这样更准确
            const ARROW_LENGTH = (currentArrowSize / baseArrowSize) * 8; // 基础值 8，随缩放调整

            // 根据连接线类型生成路径
            let path = '';
            if (edge.type === 'straight') {
              // 直线：如果显示箭头，缩短路径终点
              if (showArrow) {
                const dx = endX - startX;
                const dy = endY - startY;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > 0) {
                  endX = endX - (dx / length) * ARROW_LENGTH;
                  endY = endY - (dy / length) * ARROW_LENGTH;
                }
              }
              path = `M ${startX},${startY} L ${endX},${endY}`;
            } else {
              // 贝塞尔曲线：先计算控制点（使用原始终点）
              const dx = (positions.targetHandleX ?? positions.targetX) - (positions.sourceHandleX ?? positions.sourceX);
              // 控制点偏移量应该随缩放调整，保持视觉一致性
              const baseMinOffset = 50;
              const minOffset = baseMinOffset * currentZoom; // 随缩放调整
              const controlOffset = Math.max(Math.abs(dx) * 0.5, minOffset);
              const controlX1 = startX + controlOffset;
              const controlY1 = startY;
              const controlX2 = originalEndX - controlOffset;
              const controlY2 = originalEndY;

              // 如果显示箭头，计算终点切线方向并缩短路径
              if (showArrow) {
                // 计算贝塞尔曲线在 t=1 时的切线方向
                // 对于三次贝塞尔曲线 C(t)，在 t=1 时的导数是：3 * (P3 - P2)
                const tangentDx = 3 * (originalEndX - controlX2);
                const tangentDy = 3 * (originalEndY - controlY2);
                const tangentLength = Math.sqrt(tangentDx * tangentDx + tangentDy * tangentDy);

                if (tangentLength > 0) {
                  endX = originalEndX - (tangentDx / tangentLength) * ARROW_LENGTH;
                  endY = originalEndY - (tangentDy / tangentLength) * ARROW_LENGTH;
                }
              } else {
                // 如果不显示箭头，使用原始终点，确保连接到端点
                // 确保使用正确的端口位置（已经转换为屏幕坐标）
                endX = originalEndX;
                endY = originalEndY;
              }

              path = `M ${startX},${startY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
            }

            return (
              <BaseEdge
                key={edge.id}
                edge={edge}
                sourceX={positions.sourceX}
                sourceY={positions.sourceY}
                targetX={positions.targetX}
                targetY={positions.targetY}
                sourceHandleX={positions.sourceHandleX}
                sourceHandleY={positions.sourceHandleY}
                targetHandleX={positions.targetHandleX}
                targetHandleY={positions.targetHandleY}
                path={path}
                viewport={props.viewport}
                selected={isSelected}
                onClick={(event: MouseEvent) => {
                  if (props.onEdgeClick) {
                    props.onEdgeClick(edge, event);
                  }
                }}
                onDouble-click={(event: MouseEvent) => {
                  if (props.onEdgeDoubleClick) {
                    props.onEdgeDoubleClick(edge, event);
                  }
                }}
                onMouseenter={(event: MouseEvent) => {
                  if (props.onEdgeMouseEnter) {
                    props.onEdgeMouseEnter(edge, event);
                  }
                }}
                onMouseleave={(event: MouseEvent) => {
                  if (props.onEdgeMouseLeave) {
                    props.onEdgeMouseLeave(edge, event);
                  }
                }}
              />
            );
          })}
        </svg>
      );
    };
  }
});

