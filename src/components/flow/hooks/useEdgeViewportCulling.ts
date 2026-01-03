/**
 * 连接线视口裁剪 Hook
 *
 * 提供连接线的视口裁剪功能，优化大量连接线时的渲染性能
 */

import { computed, type Ref } from 'vue';
import { useNodesMap } from './useNodesMap';
import { getNodeCenterScreen } from '../utils/node-utils';
import type { FlowEdge, FlowNode, FlowViewport } from '../types';

/**
 * 连接线视口裁剪 Hook 选项
 */
export interface UseEdgeViewportCullingOptions {
  /** 连接线列表 */
  edges: Ref<FlowEdge[]>;
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 是否启用视口裁剪 */
  enabled?: boolean | Ref<boolean> | (() => boolean);
}

/**
 * 连接线视口裁剪 Hook 返回值
 */
export interface UseEdgeViewportCullingReturn {
  /** 可见连接线列表 */
  visibleEdges: Ref<FlowEdge[]>;
}

/**
 * 检查是否启用
 */
function isEnabled(
  enabled?: boolean | Ref<boolean> | (() => boolean)
): boolean {
  if (enabled === undefined) return true;
  if (typeof enabled === 'boolean') return enabled;
  if (typeof enabled === 'function') return enabled();
  return enabled.value;
}

/**
 * 连接线视口裁剪 Hook
 *
 * 自动计算可见连接线，优化渲染性能
 *
 * @param options Hook 选项
 * @returns 可见连接线列表
 *
 * @example
 * ```typescript
 * const { visibleEdges } = useEdgeViewportCulling({
 *   edges: edgesRef,
 *   nodes: nodesRef,
 *   viewport: viewportRef,
 *   enabled: true
 * });
 * ```
 */
export function useEdgeViewportCulling(
  options: UseEdgeViewportCullingOptions
): UseEdgeViewportCullingReturn {
  const {
    edges,
    nodes,
    viewport,
    enabled = true
  } = options;

  // 节点 Map（用于快速查找）
  const nodesRef = computed(() => nodes.value);
  const { nodesMap } = useNodesMap({ nodes: nodesRef });

  // 计算可见连接线
  const visibleEdges = computed(() => {
    // 如果禁用视口裁剪，直接返回所有连接线
    if (!isEnabled(enabled)) {
      return edges.value;
    }

    const map = nodesMap.value;
    const vp = viewport.value;
    const screenWidth = window.innerWidth || 1000;
    const screenHeight = window.innerHeight || 1000;

    // 计算视口边界（屏幕坐标）
    const viewportMinX = 0;
    const viewportMaxX = screenWidth;
    const viewportMinY = 0;
    const viewportMaxY = screenHeight;

    return edges.value.filter(edge => {
      const sourceNode = map.get(edge.source);
      const targetNode = map.get(edge.target);

      if (!sourceNode || !targetNode) {
        return false;
      }

      // 计算源节点和目标节点的屏幕坐标中心
      const sourceCenter = getNodeCenterScreen(sourceNode, vp);
      const targetCenter = getNodeCenterScreen(targetNode, vp);

      // 检查连接线的起点和终点是否在视口内
      // 或者连接线是否穿过视口
      const sourceInViewport =
        sourceCenter.x >= viewportMinX &&
        sourceCenter.x <= viewportMaxX &&
        sourceCenter.y >= viewportMinY &&
        sourceCenter.y <= viewportMaxY;

      const targetInViewport =
        targetCenter.x >= viewportMinX &&
        targetCenter.x <= viewportMaxX &&
        targetCenter.y >= viewportMinY &&
        targetCenter.y <= viewportMaxY;

      // 如果起点或终点在视口内，则可见
      if (sourceInViewport || targetInViewport) {
        return true;
      }

      // 检查连接线是否穿过视口（简单检查：起点和终点在视口两侧）
      const sourceLeft = sourceCenter.x < viewportMinX;
      const sourceRight = sourceCenter.x > viewportMaxX;
      const targetLeft = targetCenter.x < viewportMinX;
      const targetRight = targetCenter.x > viewportMaxX;

      // 如果起点和终点分别在视口两侧，则连接线穿过视口
      return (
        (sourceLeft && targetRight) ||
        (sourceRight && targetLeft) ||
        (sourceCenter.y < viewportMinY && targetCenter.y > viewportMaxY) ||
        (sourceCenter.y > viewportMaxY && targetCenter.y < viewportMinY)
      );
    });
  });

  return {
    visibleEdges
  };
}

