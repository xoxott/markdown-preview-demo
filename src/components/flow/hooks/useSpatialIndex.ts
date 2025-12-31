/**
 * 空间索引管理 Hook
 *
 * 提供空间索引的创建、更新和管理功能，支持增量更新优化
 */

import { ref, watch, onUnmounted, type Ref } from 'vue';
import { useRafThrottle } from './useRafThrottle';
import { SpatialIndex } from '../core/performance/SpatialIndex';
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
 *
 * @param nodes 节点列表
 * @returns 哈希值
 */
function getNodesPositionHash(nodes: FlowNode[]): number {
  let hash = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    // 使用位运算计算哈希
    hash = ((hash << 5) - hash) + n.position.x;
    hash = ((hash << 5) - hash) + n.position.y;
    hash = hash | 0; // Convert to 32bit integer
  }
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
    defaultWidth = 220,
    defaultHeight = 72,
    incrementalThreshold = 0.1
  } = options;

  const spatialIndex = ref(new SpatialIndex({ defaultWidth, defaultHeight })) as Ref<SpatialIndex>;

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
    if (changedNodeIds.size > 0 && changedNodeIds.size < nodes.value.length * incrementalThreshold) {
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
      lastNodePositions.clear();
      for (const node of nodes.value) {
        lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
      }
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
        lastNodePositions.clear();
        for (const node of nodes.value) {
          lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
        }
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
      lastNodePositions.clear();
      for (const node of nodes.value) {
        lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
      }
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

