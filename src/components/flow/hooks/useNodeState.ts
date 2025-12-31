/**
 * 节点状态管理 Hook
 *
 * 提供节点状态计算和缓存功能，避免不必要的重新渲染
 */

import { computed, type Ref } from 'vue';
import { createCache } from '../utils/cache-utils';
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

  const selectedNodeIdsSet = computed(() => new Set(selectedNodeIds.value));
  const lockedNodeIdsSet = computed(() =>
    lockedNodeIds ? new Set(lockedNodeIds.value) : new Set<string>()
  );
  const stateCache = createCache<string, NodeState>({
    maxSize: 500,
    cleanupSize: 100
  });

  /**
   * 获取节点状态（带缓存）
   *
   * @param node 节点
   * @returns 节点状态
   */
  const getNodeState = (node: FlowNode): NodeState => {
    const isSelected = selectedNodeIdsSet.value.has(node.id);
    const isLocked = lockedNodeIdsSet.value.has(node.id);
    const isDragging = draggingNodeId?.value === node.id;

    const selected = isSelected || node.selected === true;
    const locked = isLocked || node.locked === true;

    // 生成缓存键
    const cacheKey = `${node.id}-${selected}-${locked}-${isDragging}`;

    // 检查缓存
    const cached = stateCache.get(cacheKey);
    if (cached) {
      return cached; // 返回相同引用，避免重新渲染
    }

    const state: NodeState = {
      selected,
      locked,
      hovered: false, // 可以通过鼠标事件更新
      dragging: isDragging
    };

    stateCache.set(cacheKey, state);

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

