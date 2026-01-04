/**
 * 空间索引管理 Hook
 *
 * 提供空间索引的创建、更新和管理功能，支持增量更新优化
 */

import { ref, markRaw, watch, onUnmounted, type Ref, computed } from 'vue';
import { useRafThrottle } from './useRafThrottle';
import { SpatialIndex } from '../core/performance/SpatialIndex';
import { floorCoordinate } from '../utils/cache-key-utils';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';
import type { FlowNode } from '../types';

/**
 * 空间索引 Hook 选项
 */
export interface UseSpatialIndexOptions {
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 是否启用空间索引 */
  enabled?: Ref<boolean> | (() => boolean) | boolean;
  /** 默认节点宽度 */
  defaultWidth?: number;
  /** 默认节点高度 */
  defaultHeight?: number;
  /** 增量更新阈值（变化节点占比，默认 0.1 即 10%） */
  incrementalThreshold?: number;
}

/**
 * 空间索引 Hook 返回值
 */
export interface UseSpatialIndexReturn {
  /** 空间索引实例 */
  spatialIndex: Ref<SpatialIndex>;
  /** 手动更新空间索引 */
  updateIndex: () => void;
  /** 清理资源 */
  cleanup: () => void;
}

/**
 * 计算节点位置哈希值
 *
 * 使用位运算快速计算哈希，用于检测节点位置变化
 * 优化：只计算前 N 个节点，提升大规模场景下的性能
 *
 * @param nodes 节点列表
 * @returns 哈希值
 */
function getNodesPositionHash(nodes: FlowNode[]): number {
  let hash = 0;
  const { SPATIAL_INDEX_HASH_MAX_NODES, HASH_SHIFT_BITS } = PERFORMANCE_CONSTANTS;

  // 只计算前 N 个节点，对于大规模场景性能更好
  // 如果节点数量变化，哈希值也会变化，足以检测到变化
  const len = Math.min(nodes.length, SPATIAL_INDEX_HASH_MAX_NODES);
  for (let i = 0; i < len; i++) {
    const n = nodes[i];
    // 使用整数坐标计算哈希，减少精度变化的影响
    const x = floorCoordinate(n.position.x);
    const y = floorCoordinate(n.position.y);
    // 使用位运算计算哈希（标准哈希算法：hash = hash * 31 + value）
    hash = ((hash << HASH_SHIFT_BITS) - hash) + x;
    hash = ((hash << HASH_SHIFT_BITS) - hash) + y;
    hash = hash | 0; // Convert to 32bit integer
  }
  // 将节点数量也加入哈希，确保节点数量变化时哈希值变化
  hash = ((hash << HASH_SHIFT_BITS) - hash) + nodes.length;
  hash = hash | 0;
  return hash;
}

/**
 * 空间索引管理 Hook
 *
 * 自动管理空间索引的创建和更新，支持增量更新优化
 *
 * @param options Hook 选项
 * @returns 空间索引相关功能
 *
 * @example
 * ```typescript
 * const { spatialIndex, updateIndex } = useSpatialIndex({
 *   nodes: nodesRef,
 *   enabled: computed(() => enableCulling.value)
 * });
 * ```
 */
export function useSpatialIndex(
  options: UseSpatialIndexOptions
): UseSpatialIndexReturn {
  const {
    nodes,
    enabled = true,
    defaultWidth = PERFORMANCE_CONSTANTS.DEFAULT_NODE_WIDTH,
    defaultHeight = PERFORMANCE_CONSTANTS.DEFAULT_NODE_HEIGHT,
    incrementalThreshold
  } = options;

  /**
   * 动态调整增量更新阈值，根据节点数量智能选择策略
   *
   * 小规模场景（< 100 节点）：使用较高的阈值（20%），减少全量更新
   * 中规模场景（100-1000 节点）：使用标准阈值（10%）
   * 大规模场景（>= 1000 节点）：使用较低的阈值（5%），更频繁地使用增量更新
   */
  const dynamicIncrementalThreshold = computed(() => {
    if (incrementalThreshold !== undefined) {
      return incrementalThreshold;
    }
    const nodeCount = nodes.value.length;
    const {
      SPATIAL_INDEX_INCREMENTAL_THRESHOLD_SMALL,
      SPATIAL_INDEX_INCREMENTAL_THRESHOLD_MEDIUM,
      SPATIAL_INDEX_INCREMENTAL_THRESHOLD_LARGE,
      SPATIAL_INDEX_NODE_THRESHOLD_SMALL,
      SPATIAL_INDEX_NODE_THRESHOLD_MEDIUM
    } = PERFORMANCE_CONSTANTS;

    if (nodeCount < SPATIAL_INDEX_NODE_THRESHOLD_SMALL) {
      return SPATIAL_INDEX_INCREMENTAL_THRESHOLD_SMALL;
    }
    if (nodeCount < SPATIAL_INDEX_NODE_THRESHOLD_MEDIUM) {
      return SPATIAL_INDEX_INCREMENTAL_THRESHOLD_MEDIUM;
    }
    return SPATIAL_INDEX_INCREMENTAL_THRESHOLD_LARGE;
  });

  // 使用 markRaw 标记 SpatialIndex 实例，避免 Vue 对其进行深度响应式处理
  // SpatialIndex 是一个纯数据结构和算法类，不需要响应式
  const spatialIndex = ref(markRaw(new SpatialIndex({ defaultWidth, defaultHeight }))) as Ref<SpatialIndex>;

  // 位置缓存，用于检测变化的节点
  const lastNodePositions = new Map<string, { x: number; y: number }>();
  let lastHash = 0;

  /**
   * 检查是否启用
   */
  const isEnabled = (): boolean => {
    if (typeof enabled === 'boolean') return enabled;
    if (typeof enabled === 'function') return enabled();
    return enabled.value;
  };

  /**
   * 更新节点位置缓存
   *
   * 抽象重复的位置缓存更新逻辑
   *
   * @param nodesToUpdate 要更新的节点列表
   */
  const updateNodePositionsCache = (nodesToUpdate: FlowNode[]): void => {
    lastNodePositions.clear();
    for (const node of nodesToUpdate) {
      lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
    }
  };

  /**
   * 更新空间索引
   *
   * 智能选择增量更新或全量更新：
   * - 变化节点 < 10%：使用增量更新（O(log n)）
   * - 变化节点 >= 10%：使用全量更新（O(n log n)）
   */
  const updateSpatialIndex = () => {
    if (!isEnabled() || nodes.value.length === 0) {
      return;
    }

    // 检测变化的节点
    const changedNodeIds = new Set<string>();

    for (const node of nodes.value) {
      const lastPos = lastNodePositions.get(node.id);
      if (!lastPos || lastPos.x !== node.position.x || lastPos.y !== node.position.y) {
        changedNodeIds.add(node.id);
        lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
      }
    }

    // 如果变化的节点很少（< 阈值），使用增量更新
    const threshold = dynamicIncrementalThreshold.value;
    if (changedNodeIds.size > 0 && changedNodeIds.size < nodes.value.length * threshold) {
      // 增量更新：只更新变化的节点
      for (const nodeId of changedNodeIds) {
        const node = nodes.value.find(n => n.id === nodeId);
        if (node) {
          spatialIndex.value.updateNode(node);
        }
      }
    } else if (changedNodeIds.size > 0) {
      // 全量更新：变化太多时，全量更新更快
      spatialIndex.value.updateNodes(nodes.value);
      // 更新位置缓存
      updateNodePositionsCache(nodes.value);
    }
  };

  // 使用 RAF 节流更新空间索引
  const { throttled: throttledUpdateSpatialIndex, cancel: cancelThrottledUpdate } = useRafThrottle(
    updateSpatialIndex,
    { enabled: () => isEnabled() && nodes.value.length > 0 }
  );

  // 监听节点数量变化（立即更新空间索引）
  watch(
    () => nodes.value.length,
    () => {
      if (isEnabled() && nodes.value.length > 0) {
        spatialIndex.value.updateNodes(nodes.value);
        lastHash = getNodesPositionHash(nodes.value);
        // 更新位置缓存
        updateNodePositionsCache(nodes.value);
      }
    },
    { immediate: true }
  );

  // 监听节点位置变化（使用 RAF 节流优化性能）
  watch(
    () => getNodesPositionHash(nodes.value),
    (newHash) => {
      // 如果哈希没变化，跳过更新
      if (newHash === lastHash) {
        return;
      }

      lastHash = newHash;
      // 使用 RAF 节流更新空间索引
      throttledUpdateSpatialIndex();
    },
    { deep: false }
  );

  /**
   * 手动更新空间索引
   */
  const updateIndex = () => {
    if (isEnabled() && nodes.value.length > 0) {
      spatialIndex.value.updateNodes(nodes.value);
      lastHash = getNodesPositionHash(nodes.value);
      updateNodePositionsCache(nodes.value);
    }
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    cancelThrottledUpdate();
    lastNodePositions.clear();
  };

  onUnmounted(() => {
    cleanup();
  });

  return {
    spatialIndex,
    updateIndex,
    cleanup
  };
}

