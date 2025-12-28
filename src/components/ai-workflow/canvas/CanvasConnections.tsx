/**
 * 画布连接线层组件
 * 负责渲染所有连接线和正在绘制的连接线
 */

import { defineComponent, type PropType } from 'vue';
import ConnectionLine from './ConnectionLine';
import type { ConnectionDraft } from '../hooks/useNodeConnection';
import type { ConnectionPosition } from '../hooks/useConnectionPositions';
import type { ConnectionLineStyle } from '../types/canvas-settings';

export default defineComponent({
  name: 'CanvasConnections',
  props: {
    connections: {
      type: Array as PropType<Api.Workflow.Connection[]>,
      required: true
    },
    connectionPositions: {
      type: Map as PropType<Map<string, ConnectionPosition>>,
      required: true
    },
    connectionDraft: {
      type: Object as PropType<ConnectionDraft | null>,
      default: null
    },
    onConnectionClick: {
      type: Function as PropType<(id: string) => void>,
      required: true
    },
    connectionLineStyle: {
      type: Object as PropType<ConnectionLineStyle>,
      required: false,
      default: undefined
    }
  },
  setup(props) {
    return () => (
      <svg
        class="absolute top-0 left-0"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 1,
          pointerEvents: 'none',
          willChange: 'contents' // 提示浏览器优化
        }}
      >
        {/* 已有的连接线 */}
        {props.connections.map(conn => {
          const positions = props.connectionPositions.get(conn.id);
          if (!positions || !positions.source || !positions.target) return null;

          return (
            <ConnectionLine
              key={conn.id}
              connection={conn}
              sourcePos={positions.source}
              targetPos={positions.target}
              onClick={(id: string) => props.onConnectionClick(id)}
              style={props.connectionLineStyle}
            />
          );
        })}

        {/* 正在绘制的连接线 */}
        {props.connectionDraft && (
          <ConnectionLine
            draft={props.connectionDraft}
            style={props.connectionLineStyle}
          />
        )}
      </svg>
    );
  }
});

