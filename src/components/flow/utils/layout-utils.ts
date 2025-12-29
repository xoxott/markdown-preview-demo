/**
 * Flow 布局工具函数
 * 
 * 提供节点对齐、分布、排序等布局功能
 */

import type { FlowNode, FlowPosition, FlowSize } from '../types/flow-node';

/**
 * 对齐方向
 */
export type AlignDirection = 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical';

/**
 * 分布方向
 */
export type DistributeDirection = 'horizontal' | 'vertical';

/**
 * 对齐节点
 * 
 * @param nodes 节点列表
 * @param direction 对齐方向
 * @returns 更新后的节点位置
 */
export function alignNodes(
  nodes: FlowNode[],
  direction: AlignDirection
): Map<string, FlowPosition> {
  if (nodes.length === 0) {
    return new Map();
  }

  const positions = new Map<string, FlowPosition>();

  switch (direction) {
    case 'left': {
      const minX = Math.min(...nodes.map(n => n.position.x));
      nodes.forEach(node => {
        positions.set(node.id, { ...node.position, x: minX });
      });
      break;
    }

    case 'right': {
      const maxX = Math.max(
        ...nodes.map(n => n.position.x + (n.size?.width || 220))
      );
      nodes.forEach(node => {
        const nodeWidth = node.size?.width || 220;
        positions.set(node.id, { ...node.position, x: maxX - nodeWidth });
      });
      break;
    }

    case 'top': {
      const minY = Math.min(...nodes.map(n => n.position.y));
      nodes.forEach(node => {
        positions.set(node.id, { ...node.position, y: minY });
      });
      break;
    }

    case 'bottom': {
      const maxY = Math.max(
        ...nodes.map(n => n.position.y + (n.size?.height || 72))
      );
      nodes.forEach(node => {
        const nodeHeight = node.size?.height || 72;
        positions.set(node.id, { ...node.position, y: maxY - nodeHeight });
      });
      break;
    }

    case 'center-horizontal': {
      const minX = Math.min(...nodes.map(n => n.position.x));
      const maxX = Math.max(
        ...nodes.map(n => n.position.x + (n.size?.width || 220))
      );
      const centerX = (minX + maxX) / 2;
      nodes.forEach(node => {
        const nodeWidth = node.size?.width || 220;
        positions.set(node.id, {
          ...node.position,
          x: centerX - nodeWidth / 2
        });
      });
      break;
    }

    case 'center-vertical': {
      const minY = Math.min(...nodes.map(n => n.position.y));
      const maxY = Math.max(
        ...nodes.map(n => n.position.y + (n.size?.height || 72))
      );
      const centerY = (minY + maxY) / 2;
      nodes.forEach(node => {
        const nodeHeight = node.size?.height || 72;
        positions.set(node.id, {
          ...node.position,
          y: centerY - nodeHeight / 2
        });
      });
      break;
    }
  }

  return positions;
}

/**
 * 分布节点
 * 
 * @param nodes 节点列表
 * @param direction 分布方向
 * @param spacing 间距（可选，如果不提供则均匀分布）
 * @returns 更新后的节点位置
 */
export function distributeNodes(
  nodes: FlowNode[],
  direction: DistributeDirection,
  spacing?: number
): Map<string, FlowPosition> {
  if (nodes.length <= 1) {
    return new Map();
  }

  const positions = new Map<string, FlowPosition>();

  if (direction === 'horizontal') {
    // 按 X 坐标排序
    const sortedNodes = [...nodes].sort(
      (a, b) => a.position.x - b.position.x
    );

    if (spacing !== undefined) {
      // 固定间距
      let currentX = sortedNodes[0].position.x;
      sortedNodes.forEach(node => {
        positions.set(node.id, { ...node.position, x: currentX });
        currentX += (node.size?.width || 220) + spacing;
      });
    } else {
      // 均匀分布
      const firstNode = sortedNodes[0];
      const lastNode = sortedNodes[sortedNodes.length - 1];
      const firstX = firstNode.position.x;
      const lastX =
        lastNode.position.x + (lastNode.size?.width || 220);
      const totalWidth = lastX - firstX;

      // 计算所有节点的总宽度
      const totalNodeWidth = sortedNodes.reduce(
        (sum, node) => sum + (node.size?.width || 220),
        0
      );

      // 计算间距
      const gap = (totalWidth - totalNodeWidth) / (sortedNodes.length - 1);

      let currentX = firstX;
      sortedNodes.forEach(node => {
        positions.set(node.id, { ...node.position, x: currentX });
        currentX += (node.size?.width || 220) + gap;
      });
    }
  } else {
    // 按 Y 坐标排序
    const sortedNodes = [...nodes].sort(
      (a, b) => a.position.y - b.position.y
    );

    if (spacing !== undefined) {
      // 固定间距
      let currentY = sortedNodes[0].position.y;
      sortedNodes.forEach(node => {
        positions.set(node.id, { ...node.position, y: currentY });
        currentY += (node.size?.height || 72) + spacing;
      });
    } else {
      // 均匀分布
      const firstNode = sortedNodes[0];
      const lastNode = sortedNodes[sortedNodes.length - 1];
      const firstY = firstNode.position.y;
      const lastY =
        lastNode.position.y + (lastNode.size?.height || 72);
      const totalHeight = lastY - firstY;

      // 计算所有节点的总高度
      const totalNodeHeight = sortedNodes.reduce(
        (sum, node) => sum + (node.size?.height || 72),
        0
      );

      // 计算间距
      const gap = (totalHeight - totalNodeHeight) / (sortedNodes.length - 1);

      let currentY = firstY;
      sortedNodes.forEach(node => {
        positions.set(node.id, { ...node.position, y: currentY });
        currentY += (node.size?.height || 72) + gap;
      });
    }
  }

  return positions;
}

/**
 * 排序节点
 * 
 * @param nodes 节点列表
 * @param direction 排序方向
 * @returns 排序后的节点列表
 */
export function sortNodes(
  nodes: FlowNode[],
  direction: 'x' | 'y' | 'x-reverse' | 'y-reverse'
): FlowNode[] {
  const sorted = [...nodes];

  switch (direction) {
    case 'x':
      sorted.sort((a, b) => a.position.x - b.position.x);
      break;
    case 'y':
      sorted.sort((a, b) => a.position.y - b.position.y);
      break;
    case 'x-reverse':
      sorted.sort((a, b) => b.position.x - a.position.x);
      break;
    case 'y-reverse':
      sorted.sort((a, b) => b.position.y - a.position.y);
      break;
  }

  return sorted;
}

/**
 * 网格对齐（将节点对齐到网格）
 * 
 * @param nodes 节点列表
 * @param gridSize 网格大小
 * @returns 更新后的节点位置
 */
export function snapToGrid(
  nodes: FlowNode[],
  gridSize: number
): Map<string, FlowPosition> {
  const positions = new Map<string, FlowPosition>();

  nodes.forEach(node => {
    const snappedX = Math.round(node.position.x / gridSize) * gridSize;
    const snappedY = Math.round(node.position.y / gridSize) * gridSize;
    positions.set(node.id, { x: snappedX, y: snappedY });
  });

  return positions;
}

/**
 * 计算节点中心点
 * 
 * @param node 节点
 * @returns 中心点坐标
 */
export function getNodeCenter(node: FlowNode): FlowPosition {
  const width = node.size?.width || 220;
  const height = node.size?.height || 72;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2
  };
}

/**
 * 计算多个节点的中心点
 * 
 * @param nodes 节点列表
 * @returns 中心点坐标
 */
export function getNodesCenter(nodes: FlowNode[]): FlowPosition {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;

  nodes.forEach(node => {
    const center = getNodeCenter(node);
    sumX += center.x;
    sumY += center.y;
  });

  return {
    x: sumX / nodes.length,
    y: sumY / nodes.length
  };
}

/**
 * 将节点移动到指定位置（保持相对位置）
 * 
 * @param nodes 节点列表
 * @param targetCenter 目标中心点
 * @returns 更新后的节点位置
 */
export function moveNodesToCenter(
  nodes: FlowNode[],
  targetCenter: FlowPosition
): Map<string, FlowPosition> {
  if (nodes.length === 0) {
    return new Map();
  }

  const currentCenter = getNodesCenter(nodes);
  const deltaX = targetCenter.x - currentCenter.x;
  const deltaY = targetCenter.y - currentCenter.y;

  const positions = new Map<string, FlowPosition>();

  nodes.forEach(node => {
    positions.set(node.id, {
      x: node.position.x + deltaX,
      y: node.position.y + deltaY
    });
  });

  return positions;
}

