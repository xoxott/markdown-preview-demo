import { defineComponent, type PropType } from 'vue';
import ConnectionLine from './ConnectionLine';
import type { ConnectionDraft } from '../hooks/useNodeConnection';
import type { ConnectionPosition } from '../hooks/useConnectionPositions';
import type { ConnectionLineStyle } from '../types/canvas-settings';

/**
 * CanvasConnections 组件
 *
 * 画布连接线层组件，负责在 AI 工作流画布中渲染所有节点之间的连接线。
 * 该组件作为连接线的容器层，独立于画布的变换（transform），使用屏幕坐标系统。
 *
 * 主要功能：
 * - 渲染已建立的连接线：显示所有已保存的节点连接关系
 * - 渲染草稿连接线：显示正在绘制中的临时连接线预览
 * - 支持连接线样式配置：可自定义连接线的颜色、宽度、类型等
 * - 支持连接线交互：点击连接线可触发删除等操作
 *
 * 技术特性：
 * - 使用 SVG 层独立渲染，不受画布缩放和平移影响
 * - 使用 pointer-events: none 避免拦截鼠标事件
 * - 使用 willChange 提示浏览器优化渲染性能
 * - 自动过滤无效连接（缺少位置信息的连接）
 *
 * @example
 * ```tsx
 * <CanvasConnections
 *   connections={connections}
 *   connectionPositions={connectionPositions}
 *   connectionDraft={connectionDraft}
 *   connectionLineStyle={connectionLineStyle}
 *   onConnectionClick={(id) => handleDeleteConnection(id)}
 * />
 * ```
 */
export default defineComponent({
  name: 'CanvasConnections',
  props: {
    /**
     * 连接线数组
     * 包含所有已建立的节点连接关系
     * 每个连接包含源节点、目标节点、连接类型等信息
     * @required
     */
    connections: {
      type: Array as PropType<Api.Workflow.Connection[]>,
      required: true
    },
    /**
     * 连接线位置映射
     * Map 结构，key 为连接线 ID，value 为连接线的源和目标位置坐标
     * 用于计算连接线的实际渲染位置
     * @required
     */
    connectionPositions: {
      type: Map as PropType<Map<string, ConnectionPosition>>,
      required: true
    },
    /**
     * 草稿连接线数据
     * 正在绘制中的连接线临时数据，包含起始和结束坐标
     * 当用户从输出端口拖拽到输入端口时显示
     * @default null
     */
    connectionDraft: {
      type: Object as PropType<ConnectionDraft | null>,
      default: null
    },
    /**
     * 连接线点击回调函数
     * 当用户点击连接线时触发，通常用于删除连接
     * 参数为连接线的 ID
     * @required
     */
    onConnectionClick: {
      type: Function as PropType<(id: string) => void>,
      required: true
    },
    /**
     * 连接线样式配置
     * 包含连接线的颜色、宽度、类型（直线/曲线）、动画等样式设置
     * 如果未提供，将使用 ConnectionLine 组件的默认样式
     */
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
          overflow: 'visible', // 允许连接线超出画布边界显示
          zIndex: 1, // 确保连接线层在网格之上，节点之下
          pointerEvents: 'none', // 不拦截鼠标事件，让事件穿透到下层
          willChange: 'contents' // 提示浏览器优化，因为内容会频繁变化
        }}
      >
        {/* 渲染所有已建立的连接线 */}
        {props.connections.map(conn => {
          // 从位置映射中获取该连接线的源和目标位置
          const positions = props.connectionPositions.get(conn.id);

          // 如果位置信息不完整，跳过渲染（避免渲染错误）
          if (!positions || !positions.source || !positions.target) {
            return null;
          }

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

        {/* 渲染正在绘制的草稿连接线 */}
        {/* 仅在用户拖拽连接时显示，提供实时视觉反馈 */}
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

