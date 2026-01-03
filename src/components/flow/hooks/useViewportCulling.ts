/**
 * 视口裁剪 Hook
 *
 * 提供视口裁剪功能，支持空间索引优化和线性查找回退
 */

import { shallowRef, watch, type Ref } from 'vue';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';
import type { SpatialIndex } from '../core/performance/SpatialIndex';
import type { FlowNode, FlowViewport } from '../types';
import { filterNodesByOriginalOrder } from '../utils/node-order-utils';

/**
 * 视口裁剪 Hook 选项
 */
export interface UseViewportCullingOptions {
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 是否启用视口裁剪 */
  enabled: Ref<boolean> | (() => boolean) | boolean;
  /** 视口裁剪缓冲区（像素） */
  buffer?: number;
  /** 空间索引实例（可选，用于优化大量节点） */
  spatialIndex?: Ref<SpatialIndex>;
  /** 使用空间索引的节点数量阈值（默认 50） */
  spatialIndexThreshold?: number;
  /** 默认节点宽度 */
  defaultNodeWidth?: number;
  /** 默认节点高度 */
  defaultNodeHeight?: number;
}

/**
 * 视口裁剪 Hook 返回值
 */
export interface UseViewportCullingReturn {
  /** 可见节点列表（稳定引用，避免不必要的重新渲染） */
  visibleNodes: Ref<FlowNode[]>;
}

/**
 * 计算视口边界（画布坐标）
 *
 * @param viewport 视口状态
 * @param buffer 缓冲区（画布坐标）
 * @returns 视口边界
 */
function calculateViewportBounds(
  viewport: FlowViewport,
  buffer: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  // 获取视口区域（考虑缩放）
  const viewportX = -viewport.x / viewport.zoom;
  const viewportY = -viewport.y / viewport.zoom;
  const viewportWidth = (window.innerWidth || 1000) / viewport.zoom;
  const viewportHeight = (window.innerHeight || 1000) / viewport.zoom;

  // 扩展视口区域（添加缓冲区）
  return {
    minX: viewportX - buffer,
    minY: viewportY - buffer,
    maxX: viewportX + viewportWidth + buffer,
    maxY: viewportY + viewportHeight + buffer
  };
}

/**
 * 检查节点是否与视口相交（线性查找）
 *
 * @param node 节点
 * @param bounds 视口边界
 * @param defaultWidth 默认节点宽度
 * @param defaultHeight 默认节点高度
 * @returns 是否可见
 */
function isNodeVisible(
  node: FlowNode,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  defaultWidth: number,
  defaultHeight: number
): boolean {
  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const nodeWidth = node.size?.width || defaultWidth;
  const nodeHeight = node.size?.height || defaultHeight;

  // 检查节点是否与视口相交
  return (
    nodeX + nodeWidth >= bounds.minX &&
    nodeX <= bounds.maxX &&
    nodeY + nodeHeight >= bounds.minY &&
    nodeY <= bounds.maxY
  );
}

/**
 * 视口裁剪 Hook
 *
 * 自动计算可见节点，支持空间索引优化
 *
 * @param options Hook 选项
 * @returns 可见节点列表
 *
 * @example
 * ```typescript
 * const { visibleNodes } = useViewportCulling({
 *   nodes: nodesRef,
 *   viewport: viewportRef,
 *   enabled: computed(() => enableCulling.value),
 *   spatialIndex: spatialIndexRef
 * });
 * ```
 */
export function useViewportCulling(
  options: UseViewportCullingOptions
): UseViewportCullingReturn {
  const {
    nodes,
    viewport,
    enabled,
    buffer = PERFORMANCE_CONSTANTS.VIEWPORT_CULLING_BUFFER,
    spatialIndex,
    spatialIndexThreshold = PERFORMANCE_CONSTANTS.SPATIAL_INDEX_THRESHOLD,
    defaultNodeWidth = PERFORMANCE_CONSTANTS.DEFAULT_NODE_WIDTH,
    defaultNodeHeight = PERFORMANCE_CONSTANTS.DEFAULT_NODE_HEIGHT
  } = options;

  // 稳定引用，避免不必要的重新渲染
  const visibleNodesRef = shallowRef<FlowNode[]>([]);
  const lastVisibleNodeIds = new Set<string>();

  /**
   * 检查是否启用
   */
  const isEnabled = (): boolean => {
    if (typeof enabled === 'boolean') return enabled;
    if (typeof enabled === 'function') return enabled();
    return enabled.value;
  };

  /**
   * 计算可见节点
   */
  const calculateVisibleNodes = (): FlowNode[] => {
    // 如果禁用视口裁剪，直接返回所有节点
    if (!isEnabled()) {
      return nodes.value;
    }

    // 计算视口边界（画布坐标）
    const bufferInCanvas = buffer / viewport.value.zoom;
    const bounds = calculateViewportBounds(viewport.value, bufferInCanvas);

    // 选择查询策略
    const useSpatialIndex =
      spatialIndex &&
      spatialIndex.value &&
      nodes.value.length > spatialIndexThreshold;

    let newVisibleNodes: FlowNode[];

    if (useSpatialIndex) {
      // 使用空间索引查询（O(log n)）
      const queriedNodes = spatialIndex.value!.query({
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY
      });

      // 按照原始数组顺序过滤，确保 DOM 节点顺序不变
      newVisibleNodes = filterNodesByOriginalOrder(
        nodes.value,
        queriedNodes,
        (node) => isNodeVisible(node, bounds, defaultNodeWidth, defaultNodeHeight)
      );
    } else {
      // 线性查找（节点数量少时使用）
      newVisibleNodes = nodes.value.filter(node =>
        isNodeVisible(node, bounds, defaultNodeWidth, defaultNodeHeight)
      );
    }

    return newVisibleNodes;
  };

  /**
   * 检查节点 ID 集合是否相同
   *
   * @param ids1 第一个 ID 集合
   * @param ids2 第二个 ID 集合
   * @returns 是否相同
   */
  const areNodeIdSetsEqual = (ids1: Set<string>, ids2: Set<string>): boolean => {
    if (ids1.size !== ids2.size) return false;
    for (const id of ids1) {
      if (!ids2.has(id)) return false;
    }
    return true;
  };

  /**
   * 更新可见节点
   *
   * 注意：即使节点集合没有变化，只要 nodes.value 引用变化了，也应该更新
   * 因为节点位置可能已经更新，需要返回最新的节点对象
   */
  const updateVisibleNodes = () => {
    const newVisibleNodes = calculateVisibleNodes();
    const newIds = new Set(newVisibleNodes.map(n => n.id));

    // 检查节点 ID 集合是否变化
    const idsChanged = !areNodeIdSetsEqual(newIds, lastVisibleNodeIds);

    // 检查数组引用是否变化（节点对象可能已更新）
    const arrayRefChanged = visibleNodesRef.value !== newVisibleNodes;

    // 如果节点集合或数组引用变化，更新
    if (idsChanged || arrayRefChanged) {
      visibleNodesRef.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));
    }
  };

  // 监听相关变化，更新可见节点
  watch(
    () => [
      nodes.value,
      isEnabled(),
      viewport.value.x,
      viewport.value.y,
      viewport.value.zoom,
      spatialIndex?.value
    ] as const,
    () => {
      updateVisibleNodes();
    },
    { immediate: true, deep: false }
  );

  return {
    visibleNodes: visibleNodesRef
  };
}

