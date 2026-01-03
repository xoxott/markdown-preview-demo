/**
 * 节点顺序工具函数
 *
 * 提供节点数组顺序相关的工具函数
 */

import type { FlowNode } from '../types';

/**
 * 按照原始顺序过滤节点
 *
 * 从空间索引查询结果中，按照原始节点数组的顺序过滤节点
 * 确保返回的节点顺序与原始数组一致，避免 DOM 节点顺序变化
 *
 * @param originalNodes 原始节点数组（保持顺序）
 * @param queriedNodes 空间索引查询结果（可能顺序不一致）
 * @param filterFn 可选的额外过滤函数
 * @returns 按照原始顺序过滤后的节点数组
 *
 * @example
 * ```typescript
 * const queriedNodes = spatialIndex.query(bounds);
 * const visibleNodes = filterNodesByOriginalOrder(
 *   nodes.value,
 *   queriedNodes,
 *   (node) => isNodeVisible(node, bounds)
 * );
 * ```
 */
export function filterNodesByOriginalOrder(
  originalNodes: FlowNode[],
  queriedNodes: FlowNode[],
  filterFn?: (node: FlowNode) => boolean
): FlowNode[] {
  // 创建查询结果节点 ID 集合（用于快速查找）
  const queriedNodeIds = new Set(queriedNodes.map(n => n.id));

  // 按照原始数组顺序过滤，只保留在查询结果中的节点
  return originalNodes.filter(node => {
    // 首先检查是否在查询结果中
    if (!queriedNodeIds.has(node.id)) {
      return false;
    }
    // 如果有额外的过滤函数，再次检查
    return filterFn ? filterFn(node) : true;
  });
}

