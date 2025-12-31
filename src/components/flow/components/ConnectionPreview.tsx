/**
 * 连接预览线组件
 *
 * 显示正在创建连接时的预览线
 */

import { defineComponent, computed, ref, watch, type PropType } from 'vue';
import type { FlowNode, FlowViewport } from '../types';

export interface ConnectionPreviewProps {
  /** 源节点 ID */
  sourceNodeId: string;
  /** 源端口 ID */
  sourceHandleId: string;
  /** 预览位置（鼠标位置） */
  previewPos: { x: number; y: number };
  /** 节点列表 */
  nodes: FlowNode[];
  /** 视口状态 */
  viewport: FlowViewport;
  /** 画布容器引用 */
  canvasRef: HTMLElement | null;
}

export default defineComponent({
  name: 'ConnectionPreview',
  props: {
    sourceNodeId: {
      type: String,
      required: true
    },
    sourceHandleId: {
      type: String,
      required: true
    },
    previewPos: {
      type: Object as PropType<{ x: number; y: number }>,
      required: true
    },
    nodes: {
      type: Array as PropType<FlowNode[]>,
      required: true
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      required: true
    },
    canvasRef: {
      type: Object as PropType<HTMLElement | null>,
      default: null
    }
  },
  setup(props) {
    /**
     * 缓存画布容器的位置信息
     *
     * 避免频繁调用 getBoundingClientRect()，只在容器引用变化时更新
     */
    const canvasRect = ref<DOMRect | null>(null);

    watch(
      () => props.canvasRef,
      (newRef) => {
        canvasRect.value = newRef?.getBoundingClientRect() || null;
      },
      { immediate: true }
    );

    /**
     * 缓存源节点和端口信息
     *
     * 在连接创建过程中，源节点和端口信息不会变化，
     * 因此可以缓存这些信息，避免重复查找
     */
    const sourceNodeInfo = computed(() => {
      const sourceNode = props.nodes.find(n => n.id === props.sourceNodeId);
      if (!sourceNode) return null;

      const sourceHandle = sourceNode.handles?.find(h => h.id === props.sourceHandleId);
      if (!sourceHandle) return null;

      const nodeX = sourceNode.position.x;
      const nodeY = sourceNode.position.y;
      const nodeWidth = sourceNode.size?.width || 220;
      const nodeHeight = sourceNode.size?.height || 72;

      let sourceX = 0;
      let sourceY = 0;

      switch (sourceHandle.position) {
        case 'top':
          sourceX = nodeX + nodeWidth / 2;
          sourceY = nodeY;
          break;
        case 'bottom':
          sourceX = nodeX + nodeWidth / 2;
          sourceY = nodeY + nodeHeight;
          break;
        case 'left':
          sourceX = nodeX;
          sourceY = nodeY + nodeHeight / 2;
          break;
        case 'right':
          sourceX = nodeX + nodeWidth;
          sourceY = nodeY + nodeHeight / 2;
          break;
      }

      return {
        sourceX,
        sourceY
      };
    });

    /**
     * 计算箭头标记配置
     *
     * 缓存箭头尺寸计算，避免重复计算
     */
    const arrowMarkerConfig = computed(() => {
      const zoom = props.viewport.zoom;
      const baseArrowSize = 12;
      const previewArrowSize = Math.max(6, Math.min(24, baseArrowSize * zoom));
      const refX = (2 / baseArrowSize) * previewArrowSize;
      const refY = (6 / baseArrowSize) * previewArrowSize;
      const pathSize = (8 / baseArrowSize) * previewArrowSize;

      return {
        arrowSize: previewArrowSize,
        refX,
        refY,
        pathSize,
        path: `M${refX},${refX} L${refX},${refX + pathSize} L${refX + pathSize},${refY} z`
      };
    });

    /**
     * 计算预览路径
     *
     * 使用缓存的源节点信息和画布位置，减少重复计算
     */
    const previewPath = computed(() => {
      const sourceInfo = sourceNodeInfo.value;
      if (!sourceInfo) return null;

      const rect = canvasRect.value;
      if (!rect) return null;

      // 转换为屏幕坐标（相对于画布容器）
      const screenSourceX = sourceInfo.sourceX * props.viewport.zoom + props.viewport.x;
      const screenSourceY = sourceInfo.sourceY * props.viewport.zoom + props.viewport.y;

      // 鼠标位置需要转换为相对于画布容器的坐标
      const screenTargetX = props.previewPos.x - rect.left;
      const screenTargetY = props.previewPos.y - rect.top;

      // 生成预览路径（贝塞尔曲线）
      const dx = screenTargetX - screenSourceX;
      const controlOffset = 0.5;
      const controlX1 = screenSourceX + dx * controlOffset;
      const controlY1 = screenSourceY;
      const controlX2 = screenTargetX - dx * controlOffset;
      const controlY2 = screenTargetY;

      return {
        path: `M ${screenSourceX},${screenSourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${screenTargetX},${screenTargetY}`,
        strokeWidth: Math.max(1, Math.min(5, 2.5 * props.viewport.zoom))
      };
    });

    return () => {
      const pathData = previewPath.value;
      if (!pathData) return null;

      const arrowConfig = arrowMarkerConfig.value;

      return (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000,
            overflow: 'visible'
          }}
        >
          <defs>
            {/* 使用 key 确保箭头标记在尺寸变化时正确更新，避免不必要的重新创建 */}
            <marker
              key={`preview-arrow-${arrowConfig.arrowSize}`}
              id="flow-preview-arrow"
              markerWidth={arrowConfig.arrowSize}
              markerHeight={arrowConfig.arrowSize}
              refX={arrowConfig.refX}
              refY={arrowConfig.refY}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d={arrowConfig.path}
                fill="#2080f0"
              />
            </marker>
          </defs>
          <path
            d={pathData.path}
            stroke="#2080f0"
            stroke-width={pathData.strokeWidth}
            fill="none"
            stroke-dasharray="5,5"
            marker-end="url(#flow-preview-arrow)"
          />
        </svg>
      );
    };
  }
});

