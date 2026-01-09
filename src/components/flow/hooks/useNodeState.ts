/**
 * 节点状态管理 Hook
 *
 * 提供节点状态计算和缓存功能，避免不必要的重新渲染
 */

import { computed, type Ref } from 'vue';
import { createCache } from '../utils/cache-utils';
import { useCachedSet } from '../utils/set-utils';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';
import type { FlowNode } from '../types';

/**
 * 节点状态
 */
export interface NodeState {
  /** 是否选中 */
  selected: boolean;
  /** 是否锁定 */
  locked: boolean;
  /** 是否悬停 */
  hovered: boolean;
  /** 是否拖拽中 */
  dragging: boolean;
}

/**
 * 节点状态 Hook 选项
 */
export interface UseNodeStateOptions {
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 选中的节点 ID 列表 */
  selectedNodeIds: Ref<string[]>;
  /** 锁定的节点 ID 列表 */
  lockedNodeIds?: Ref<string[]>;
  /** 正在拖拽的节点 ID */
  draggingNodeId?: Ref<string | null>;
}

/**
 * 节点状态 Hook 返回值
 */
export interface UseNodeStateReturn {
  /** 获取节点状态（带缓存） */
  getNodeState: (node: FlowNode) => NodeState;
  /** 清除缓存 */
  clearCache: () => void;
}

/**
 * 节点状态管理 Hook
 *
 * 自动计算节点状态并缓存，避免不必要的重新渲染
 *
 * @param options Hook 选项
 * @returns 节点状态相关功能
 *
 * @example
 * ```typescript
 * const { getNodeState } = useNodeState({
 *   nodes: nodesRef,
 *   selectedNodeIds: selectedNodeIdsRef,
 *   lockedNodeIds: lockedNodeIdsRef,
 *   draggingNodeId: draggingNodeIdRef
 * });
 *
 * const state = getNodeState(node);
 * ```
 */
export function useNodeState(
  options: UseNodeStateOptions
): UseNodeStateReturn {
  const {
    nodes,
    selectedNodeIds,
    lockedNodeIds,
    draggingNodeId
  } = options;

  // 性能优化：使用缓存的 Set，避免每次计算都创建新 Set
  const selectedNodeIdsSet = useCachedSet(selectedNodeIds);
  const lockedNodeIdsSet = lockedNodeIds ? useCachedSet(lockedNodeIds) : computed(() => new Set<string>());

  const stateCache = createCache<string, NodeState>({
    maxSize: PERFORMANCE_CONSTANTS.CACHE_MAX_SIZE,
    cleanupSize: PERFORMANCE_CONSTANTS.CACHE_CLEANUP_SIZE
  });

  /**
   * 获取节点状态（带缓存）
   *
   * @param node 节点
   * @returns 节点状态
   */
  // 性能优化：使用 WeakMap 缓存节点状态，避免字符串拼接开销
  // 使用节点对象本身作为键的一部分，结合状态标志
  const nodeStateCache = new WeakMap<FlowNode, Map<string, NodeState>>();

  const getNodeState = (node: FlowNode): NodeState => {
    const isSelected = selectedNodeIdsSet.value.has(node.id);
    const isLocked = lockedNodeIdsSet.value.has(node.id);
    const isDragging = draggingNodeId?.value === node.id;

    const selected = isSelected || node.selected === true;
    const locked = isLocked || node.locked === true;

    // 性能优化：使用数字位标志作为缓存键，避免字符串拼接
    // 使用位运算组合状态标志：selected(1) | locked(2) | dragging(4)
    const stateFlags = (selected ? 1 : 0) | (locked ? 2 : 0) | (isDragging ? 4 : 0);
    const cacheKey = `${node.id}|${stateFlags}`;

    // 先检查通用缓存
    const cached = stateCache.get(cacheKey);
    if (cached) {
      return cached; // 返回相同引用，避免重新渲染
    }

    // 检查节点级别的缓存
    let nodeCache = nodeStateCache.get(node);
    if (!nodeCache) {
      nodeCache = new Map();
      nodeStateCache.set(node, nodeCache);
    }

    const nodeCached = nodeCache.get(cacheKey);
    if (nodeCached) {
      // 同时更新通用缓存
      stateCache.set(cacheKey, nodeCached);
      return nodeCached;
    }

    const state: NodeState = {
      selected,
      locked,
      hovered: false, // 可以通过鼠标事件更新
      dragging: isDragging
    };

    // 同时更新两个缓存
    stateCache.set(cacheKey, state);
    nodeCache.set(cacheKey, state);

    return state;
  };

  /**
   * 清除缓存
   */
  const clearCache = () => {
    stateCache.clear();
  };

  return {
    getNodeState,
    clearCache
  };
}

