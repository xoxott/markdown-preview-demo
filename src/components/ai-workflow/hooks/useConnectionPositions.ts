/**
 * 连接线位置计算 Hook
 *
 * 高性能计算连接线的屏幕坐标位置
 */

import { computed, type Ref } from 'vue';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  PORT_SIZE,
  PORT_GAP,
  PORT_RADIUS,
  PORT_OFFSET_SCALED
} from '../constants/node-dimensions';
import type { Viewport } from '../types';

export interface ConnectionPosition {
  source: { x: number; y: number } | null;
  target: { x: number; y: number } | null;
}

export interface UseConnectionPositionsOptions {
  nodes: Ref<Api.Workflow.WorkflowNode[]>;
  connections: Ref<Api.Workflow.Connection[]>;
  viewport: Ref<Viewport>;
}

/**
 * 计算端口的屏幕位置（返回端口圆圈的精确中心点）
 */
function calculatePortPosition(
  node: Api.Workflow.WorkflowNode,
  portId: string,
  portType: 'input' | 'output',
  zoom: number,
  viewportX: number,
  viewportY: number
): { x: number; y: number } {
  // 节点在屏幕上的位置（已考虑视口变换）
  const nodeX = node.position.x * zoom + viewportX;
  const nodeY = node.position.y * zoom + viewportY;

  // 获取端口列表
  const ports = portType === 'output' ? node.outputs : node.inputs;

  // 计算端口中心X坐标
  // 节点容器现在使用自定义div，宽度固定为220px（包含border）
  // 端口容器：left/right: '-10px'，端口元素宽度20px
  // 端口圆圈中心正好在节点的左/右边缘
  const portCenterX = portType === 'output'
    ? nodeX + NODE_WIDTH * zoom  // 输出端口：节点右边缘
    : nodeX;                      // 输入端口：节点左边缘

  // 如果没有端口或端口列表为空，返回节点中心位置
  if (!ports || ports.length === 0) {
    return {
      x: portCenterX,
      y: nodeY + (NODE_HEIGHT * zoom) / 2
    };
  }

  // 查找端口索引
  const portIndex = ports.findIndex(p => p.id === portId);

  // 如果找不到端口，返回节点中心位置
  if (portIndex === -1) {
    return {
      x: portCenterX,
      y: nodeY + (NODE_HEIGHT * zoom) / 2
    };
  }

  // 计算端口Y坐标
  // 端口容器：top: '50%', transform: 'translateY(-50%)'，从节点中心垂直居中
  // 端口之间：gap: '10px'
  // 端口大小：20px（包含边框）
  const portCount = ports.length;

  // 容器高度 = 所有端口高度 + 间隙
  const totalPortsHeight = portCount * PORT_SIZE + (portCount - 1) * PORT_GAP;

  // 容器顶部位置（考虑 translateY(-50%)）
  const containerTop = nodeY + (NODE_HEIGHT * zoom) / 2 - (totalPortsHeight * zoom) / 2;

  // 当前端口顶部位置
  const portTop = containerTop + portIndex * (PORT_SIZE + PORT_GAP) * zoom;

  // 端口中心Y坐标 = 端口顶部 + 端口半径
  const portCenterY = portTop + PORT_RADIUS * zoom;

  return {
    x: portCenterX,
    y: portCenterY
  };
}

/**
 * 连接线位置计算 Hook
 *
 * 优化策略：
 * 1. 使用预计算的常量
 * 2. 减少对象创建和内存分配
 * 3. 内联计算避免函数调用开销
 * 4. 使用 for-of 循环代替 forEach
 * 5. 使用 Map 缓存节点查找
 */
export function useConnectionPositions(options: UseConnectionPositionsOptions) {
  const { nodes, connections, viewport } = options;

  /**
   * 节点映射表缓存
   */
  const nodeMapCache = computed(() => {
    const map = new Map<string, Api.Workflow.WorkflowNode>();
    nodes.value.forEach(node => map.set(node.id, node));
    return map;
  });

  /**
   * 连接线位置计算
   */
  const connectionPositions = computed(() => {
    const { x: viewX, y: viewY, zoom } = viewport.value;
    const nodeMap = nodeMapCache.value;
    const conns = connections.value;

    const positions = new Map<string, ConnectionPosition>();

    // 批量计算所有连接线的位置
    for (const conn of conns) {
      const sourceNode = nodeMap.get(conn.sourceNodeId);
      const targetNode = nodeMap.get(conn.targetNodeId);

      // 计算源端口位置（输出端口）
      const sourcePos = sourceNode
        ? calculatePortPosition(sourceNode, conn.sourcePortId, 'output', zoom, viewX, viewY)
        : null;

      // 计算目标端口位置（输入端口）
      const targetPos = targetNode
        ? calculatePortPosition(targetNode, conn.targetPortId, 'input', zoom, viewX, viewY)
        : null;

      positions.set(conn.id, { source: sourcePos, target: targetPos });
    }

    return positions;
  });

  return {
    connectionPositions,
    nodeMapCache
  };
}

