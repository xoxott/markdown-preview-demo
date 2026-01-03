/**
 * 增量更新工具函数
 *
 * 提供数组增量更新相关的工具函数
 */

import type { FlowNode } from '../../../types/flow-node';

/**
 * 节点位置比较结果
 */
export interface NodePositionComparison {
  /** 位置是否变化 */
  positionChanged: boolean;
  /** 节点是否更新 */
  isUpdated: boolean;
}

/**
 * 比较节点位置是否变化
 *
 * @param oldNode 旧节点
 * @param newNode 新节点
 * @returns 比较结果
 */
export function compareNodePosition(
  oldNode: FlowNode,
  newNode: FlowNode
): NodePositionComparison {
  const positionChanged =
    oldNode.position.x !== newNode.position.x ||
    oldNode.position.y !== newNode.position.y;

  return {
    positionChanged,
    isUpdated: positionChanged
  };
}

/**
 * 增量更新节点数组
 *
 * 按照原始数组顺序构建新数组，只更新变化的节点，保持其他节点引用不变
 *
 * @param originalNodes 原始节点数组（保持顺序）
 * @param lastNodesArray 上次返回的节点数组
 * @param updatedNodeIds 已更新的节点 ID 集合
 * @returns 更新后的节点数组和是否有变化
 *
 * @example
 * ```typescript
 * const { result, hasChanges } = incrementalUpdateNodes(
 *   this.nodes,
 *   this.lastNodesArray,
 *   this.updatedNodeIds
 * );
 * ```
 */
export function incrementalUpdateNodes(
  originalNodes: FlowNode[],
  lastNodesArray: FlowNode[],
  updatedNodeIds: Set<string>
): { result: FlowNode[]; hasChanges: boolean } {
  const result: FlowNode[] = [];
  let hasChanges = false;

  // 创建旧节点映射（用于快速查找）
  const oldNodeMap = new Map<string, FlowNode>();
  for (const oldNode of lastNodesArray) {
    oldNodeMap.set(oldNode.id, oldNode);
  }

  // 按照原始数组顺序构建结果数组
  for (const currentNode of originalNodes) {
    const nodeId = currentNode.id;
    const oldNode = oldNodeMap.get(nodeId);

    // 节点不存在于旧数组中（新节点）
    if (!oldNode) {
      result.push({ ...currentNode });
      hasChanges = true;
      continue;
    }

    // 节点被更新了
    if (updatedNodeIds.has(nodeId)) {
      const comparison = compareNodePosition(oldNode, currentNode);

      if (comparison.positionChanged) {
        // 位置变化了，创建新对象
        result.push({ ...currentNode });
        hasChanges = true;
      } else {
        // 位置没变化，保持原引用
        result.push(oldNode);
      }
    } else {
      // 节点没被更新，保持原引用
      result.push(oldNode);
    }
  }

  return { result, hasChanges };
}

