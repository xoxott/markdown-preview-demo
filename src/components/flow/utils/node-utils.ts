/**
 * 节点工具函数
 *
 * 提供节点位置计算、端口位置计算等功能
 */

import { canvasToScreen } from './math-utils';
import { getNodeCenter as getNodeCenterCanvas } from './layout-utils';
import type { FlowNode, FlowViewport } from '../types';
import type { FlowPosition } from '../types/flow-node';

/**
 * 计算节点中心位置（屏幕坐标）
 *
 * @param node 节点
 * @param viewport 视口状态
 * @returns 屏幕坐标的中心位置
 */
export function getNodeCenterScreen(
  node: FlowNode,
  viewport: FlowViewport
): FlowPosition {
  // 先获取画布坐标的中心
  const centerCanvas = getNodeCenterCanvas(node);
  // 转换为屏幕坐标
  return canvasToScreen(centerCanvas.x, centerCanvas.y, viewport);
}

/**
 * 计算端口位置（屏幕坐标）
 *
 * @param node 节点
 * @param handleId 端口 ID
 * @param viewport 视口状态
 * @returns 屏幕坐标的端口位置，如果端口不存在则返回 null
 */
export function getHandlePositionScreen(
  node: FlowNode,
  handleId: string,
  viewport: FlowViewport
): FlowPosition | null {
  const handle = node.handles?.find(h => h.id === handleId);
  if (!handle) {
    return null;
  }

  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const nodeWidth = node.size?.width || 220;
  const nodeHeight = node.size?.height || 72;

  let handleX = 0;
  let handleY = 0;

  // 根据端口位置计算坐标（画布坐标）
  switch (handle.position) {
    case 'top':
      handleX = nodeX + nodeWidth / 2;
      handleY = nodeY;
      break;
    case 'bottom':
      handleX = nodeX + nodeWidth / 2;
      handleY = nodeY + nodeHeight;
      break;
    case 'left':
      handleX = nodeX;
      handleY = nodeY + nodeHeight / 2;
      break;
    case 'right':
      handleX = nodeX + nodeWidth;
      handleY = nodeY + nodeHeight / 2;
      break;
  }

  // 转换为屏幕坐标
  return canvasToScreen(handleX, handleY, viewport);
}

