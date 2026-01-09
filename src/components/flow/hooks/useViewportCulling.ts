/**
 * 视口裁剪 Hook
 *
 * 提供视口裁剪功能，支持空间索引优化和线性查找回退
 */

import { shallowRef, watch, type Ref, computed } from 'vue';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';
import type { SpatialIndex } from '../core/performance/SpatialIndex';
import type { FlowNode, FlowViewport } from '../types';
import { filterNodesByOriginalOrder } from '../utils/node-order-utils';
import { isBoolean, isFunction } from '../utils/type-utils';
import { useRafThrottle } from './useRafThrottle';
import { performanceMonitor } from '../utils/performance-monitor';

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
  /** 是否正在平移画布（平移时暂停视口裁剪更新以优化性能） */
  isPanning?: Ref<boolean>;
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
    defaultNodeHeight = PERFORMANCE_CONSTANTS.DEFAULT_NODE_HEIGHT,
    isPanning
  } = options;

  // 稳定引用，避免不必要的重新渲染
  const visibleNodesRef = shallowRef<FlowNode[]>([]);
  const lastVisibleNodeIds = new Set<string>();

  /**
   * 检查是否启用
   */
  const enabledRef = computed(() => {
    if (isBoolean(enabled)) return enabled;
    if (isFunction(enabled)) return enabled();
    return enabled.value;
  });

  /**
   * 计算可见节点
   */
  const calculateVisibleNodes = (): FlowNode[] => {
    const perfStart = performance.now();

    // 如果禁用视口裁剪，直接返回所有节点
    if (!enabledRef.value) return nodes.value;

    // 计算视口边界（画布坐标）
    const bufferInCanvas = buffer / viewport.value.zoom;
    const bounds = calculateViewportBounds(viewport.value, bufferInCanvas);

    // 选择查询策略
    const useSpatialIndex =
      spatialIndex &&
      spatialIndex.value &&
      nodes.value.length > spatialIndexThreshold;

    let newVisibleNodes: FlowNode[];
    const queryStart = performance.now();

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
      const queryTime = performance.now();

      // 按照原始数组顺序过滤，确保 DOM 节点顺序不变
      const filterStart = performance.now();
      newVisibleNodes = filterNodesByOriginalOrder(
        nodes.value,
        queriedNodes,
        (node) => isNodeVisible(node, bounds, defaultNodeWidth, defaultNodeHeight)
      );
      const filterTime = performance.now();

      const totalTime = performance.now() - perfStart;
      performanceMonitor.record('viewportCulling', totalTime, {
        nodesCount: nodes.value.length,
        visibleCount: newVisibleNodes.length,
        usedSpatialIndex: true,
        queryTime: queryTime - queryStart,
        filterTime: filterTime - filterStart,
        isPanning: isPanning?.value
      });

      // 如果视口裁剪耗时超过阈值，立即输出警告
      if (totalTime > 5) {
        console.warn('[Performance] viewportCulling 耗时:', totalTime.toFixed(2) + 'ms', {
          nodesCount: nodes.value.length,
          visibleCount: newVisibleNodes.length,
          queryTime: (queryTime - queryStart).toFixed(2) + 'ms',
          filterTime: (filterTime - filterStart).toFixed(2) + 'ms',
          isPanning: isPanning?.value
        });
      }
    } else {
      // 线性查找（节点数量少时使用）
      newVisibleNodes = nodes.value.filter(node =>
        isNodeVisible(node, bounds, defaultNodeWidth, defaultNodeHeight)
      );

      const totalTime = performance.now() - perfStart;
      performanceMonitor.record('viewportCulling', totalTime, {
        nodesCount: nodes.value.length,
        visibleCount: newVisibleNodes.length,
        usedSpatialIndex: false,
        isPanning: isPanning?.value
      });

      // 如果视口裁剪耗时超过阈值，立即输出警告
      if (totalTime > 5) {
        console.warn('[Performance] viewportCulling 耗时:', totalTime.toFixed(2) + 'ms', {
          nodesCount: nodes.value.length,
          visibleCount: newVisibleNodes.length,
          isPanning: isPanning?.value
        });
      }
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
   * 性能优化：只有当可见节点 ID 集合真正变化时才更新引用
   * 避免因 viewport 变化但可见节点列表不变时的不必要重新渲染
   *
   * 注意：即使节点 ID 集合没变，如果节点对象引用变化了（比如节点位置更新），
   * 也需要更新 visibleNodesRef，否则 FlowNodes 无法检测到节点位置变化
   */
  const updateVisibleNodes = () => {
    const updateStart = performance.now();
    const newVisibleNodes = calculateVisibleNodes();
    const newIds = new Set(newVisibleNodes.map(n => n.id));

    // 检查节点 ID 集合是否变化
    const idsChanged = !areNodeIdSetsEqual(newIds, lastVisibleNodeIds);

    // 检查节点对象引用是否变化（重要：节点位置更新时，节点对象引用会变化）
    // 如果节点 ID 集合没变，但节点对象引用变化了，说明节点数据更新了（比如位置）
    const nodesRefChanged = idsChanged ||
      visibleNodesRef.value.length !== newVisibleNodes.length ||
      visibleNodesRef.value.some((node, index) => node !== newVisibleNodes[index]);

    // 只有当节点 ID 集合或节点对象引用变化时才更新
    // 这样可以避免因 viewport 变化但可见节点列表不变时的不必要重新渲染
    // 但也能检测到节点位置更新（节点对象引用变化）
    if (nodesRefChanged) {
      visibleNodesRef.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));

      const updateTime = performance.now() - updateStart;
      if (updateTime > 1 || idsChanged) {
        console.log('[Performance] useViewportCulling 更新可见节点:', {
          time: updateTime.toFixed(3) + 'ms',
          visibleCount: newVisibleNodes.length,
          idsChanged,
          nodesRefChanged
        });
      }
    } else {
      // 节点 ID 集合和节点对象引用都没变化，不更新引用，避免 FlowNodes 重新渲染
      const updateTime = performance.now() - updateStart;
      if (updateTime > 1) {
        console.log('[Performance] useViewportCulling 跳过更新（可见节点未变化）:', {
          time: updateTime.toFixed(3) + 'ms',
          visibleCount: newVisibleNodes.length,
          idsChanged: false,
          nodesRefChanged: false
        });
      }
    }
  };

  const { throttled: throttledUpdateVisibleNodes, cancel: cancelThrottledUpdate } = useRafThrottle(
    updateVisibleNodes,
    { immediate: false }
  );


  // 1. 监听节点变化、启用状态、空间索引变化（这些变化应该立即更新）
  watch(
    () => [nodes.value, enabledRef.value, spatialIndex?.value] as const,
    () => {
      const watchStart = performance.now();

      // 节点变化时立即更新，取消待执行的节流更新
      cancelThrottledUpdate();
      updateVisibleNodes();

      const watchTime = performance.now() - watchStart;
      performanceMonitor.record('nodesWatch', watchTime, {
        nodesCount: nodes.value.length,
        enabled: enabledRef.value,
        hasSpatialIndex: !!spatialIndex?.value
      });

      // 记录所有 watch 触发（用于调试）
      console.log('[Performance] nodesWatch 触发:', {
        time: watchTime.toFixed(3) + 'ms',
        nodesCount: nodes.value.length,
        enabled: enabledRef.value
      });
    },
    { immediate: true, deep: false }
  );

  // 2. 监听视口变化（x, y, zoom）
  watch(
    () => [viewport.value.x, viewport.value.y, viewport.value.zoom] as const,
    () => {
      const watchStart = performance.now();

      if (isPanning?.value) {
        // 平移时使用 RAF 节流，减少更新频率（每帧最多一次）
        throttledUpdateVisibleNodes();
      } else {
        // 非平移时立即更新（正常交互）
        cancelThrottledUpdate();
        updateVisibleNodes();
      }

      const watchTime = performance.now() - watchStart;
      performanceMonitor.record('viewportWatch', watchTime, {
        isPanning: isPanning?.value,
        viewportX: viewport.value.x,
        viewportY: viewport.value.y
      });

    },
    { immediate: false, deep: false }
  );

  // 3. 监听平移状态变化：平移结束时立即更新一次
  if (isPanning) {
    watch(
      () => isPanning.value,
      (isPanningNow, wasPanning) => {
        if (wasPanning === true && !isPanningNow) {
          cancelThrottledUpdate();
          updateVisibleNodes();
        }
      }
    );
  }

  return {
    visibleNodes: visibleNodesRef
  };
}

