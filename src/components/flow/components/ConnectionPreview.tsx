/**
 * 连接预览线组件
 *
 * 显示正在创建连接时的预览线
 */

import { defineComponent, computed, ref, watch, type PropType } from 'vue';
import { getHandlePositionScreen } from '../utils/node-utils';
import { generateEdgePath } from '../utils/edge-path-generator';
import {
  ARROW_SIZES,
  ARROW_PATH_RATIOS,
  EDGE_COLORS,
  STROKE_WIDTHS,
  ANIMATION_CONSTANTS
} from '../constants/edge-constants';
import type { FlowNode, FlowViewport, FlowEdge } from '../types';
import type { EdgePositions } from '../hooks/useEdgePositions';

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
     * 缓存源端口位置（屏幕坐标）
     *
     * 使用 watch 替代 computed，只在节点/端口变化时重新计算
     * 避免每次 nodes 数组变化都重新计算
     * 直接使用工具函数获取屏幕坐标，避免重复计算
     */
    const sourceHandlePosition = ref<{ x: number; y: number } | null>(null);

    /**
     * 更新源端口位置
     */
    const updateSourceHandlePosition = () => {
      const sourceNode = props.nodes.find(n => n.id === props.sourceNodeId);
      if (!sourceNode) {
        sourceHandlePosition.value = null;
        return;
      }

      // 使用工具函数直接获取屏幕坐标
      const position = getHandlePositionScreen(sourceNode, props.sourceHandleId, props.viewport);
      sourceHandlePosition.value = position;
    };

    // 只在节点 ID、端口 ID 变化时重新计算
    watch(
      () => [props.sourceNodeId, props.sourceHandleId] as const,
      () => {
        updateSourceHandlePosition();
      },
      { immediate: true }
    );

    // 监听源节点位置变化（如果节点被拖拽）
    watch(
      () => {
        const sourceNode = props.nodes.find(n => n.id === props.sourceNodeId);
        return sourceNode ? [sourceNode.position.x, sourceNode.position.y] : null;
      },
      () => {
        if (props.sourceNodeId && props.sourceHandleId) {
          updateSourceHandlePosition();
        }
      },
      { immediate: false }
    );

    /**
     * 计算箭头标记配置
     *
     * 使用常量替代魔术数字，复用连接线的箭头配置逻辑
     * 使用 Math.round 减少精度变化导致的重新计算
     */
    const arrowMarkerConfig = computed(() => {
      const zoom = Math.round(props.viewport.zoom * 100) / 100;

      const previewArrowSize = Math.max(
        ARROW_SIZES.MIN,
        Math.min(ARROW_SIZES.MAX, ARROW_SIZES.BASE * zoom)
      );

      const refX = ARROW_PATH_RATIOS.REF_X * previewArrowSize;
      const refY = ARROW_PATH_RATIOS.REF_Y * previewArrowSize;
      const pathSize = ARROW_PATH_RATIOS.PATH_SIZE * previewArrowSize;

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
     * 复用连接线的路径生成逻辑，使用工具函数生成贝塞尔曲线路径
     */
    const previewPath = computed(() => {
      const sourcePos = sourceHandlePosition.value;
      if (!sourcePos) return null;

      const rect = canvasRect.value;
      if (!rect) return null;

      // 鼠标位置需要转换为相对于画布容器的坐标（屏幕坐标）
      const screenTargetX = props.previewPos.x - rect.left;
      const screenTargetY = props.previewPos.y - rect.top;

      // 构造 EdgePositions 对象，用于复用路径生成逻辑
      const positions: EdgePositions = {
        sourceX: sourcePos.x,
        sourceY: sourcePos.y,
        targetX: screenTargetX,
        targetY: screenTargetY,
        sourceHandleX: sourcePos.x,
        sourceHandleY: sourcePos.y
      };

      // 构造临时 Edge 对象，使用贝塞尔曲线类型
      const previewEdge: FlowEdge = {
        id: 'preview',
        source: props.sourceNodeId,
        target: 'preview-target',
        type: 'bezier',
        sourceHandle: props.sourceHandleId
      };

      // 预览线默认显示箭头
      const showArrow = true;

      // 使用工具函数生成路径
      const path = generateEdgePath(previewEdge, positions, {
        showArrow,
        viewport: props.viewport
      });

      const strokeWidth = Math.max(
        STROKE_WIDTHS.MIN,
        Math.min(STROKE_WIDTHS.MAX, STROKE_WIDTHS.BASE * props.viewport.zoom)
      );

      return {
        path,
        strokeWidth,
        showArrow
      };
    });

    return () => {
      const pathData = previewPath.value;
      if (!pathData) return null;

      const arrowConfig = arrowMarkerConfig.value;
      const showArrow = pathData.showArrow;

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
          {showArrow && (
            <defs>
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
                  fill={EDGE_COLORS.DEFAULT}
                />
              </marker>
            </defs>
          )}
          <path
            d={pathData.path}
            stroke={EDGE_COLORS.DEFAULT}
            stroke-width={pathData.strokeWidth}
            fill="none"
            stroke-dasharray={ANIMATION_CONSTANTS.DASH_ARRAY}
            marker-end={showArrow ? "url(#flow-preview-arrow)" : undefined}
          />
        </svg>
      );
    };
  }
});

