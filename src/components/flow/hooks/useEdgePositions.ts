/**
 * 连接线位置计算 Hook
 *
 * 提供连接线位置计算和缓存功能，优化渲染性能
 */

import { computed, type Ref } from 'vue';
import { useNodesMap } from './useNodesMap';
import { getNodeCenterScreen, getHandlePositionScreen } from '../utils/node-utils';
import { createCache } from '../utils/cache-utils';
import { floorCoordinate, roundZoomKey } from '../utils/cache-key-utils';
import type { FlowEdge, FlowNode, FlowViewport } from '../types';
import type { FlowPosition } from '../types/flow-node';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';

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
  /** 正在拖拽的节点 ID 集合（用于动态调整缓存 TTL） */
  draggingNodeIds?: Ref<Set<string>>;
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
  // 使用整数坐标（精确到像素）生成缓存键
  // 提高缓存命中率，同时保持足够的精度
  const sourceX = floorCoordinate(sourceNode.position.x);
  const sourceY = floorCoordinate(sourceNode.position.y);
  const targetX = floorCoordinate(targetNode.position.x);
  const targetY = floorCoordinate(targetNode.position.y);

  // 视口坐标也使用整数
  const viewportX = floorCoordinate(viewport.x);
  const viewportY = floorCoordinate(viewport.y);

  // 缩放值精确到小数点后 3 位（0.001 精度）
  const zoomKey = roundZoomKey(viewport.zoom);

  return `${edge.id}-${sourceX}-${sourceY}-${targetX}-${targetY}-${viewportX}-${viewportY}-${zoomKey}-${edge.sourceHandle || ''}-${edge.targetHandle || ''}`;
}

/**
 * 获取节点或端口的屏幕位置
 *
 * @param node 节点
 * @param handleId 端口 ID（可选）
 * @param viewport 视口状态
 * @returns 屏幕坐标位置
 */
function getNodeOrHandlePosition(
  node: FlowNode,
  handleId: string | undefined,
  viewport: FlowViewport
): FlowPosition {
  if (handleId) {
    const handlePos = getHandlePositionScreen(node, handleId, viewport);
    return handlePos || getNodeCenterScreen(node, viewport);
  }
  return getNodeCenterScreen(node, viewport);
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
  // 获取源节点/端口位置
  const sourcePos = getNodeOrHandlePosition(sourceNode, edge.sourceHandle, viewport);

  // 获取目标节点/端口位置
  const targetPos = getNodeOrHandlePosition(targetNode, edge.targetHandle, viewport);

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
    maxCacheSize = PERFORMANCE_CONSTANTS.EDGE_POSITION_CACHE_MAX_SIZE,
    cleanupSize = PERFORMANCE_CONSTANTS.EDGE_POSITION_CACHE_CLEANUP_SIZE,
    cacheTTL,
    draggingNodeIds
  } = options;

  /**
   * 根据节点数量动态调整缓存 TTL
   *
   * 小规模场景（< 50 节点）：使用较长的 TTL，减少计算
   * 中规模场景（50-500 节点）：使用标准 TTL
   * 大规模场景（>= 500 节点）：使用较短的 TTL，确保实时性
   */
  const dynamicCacheTTL = computed(() => {
    if (cacheTTL !== undefined) {
      return cacheTTL;
    }
    const nodeCount = nodes.value.length;
    const {
      EDGE_POSITION_CACHE_TTL_SMALL,
      EDGE_POSITION_CACHE_TTL_MEDIUM,
      EDGE_POSITION_CACHE_TTL_LARGE,
      EDGE_POSITION_CACHE_NODE_THRESHOLD_SMALL,
      EDGE_POSITION_CACHE_NODE_THRESHOLD_MEDIUM
    } = PERFORMANCE_CONSTANTS;

    if (nodeCount < EDGE_POSITION_CACHE_NODE_THRESHOLD_SMALL) {
      return EDGE_POSITION_CACHE_TTL_SMALL;
    }
    if (nodeCount < EDGE_POSITION_CACHE_NODE_THRESHOLD_MEDIUM) {
      return EDGE_POSITION_CACHE_TTL_MEDIUM;
    }
    return EDGE_POSITION_CACHE_TTL_LARGE;
  });

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

    // 如果节点正在拖拽，降低缓存 TTL 以确保实时更新
    const isDragging = draggingNodeIds?.value && (
      draggingNodeIds.value.has(edge.source) ||
      draggingNodeIds.value.has(edge.target)
    );
    const effectiveTTL = isDragging
      ? dynamicCacheTTL.value / PERFORMANCE_CONSTANTS.EDGE_POSITION_CACHE_DRAGGING_TTL_DIVISOR
      : dynamicCacheTTL.value;

    if (cached && now - cached.timestamp < effectiveTTL) {
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

