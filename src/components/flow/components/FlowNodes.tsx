/**
 * Flow 节点列表组件
 *
 * 负责渲染所有节点，支持视口裁剪、虚拟滚动等性能优化
 */

import { defineComponent, computed, type PropType } from 'vue';
import BaseNode from './nodes/BaseNode';
import type { FlowNode, FlowViewport } from '../types';

/**
 * FlowNodes 组件属性
 */
export interface FlowNodesProps {
  /** 节点列表 */
  nodes: FlowNode[];
  /** 选中的节点 ID 列表 */
  selectedNodeIds?: string[];
  /** 锁定的节点 ID 列表 */
  lockedNodeIds?: string[];
  /** 视口状态 */
  viewport?: FlowViewport;
  /** 是否启用视口裁剪 */
  enableViewportCulling?: boolean;
  /** 视口裁剪缓冲区（像素） */
  viewportCullingBuffer?: number;
  /** 节点点击事件 */
  onNodeClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点双击事件 */
  onNodeDoubleClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽开始 */
  onNodeDragStart?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽 */
  onNodeDrag?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽结束 */
  onNodeDragStop?: (node: FlowNode, event: MouseEvent) => void;
  /** 端口鼠标按下 */
  onPortMouseDown?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标抬起 */
  onPortMouseUp?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标进入 */
  onPortMouseEnter?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标离开 */
  onPortMouseLeave?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 节点鼠标按下 */
  onNodeMouseDown?: (node: FlowNode, event: MouseEvent) => void;
}

/**
 * Flow 节点列表组件
 */
export default defineComponent({
  name: 'FlowNodes',
  props: {
    nodes: {
      type: Array as PropType<FlowNode[]>,
      required: true
    },
    selectedNodeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    lockedNodeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    enableViewportCulling: {
      type: Boolean,
      default: true
    },
    viewportCullingBuffer: {
      type: Number,
      default: 200
    },
    onNodeClick: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDoubleClick: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDragStart: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDrag: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDragStop: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseDown: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseUp: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseEnter: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseLeave: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onNodeMouseDown: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    }
  },
  setup(props) {
    // 计算可见节点（视口裁剪）
    const visibleNodes = computed(() => {
      if (!props.enableViewportCulling) {
        return props.nodes;
      }

      // 获取视口区域（考虑缩放）
      const viewportX = -props.viewport.x / props.viewport.zoom;
      const viewportY = -props.viewport.y / props.viewport.zoom;
      const viewportWidth = (window.innerWidth || 1000) / props.viewport.zoom;
      const viewportHeight = (window.innerHeight || 1000) / props.viewport.zoom;

      // 扩展视口区域（添加缓冲区）
      const buffer = props.viewportCullingBuffer / props.viewport.zoom;
      const minX = viewportX - buffer;
      const minY = viewportY - buffer;
      const maxX = viewportX + viewportWidth + buffer;
      const maxY = viewportY + viewportHeight + buffer;

      // 过滤可见节点
      return props.nodes.filter(node => {
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        const nodeWidth = node.size?.width || 220;
        const nodeHeight = node.size?.height || 72;

        // 检查节点是否与视口相交
        return (
          nodeX + nodeWidth >= minX &&
          nodeX <= maxX &&
          nodeY + nodeHeight >= minY &&
          nodeY <= maxY
        );
      });
    });

    // 计算节点状态
    const getNodeState = (node: FlowNode) => {
      const isSelected = props.selectedNodeIds.includes(node.id);
      const isLocked = props.lockedNodeIds.includes(node.id);

      return {
        selected: isSelected || node.selected === true,
        locked: isLocked || node.locked === true,
        hovered: false, // 可以通过鼠标事件更新
        dragging: false // 可以通过拖拽事件更新
      };
    };

    // 计算节点样式（使用原始画布坐标，由父容器 CSS transform 处理缩放）
    const getNodeStyle = (node: FlowNode) => {
      // 节点使用原始画布坐标，缩放由父容器的 CSS transform 处理
      // 这样与 ai-workflow 的实现保持一致
      const x = node.position.x;
      const y = node.position.y;

      return {
        position: 'absolute' as const,
        left: `${x}px`,
        top: `${y}px`,
        // 节点大小使用原始尺寸，由 CSS transform scale 自动缩放
        width: node.size?.width ? `${node.size.width}px` : '220px',
        height: node.size?.height ? `${node.size.height}px` : '72px',
        pointerEvents: 'auto' as const,
        willChange: 'transform' as const,
        backfaceVisibility: 'hidden' as const,
        perspective: '1000px'
      };
    };

    // 事件处理
    const handleNodeClick = (node: FlowNode, event: MouseEvent) => {
      if (props.onNodeClick) {
        props.onNodeClick(node, event);
      }
    };

    const handleNodeDoubleClick = (node: FlowNode, event: MouseEvent) => {
      if (props.onNodeDoubleClick) {
        props.onNodeDoubleClick(node, event);
      }
    };

    return () => (
      <div class="flow-nodes" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {visibleNodes.value.map(node => {
          const state = getNodeState(node);
          const style = getNodeStyle(node);

          return (
            <div
              key={node.id}
              style={style}
              onClick={(event: MouseEvent) => handleNodeClick(node, event)}
              onDblclick={(event: MouseEvent) => handleNodeDoubleClick(node, event)}
              onMousedown={(event: MouseEvent) => {
                if (props.onNodeMouseDown) {
                  props.onNodeMouseDown(node, event);
                }
              }}
            >
              <BaseNode
                node={node}
                selected={state.selected}
                locked={state.locked}
                hovered={state.hovered}
                dragging={state.dragging}
                onPort-mousedown={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseDown) {
                    props.onPortMouseDown(nodeId, handleId, handleType, event);
                  }
                }}
                onPort-mouseup={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseUp) {
                    props.onPortMouseUp(nodeId, handleId, handleType, event);
                  }
                }}
                onPort-mouseenter={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseEnter) {
                    props.onPortMouseEnter(nodeId, handleId, handleType, event);
                  }
                }}
                onPort-mouseleave={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseLeave) {
                    props.onPortMouseLeave(nodeId, handleId, handleType, event);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }
});

