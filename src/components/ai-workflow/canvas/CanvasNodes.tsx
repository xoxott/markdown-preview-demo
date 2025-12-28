/**
 * 画布节点层组件
 * 负责渲染所有工作流节点
 */

import { defineComponent, h, type PropType } from 'vue';
import { NODE_TYPES } from '../nodes/NodeRegistry';

export interface CanvasNodesProps {
  nodes: Api.Workflow.WorkflowNode[];
  selectedNodeIds: string[];
  lockedNodeIds: string[];
  onNodeMouseDown: (nodeId: string, e: MouseEvent) => void;
  onNodeClick: (nodeId: string, e: MouseEvent) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeToggleLock: (nodeId: string) => void;
  onPortMouseDown: (nodeId: string, portId: string, portType: 'input' | 'output', e: MouseEvent) => void;
  onPortMouseUp: (nodeId: string, portId: string, portType: 'input' | 'output', e: MouseEvent) => void;
}

export default defineComponent({
  name: 'CanvasNodes',
  props: {
    nodes: {
      type: Array as PropType<Api.Workflow.WorkflowNode[]>,
      required: true
    },
    selectedNodeIds: {
      type: Array as PropType<string[]>,
      required: true
    },
    lockedNodeIds: {
      type: Array as PropType<string[]>,
      required: true
    },
    onNodeMouseDown: {
      type: Function as PropType<(nodeId: string, e: MouseEvent) => void>,
      required: true
    },
    onNodeClick: {
      type: Function as PropType<(nodeId: string, e: MouseEvent) => void>,
      required: true
    },
    onNodeDelete: {
      type: Function as PropType<(nodeId: string) => void>,
      required: true
    },
    onNodeToggleLock: {
      type: Function as PropType<(nodeId: string) => void>,
      required: true
    },
    onPortMouseDown: {
      type: Function as PropType<(nodeId: string, portId: string, portType: 'input' | 'output', e: MouseEvent) => void>,
      required: true
    },
    onPortMouseUp: {
      type: Function as PropType<(nodeId: string, portId: string, portType: 'input' | 'output', e: MouseEvent) => void>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <>
        {props.nodes.map(node => {
          const NodeComponent = NODE_TYPES[node.type]?.component;
          if (!NodeComponent) return null;

          // 预先计算节点状态
          const isSelected = props.selectedNodeIds.includes(node.id);
          const isLocked = props.lockedNodeIds.includes(node.id);

          return (
            <div
              key={node.id}
              class="absolute"
              style={{
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                pointerEvents: 'auto',
                cursor: isLocked ? 'not-allowed' : 'move',
                willChange: 'transform',
                // 使用 GPU 加速
                backfaceVisibility: 'hidden',
                perspective: '1000px'
              }}
              onMousedown={(e: MouseEvent) => {
                if (e.button === 0) {
                  props.onNodeMouseDown(node.id, e);
                }
              }}
              onMouseup={(e: MouseEvent) => {
                if (e.button === 0) {
                  props.onNodeClick(node.id, e);
                }
              }}
            >
              {h(NodeComponent, {
                id: node.id,
                type: node.type,
                data: {
                  label: node.name,
                  description: node.description
                },
                config: node.config,
                inputs: node.inputs,
                outputs: node.outputs,
                selected: isSelected,
                locked: isLocked,
                onDelete: props.onNodeDelete,
                onToggleLock: props.onNodeToggleLock,
                onPortMouseDown: props.onPortMouseDown,
                onPortMouseUp: props.onPortMouseUp
              })}
            </div>
          );
        })}
      </>
    );
  }
});

