/**
 * 连接线位置计算 Hook
 *
 * 提供连接线位置计算和缓存功能，优化渲染性能
 */

import { computed, type Ref } from 'vue';
import { useNodesMap } from './useNodesMap';
import { getNodeCenterScreen, getHandlePositionScreen } from '../utils/node-utils';
import { createCache } from '../utils/cache-utils';
import type { FlowEdge, FlowNode, FlowViewport } from '../types';
import type { FlowPosition } from '../types/flow-node';

/**
 * 连接线位置信息
 */
export interface EdgePositions {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceHandleX?: number;
  sourceHandleY?: number;
  targetHandleX?: number;
  targetHandleY?: number;
}

/**
 * 缓存项
 */
interface EdgePositionCacheItem {
  positions: EdgePositions;
  timestamp: number;
}

/**
 * 连接线位置计算 Hook 选项
 */
export interface UseEdgePositionsOptions {
  /** 连接线列表 */
  edges: Ref<FlowEdge[]>;
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 缓存最大大小（默认 500） */
  maxCacheSize?: number;
  /** 缓存清理大小（默认 250） */
  cleanupSize?: number;
  /** 缓存有效期（毫秒，默认 16，约 1 帧） */
  cacheTTL?: number;
}

/**
 * 连接线位置计算 Hook 返回值
 */
export interface UseEdgePositionsReturn {
  /** 获取连接线位置（带缓存） */
  getEdgePositions: (edge: FlowEdge) => EdgePositions | null;
  /** 清除缓存 */
  clearCache: () => void;
}

/**
 * 生成缓存键
 *
 * @param edge 连接线
 * @param sourceNode 源节点
 * @param targetNode 目标节点
 * @param viewport 视口状态
 * @returns 缓存键
 */
function generateCacheKey(
  edge: FlowEdge,
  sourceNode: FlowNode,
  targetNode: FlowNode,
  viewport: FlowViewport
): string {
  // 使用整数坐标和视口信息生成缓存键
  // 使用较大的容差（10px）以提高缓存命中率
  const sourceX = Math.round(sourceNode.position.x / 10);
  const sourceY = Math.round(sourceNode.position.y / 10);
  const targetX = Math.round(targetNode.position.x / 10);
  const targetY = Math.round(targetNode.position.y / 10);
  const viewportX = Math.round(viewport.x / 10);
  const viewportY = Math.round(viewport.y / 10);
  const zoomKey = Math.round(viewport.zoom * 100); // 精确到小数点后 2 位

  return `${edge.id}-${sourceX}-${sourceY}-${targetX}-${targetY}-${viewportX}-${viewportY}-${zoomKey}-${edge.sourceHandle || ''}-${edge.targetHandle || ''}`;
}

/**
 * 计算连接线位置（屏幕坐标）
 *
 * 注意：连接线在 FlowViewportContainer 外部渲染，需要使用屏幕坐标
 *
 * @param edge 连接线
 * @param sourceNode 源节点
 * @param targetNode 目标节点
 * @param viewport 视口状态
 * @returns 连接线位置信息（屏幕坐标）
 */
function calculateEdgePositions(
  edge: FlowEdge,
  sourceNode: FlowNode,
  targetNode: FlowNode,
  viewport: FlowViewport
): EdgePositions {
  // 如果有端口 ID，使用端口位置；否则使用节点中心
  let sourcePos: FlowPosition;
  let targetPos: FlowPosition;

  if (edge.sourceHandle) {
    const handlePos = getHandlePositionScreen(sourceNode, edge.sourceHandle, viewport);
    sourcePos = handlePos || getNodeCenterScreen(sourceNode, viewport);
  } else {
    sourcePos = getNodeCenterScreen(sourceNode, viewport);
  }

  if (edge.targetHandle) {
    const handlePos = getHandlePositionScreen(targetNode, edge.targetHandle, viewport);
    targetPos = handlePos || getNodeCenterScreen(targetNode, viewport);
  } else {
    targetPos = getNodeCenterScreen(targetNode, viewport);
  }

  return {
    sourceX: sourcePos.x,
    sourceY: sourcePos.y,
    targetX: targetPos.x,
    targetY: targetPos.y,
    // 确保端口位置正确传递
    sourceHandleX: edge.sourceHandle ? sourcePos.x : undefined,
    sourceHandleY: edge.sourceHandle ? sourcePos.y : undefined,
    targetHandleX: edge.targetHandle ? targetPos.x : undefined,
    targetHandleY: edge.targetHandle ? targetPos.y : undefined
  };
}

/**
 * 连接线位置计算 Hook
 *
 * 提供带缓存的连接线位置计算功能
 *
 * @param options Hook 选项
 * @returns 位置计算函数和缓存管理
 *
 * @example
 * ```typescript
 * const { getEdgePositions, clearCache } = useEdgePositions({
 *   edges: edgesRef,
 *   nodes: nodesRef,
 *   viewport: viewportRef
 * });
 *
 * const positions = getEdgePositions(edge);
 * ```
 */
export function useEdgePositions(
  options: UseEdgePositionsOptions
): UseEdgePositionsReturn {
  const {
    edges,
    nodes,
    viewport,
    maxCacheSize = 500,
    cleanupSize = 250,
    cacheTTL = 16 // 约 1 帧
  } = options;

  // 节点 Map（用于快速查找）
  const nodesRef = computed(() => nodes.value);
  const { nodesMap } = useNodesMap({ nodes: nodesRef });

  // 位置缓存
  const positionCache = createCache<string, EdgePositionCacheItem>({
    maxSize: maxCacheSize,
    cleanupSize
  });

  /**
   * 获取连接线位置（带缓存）
   *
   * @param edge 连接线
   * @returns 连接线位置信息，如果节点不存在则返回 null
   */
  const getEdgePositions = (edge: FlowEdge): EdgePositions | null => {
    const map = nodesMap.value;
    const sourceNode = map.get(edge.source);
    const targetNode = map.get(edge.target);

    if (!sourceNode || !targetNode) {
      return null;
    }

    const vp = viewport.value;

    // 生成缓存键
    const cacheKey = generateCacheKey(edge, sourceNode, targetNode, vp);

    // 检查缓存
    const cached = positionCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < cacheTTL) {
      return cached.positions;
    }

    // 计算位置
    const positions = calculateEdgePositions(edge, sourceNode, targetNode, vp);

    // 更新缓存
    positionCache.set(cacheKey, {
      positions,
      timestamp: now
    });

    return positions;
  };

  /**
   * 清除缓存
   */
  const clearCache = () => {
    positionCache.clear();
  };

  return {
    getEdgePositions,
    clearCache
  };
}

