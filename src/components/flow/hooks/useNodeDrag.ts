/**
 * 节点拖拽 Hook
 *
 * 处理节点的拖拽功能，基于通用的 useDrag hook 实现。
 * 支持坐标转换（屏幕坐标 -> 画布坐标）、点击/拖拽区分等。
 */

import { ref, type Ref } from 'vue';
import { useDrag } from './useDrag';
import type { FlowConfig, FlowViewport, FlowNode } from '../types';

export interface UseNodeDragOptions {
  /** 画布配置 */
  config: Ref<Readonly<FlowConfig>>;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 节点 Map（用于快速查找） */
  nodesMap: Ref<Map<string, FlowNode>>;
  /** 更新节点位置的回调 */
  onNodePositionUpdate: (nodeId: string, x: number, y: number) => void;
}

export interface UseNodeDragReturn {
  /** 正在拖拽的节点 ID */
  draggingNodeId: Ref<string | null>;
  /** 是否点击被阻止（用于区分拖拽和点击） */
  nodeClickBlocked: Ref<boolean>;
  /** 处理节点鼠标按下事件 */
  handleNodeMouseDown: (node: FlowNode, event: MouseEvent) => void;
  /** 处理节点鼠标移动事件 */
  handleNodeMouseMove: (event: MouseEvent) => void;
  /** 处理节点鼠标抬起事件 */
  handleNodeMouseUp: () => void;
}

/**
 * 节点拖拽 Hook
 *
 * 基于通用的 useDrag hook 实现节点拖拽功能。
 * 支持坐标转换（屏幕坐标 -> 画布坐标）、点击/拖拽区分等。
 *
 * @param options 节点拖拽配置选项
 * @returns 节点拖拽相关的状态和方法
 */
export function useNodeDrag(options: UseNodeDragOptions): UseNodeDragReturn {
  const { config, viewport, nodesMap, onNodePositionUpdate } = options;

  /** 正在拖拽的节点 ID（用于 z-index 管理） */
  const draggingNodeId = ref<string | null>(null);

  /** 是否点击被阻止（用于区分拖拽和点击） */
  const nodeClickBlocked = ref(false);

  /** 当前拖拽的节点 ID（内部使用） */
  let currentNodeId: string | null = null;

  /** 点击阻止定时器 */
  let nodeClickBlockTimeout: number | null = null;

  // 使用通用的拖拽 hook
  const drag = useDrag({

    // 坐标转换：屏幕坐标偏移 -> 画布坐标偏移
    // 对于节点拖拽，只需要将屏幕坐标偏移量除以缩放比例即可
    transformCoordinates: (screenX, screenY, startScreenX, startScreenY, startNodeX, startNodeY) => {

      // 计算屏幕坐标偏移
      const screenDeltaX = screenX - startScreenX;
      const screenDeltaY = screenY - startScreenY;

      // 将屏幕坐标偏移转换为画布坐标偏移（除以缩放比例）
      // 注意：节点位置已经是画布坐标，所以只需要转换偏移量
      const deltaX = screenDeltaX / viewport.value.zoom;
      const deltaY = screenDeltaY / viewport.value.zoom;

      // 计算新的节点位置（画布坐标）
      return {
        x: startNodeX + deltaX,
        y: startNodeY + deltaY,
        deltaX: screenDeltaX,
        deltaY: screenDeltaY
      };
    },

    // 拖拽更新回调
    onDrag: (result) => {
      if (currentNodeId) {
        onNodePositionUpdate(currentNodeId, result.x, result.y);
      }
    },

    // 拖拽结束回调：处理点击/拖拽区分
    onDragEnd: (hasMoved) => {
      if (hasMoved) {
        // 如果发生了拖拽移动，阻止后续的点击事件
        nodeClickBlocked.value = true;

        // 清除之前的定时器
        if (nodeClickBlockTimeout) {
          clearTimeout(nodeClickBlockTimeout);
        }

        // 在短时间内清除阻止标志（300ms 后清除）
        nodeClickBlockTimeout = window.setTimeout(() => {
          nodeClickBlocked.value = false;
          nodeClickBlockTimeout = null;
        }, 300);
      }

      // 清除拖拽节点 ID（恢复 z-index）
      draggingNodeId.value = null;
      currentNodeId = null;
    }
  });

  /**
   * 处理节点鼠标按下事件
   *
   * 检查节点是否可拖拽，记录节点信息，开始拖拽
   *
   * @param node 节点对象
   * @param event 鼠标按下事件
   */
  const handleNodeMouseDown = (node: FlowNode, event: MouseEvent) => {
    // 检查是否点击在端口上
    const target = event.target as HTMLElement;
    if (target.closest('.flow-handle')) {
      return;
    }

    // 检查节点是否可拖拽
    const draggable = node.draggable !== false && config.value.nodes?.draggable !== false;
    if (!draggable || node.locked) {
      return;
    }

    // 记录拖拽节点 ID（用于提升 z-index）
    draggingNodeId.value = node.id;
    currentNodeId = node.id;

    // 开始拖拽（传入节点的初始位置）
    drag.handleMouseDown(event, node.position.x, node.position.y);

    event.stopPropagation();
  };

  return {
    draggingNodeId,
    nodeClickBlocked,
    handleNodeMouseDown,
    handleNodeMouseMove: drag.handleMouseMove,
    handleNodeMouseUp: drag.handleMouseUp
  };
}

