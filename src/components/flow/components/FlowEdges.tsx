/**
 * Flow 连接线列表组件
 *
 * 负责渲染所有连接线，支持 Canvas/SVG 混合渲染、视口裁剪等性能优化
 */

import { computed, defineComponent, onMounted, watch, ref, type PropType, CSSProperties } from 'vue';
import { useRafThrottle } from '../hooks/useRafThrottle';
import { useNodesMap } from '../hooks/useNodesMap';
import { createCache } from '../utils/cache-utils';
import { getGpuAccelerationStyle } from '../utils/style-utils';
import { getNodeCenterScreen, getHandlePositionScreen } from '../utils/node-utils';
import type { FlowEdge, FlowNode, FlowViewport } from '../types';
import type { FlowPosition } from '../types/flow-node';
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
  /** 实例 ID（用于生成唯一的 SVG ID） */
  instanceId?: string;
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
    instanceId: {
      type: String,
      default: 'default'
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

    // ✅ 性能优化：使用 Set 替代 Array.includes()，O(n) → O(1)
    const selectedEdgeIdsSet = computed(() => new Set(props.selectedEdgeIds));

    // ✅ 生成唯一 ID 前缀，避免多实例冲突
    const idPrefix = computed(() => `flow-arrow-${props.instanceId}`);

    // 节点 Map 管理（使用封装的 hook）
    const nodesRef = computed(() => props.nodes);
    const { nodesMap } = useNodesMap({ nodes: nodesRef });

    // 路径计算缓存（使用封装的缓存工具）
    interface PathCacheItem {
      path: string;
      positions: any;
      timestamp: number;
    }
    const pathCache = createCache<string, PathCacheItem>({
      maxSize: 500,
      cleanupSize: 250
    });

    // 计算可见连接线（视口裁剪，使用 Map 优化）
    const visibleEdges = computed(() => {
      if (!props.enableViewportCulling) {
        return props.edges;
      }

      const map = nodesMap.value;

      // 获取视口区域
      const viewportX = -props.viewport.x / props.viewport.zoom;
      const viewportY = -props.viewport.y / props.viewport.zoom;
      const viewportWidth = (window.innerWidth || 1000) / props.viewport.zoom;
      const viewportHeight = (window.innerHeight || 1000) / props.viewport.zoom;

      // 过滤可见连接线（使用 Map 查找，O(1)）
      return props.edges.filter(edge => {
        const sourceNode = map.get(edge.source);
        const targetNode = map.get(edge.target);

        if (!sourceNode || !targetNode) {
          return false;
        }

        const sourceCenter = getNodeCenterScreen(sourceNode, props.viewport);
        const targetCenter = getNodeCenterScreen(targetNode, props.viewport);

        // 检查连接线的起点和终点是否在视口内
        return (
          (sourceCenter.x >= 0 && sourceCenter.x <= window.innerWidth) ||
          (targetCenter.x >= 0 && targetCenter.x <= window.innerWidth) ||
          (sourceCenter.x < 0 && targetCenter.x > window.innerWidth) ||
          (targetCenter.x < 0 && sourceCenter.x > window.innerWidth)
        );
      });
    });

    // 计算连接线位置（带缓存，使用 Map 优化）
    const getEdgePositions = (edge: FlowEdge) => {
      // 性能优化：使用 Map 查找，O(1) 复杂度
      const map = nodesMap.value;
      const sourceNode = map.get(edge.source);
      const targetNode = map.get(edge.target);

      if (!sourceNode || !targetNode) {
        return null;
      }

      // ✅ 优化：缓存键包含 viewport 信息，确保缩放/拖拽时实时更新
      // 使用较小的容差（2px）以提高精度，同时保持缓存效率
      const zoom = props.viewport.zoom;
      const viewportX = Math.round(props.viewport.x / 10);
      const viewportY = Math.round(props.viewport.y / 10);
      const zoomKey = Math.round(zoom * 100); // 精确到小数点后2位

      const cacheKey = `${edge.id}-${Math.round(sourceNode.position.x/2)}-${Math.round(sourceNode.position.y/2)}-${Math.round(targetNode.position.x/2)}-${Math.round(targetNode.position.y/2)}-${viewportX}-${viewportY}-${zoomKey}`;
      const cached = pathCache.get(cacheKey);
      const now = Date.now();

      // ✅ 优化：缩短缓存有效期到 16ms（约1帧），确保缩放/拖拽时实时更新
      if (cached && now - cached.timestamp < 16) {
        return cached.positions;
      }

      // 如果有端口 ID，使用端口位置；否则使用节点中心
      let sourcePos: FlowPosition;
      let targetPos: FlowPosition;

      if (edge.sourceHandle) {
        const handlePos = getHandlePositionScreen(sourceNode, edge.sourceHandle, props.viewport);
        sourcePos = handlePos || getNodeCenterScreen(sourceNode, props.viewport);
      } else {
        sourcePos = getNodeCenterScreen(sourceNode, props.viewport);
      }

      if (edge.targetHandle) {
        const handlePos = getHandlePositionScreen(targetNode, edge.targetHandle, props.viewport);
        targetPos = handlePos || getNodeCenterScreen(targetNode, props.viewport);
      } else {
        targetPos = getNodeCenterScreen(targetNode, props.viewport);
      }

      const positions = {
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

      // 更新缓存（使用封装的缓存工具，自动清理）
      pathCache.set(cacheKey, {
        path: '', // 路径将在后续计算
        positions,
        timestamp: now
      });

      return positions;
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

        const isSelected = selectedEdgeIdsSet.value.has(edge.id); // ✅ O(1) 查找

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

    /**
     * 渲染 Canvas
     *
     * 在 RAF 节流中执行，确保每帧最多渲染一次
     */
    const renderCanvasThrottled = () => {
        if (useCanvas.value && canvasRef.value) {
          renderCanvas();
        }
    };

    // ✅ 使用 RAF 节流渲染，避免过度渲染
    const { throttled: scheduleRender } = useRafThrottle(renderCanvasThrottled);

    // 监听视口变化和连接线变化，重新渲染 Canvas
    onMounted(() => {
      scheduleRender();
    });

    // ✅ 优化：移除 deep watch，使用浅监听 + RAF 节流
    watch(
      [
        () => visibleEdges.value.length,
        () => props.viewport?.zoom,
        () => props.viewport?.x,
        () => props.viewport?.y,
        () => useCanvas.value
      ],
      () => {
        scheduleRender();
      },
      { deep: false }
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

      // 箭头路径定义 - 使用更简洁的路径
      const arrowPath = `M${refX},${refX} L${refX},${refX + pathSize} L${refX + pathSize},${refY} z`;

      // GPU 加速样式（统一处理）
      const svgStyle = computed<CSSProperties>(() => ({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 1,
        ...getGpuAccelerationStyle({
          enabled: true,
          includeBackfaceVisibility: true,
          includePerspective: true
        })
      }));

      return (
        <svg
          class="flow-edges"
          style={svgStyle.value}
        >
          {/* ✅ 共享的箭头标记定义 - 使用 <use> 优化，带唯一 ID */}
          <defs>
            {/* 共享的箭头路径定义 */}
            <path
              id={`${idPrefix.value}-path-default`}
              d={arrowPath}
              fill="#cbd5e1"
            />
            <path
              id={`${idPrefix.value}-path-selected`}
              d={arrowPath}
              fill="#f5576c"
            />
            <path
              id={`${idPrefix.value}-path-hovered`}
              d={arrowPath}
              fill="#94a3b8"
            />

            {/* 箭头标记 - 使用 <use> 引用共享路径 */}
            <marker
              id={`${idPrefix.value}-marker-default`}
              markerWidth={arrowSize}
              markerHeight={arrowSize}
              refX={refX}
              refY={refY}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <use href={`#${idPrefix.value}-path-default`} />
            </marker>

            <marker
              id={`${idPrefix.value}-marker-selected`}
              markerWidth={arrowSize}
              markerHeight={arrowSize}
              refX={refX}
              refY={refY}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <use href={`#${idPrefix.value}-path-selected`} />
            </marker>

            <marker
              id={`${idPrefix.value}-marker-hovered`}
              markerWidth={arrowSize}
              markerHeight={arrowSize}
              refX={refX}
              refY={refY}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <use href={`#${idPrefix.value}-path-hovered`} />
            </marker>
          </defs>
          {visibleEdges.value.map(edge => {
            const positions = getEdgePositions(edge);
            if (!positions) {
              return null;
            }

            const isSelected = selectedEdgeIdsSet.value.has(edge.id); // ✅ O(1) 查找

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
                instanceId={props.instanceId}
                selected={isSelected}
                onClick={props.onEdgeClick ? (event: MouseEvent) => props.onEdgeClick!(edge, event) : undefined}
                onDouble-click={props.onEdgeDoubleClick ? (event: MouseEvent) => props.onEdgeDoubleClick!(edge, event) : undefined}
                onMouseenter={props.onEdgeMouseEnter ? (event: MouseEvent) => props.onEdgeMouseEnter!(edge, event) : undefined}
                onMouseleave={props.onEdgeMouseLeave ? (event: MouseEvent) => props.onEdgeMouseLeave!(edge, event) : undefined}
              />
            );
          })}
        </svg>
      );
    };
  }
});

