/**
 * 节点 Map 管理 Hook
 *
 * 提供节点列表到 Map 的转换，支持 O(1) 查找
 */

import { computed, type Ref } from 'vue';
import type { FlowNode } from '../types';

/**
 * 节点 Map Hook 选项
 */
export interface UseNodesMapOptions {
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
}

/**
 * 节点 Map Hook 返回值
 */
export interface UseNodesMapReturn {
  /** 节点 Map（id -> node） */
  nodesMap: Ref<Map<string, FlowNode>>;
  /** 根据 ID 获取节点 */
  getNodeById: (id: string) => FlowNode | undefined;
}

/**
 * 节点 Map 管理 Hook
 *
 * 将节点列表转换为 Map，提供 O(1) 查找性能
 *
 * @param options Hook 选项
 * @returns 节点 Map 相关功能
 *
 * @example
 * ```typescript
 * const { nodesMap, getNodeById } = useNodesMap({
 *   nodes: nodesRef
 * });
 *
 * const node = getNodeById('node-1');
 * ```
 */
export function useNodesMap(
  options: UseNodesMapOptions
): UseNodesMapReturn {
  const { nodes } = options;

  // 将节点列表转换为 Map（O(1) 查找）
  const nodesMap = computed(() => {
    return new Map(nodes.value.map(n => [n.id, n]));
  });

  /**
   * 根据 ID 获取节点
   *
   * @param id 节点 ID
   * @returns 节点或 undefined
   */
  const getNodeById = (id: string): FlowNode | undefined => {
    return nodesMap.value.get(id);
  };

  return {
    nodesMap,
    getNodeById
  };
}

