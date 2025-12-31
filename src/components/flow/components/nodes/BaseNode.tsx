/**
 * Flow 基础节点组件
 *
 * 提供通用的节点容器，支持端口渲染、样式、交互状态等
 */

import { defineComponent, computed, type PropType } from 'vue';
import type { FlowNode, FlowHandle } from '../../types/flow-node';

/**
 * BaseNode 组件属性
 */
export interface BaseNodeProps {
  /** 节点数据 */
  node: FlowNode;
  /** 是否选中 */
  selected?: boolean;
  /** 是否锁定 */
  locked?: boolean;
  /** 是否悬停 */
  hovered?: boolean;
  /** 是否正在拖拽 */
  dragging?: boolean;
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
}

/**
 * 基础节点组件
 *
 * 提供通用的节点容器，子组件可以通过插槽自定义内容
 */
export default defineComponent({
  name: 'BaseNode',
  props: {
    node: {
      type: Object as PropType<FlowNode>,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    },
    locked: {
      type: Boolean,
      default: false
    },
    hovered: {
      type: Boolean,
      default: false
    },
    dragging: {
      type: Boolean,
      default: false
    },
    style: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    class: {
      type: String,
      default: ''
    }
  },
  emits: ['port-mousedown', 'port-mouseup', 'port-mouseenter', 'port-mouseleave'],
  setup(props, { emit, slots }) {
    // ✅ 性能优化：缓存样式对象，避免不必要的重新渲染
    const styleCache = new Map<string, Record<string, any>>();

    // 计算节点样式
    const nodeStyle = computed(() => {
      // ✅ 生成缓存键（包含所有影响样式的状态）
      const cacheKey = `${props.selected}-${props.dragging}-${props.hovered}-${props.locked}-${props.node.size?.width || 150}-${props.node.size?.height || 60}`;

      // ✅ 检查缓存
      const cached = styleCache.get(cacheKey);
      if (cached) {
        return cached; // 返回相同引用，Vue 不会触发重新渲染
      }

      const baseStyle: Record<string, any> = {
        position: 'relative',
        width: props.node.size?.width ? `${props.node.size.width}px` : '150px',
        height: props.node.size?.height ? `${props.node.size.height}px` : '60px',
        cursor: props.locked ? 'not-allowed' : props.dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        pointerEvents: 'auto',
        // 基础节点样式
        backgroundColor: '#ffffff',
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        padding: '12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: '100px',
        minHeight: '40px',
        transition: 'border 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease',
        ...props.node.style,
        ...props.style
      };

      // 选中状态样式
      if (props.selected) {
        baseStyle.border = '2px solid #2080f0';
        baseStyle.boxShadow = '0 0 0 2px rgba(32, 128, 240, 0.2)';
      }

      // 悬停状态样式
      if (props.hovered && !props.selected) {
        baseStyle.borderColor = '#2080f0';
        baseStyle.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }

      // 拖拽状态样式
      if (props.dragging) {
        baseStyle.opacity = 0.8;
      }

      // ✅ 缓存样式对象
      styleCache.set(cacheKey, baseStyle);

      // ✅ 清理旧缓存（防止内存泄漏）
      if (styleCache.size > 50) {
        const keys = Array.from(styleCache.keys());
        for (let i = 0; i < 10; i++) {
          styleCache.delete(keys[i]);
        }
      }

      return baseStyle;
    });

    // 计算节点类名
    const nodeClass = computed(() => {
      const classes = ['flow-node', props.node.class, props.class];

      if (props.selected) classes.push('flow-node-selected');
      if (props.locked) classes.push('flow-node-locked');
      if (props.hovered) classes.push('flow-node-hovered');
      if (props.dragging) classes.push('flow-node-dragging');

      return classes.filter(Boolean).join(' ');
    });

    // 处理端口鼠标事件
    const handlePortMouseDown = (handle: FlowHandle, event: MouseEvent) => {
      if (props.locked) return;
      emit('port-mousedown', props.node.id, handle.id, handle.type, event);
    };

    const handlePortMouseUp = (handle: FlowHandle, event: MouseEvent) => {
      if (props.locked) return;
      emit('port-mouseup', props.node.id, handle.id, handle.type, event);
    };

    const handlePortMouseEnter = (handle: FlowHandle, event: MouseEvent) => {
      emit('port-mouseenter', props.node.id, handle.id, handle.type, event);
    };

    const handlePortMouseLeave = (handle: FlowHandle, event: MouseEvent) => {
      emit('port-mouseleave', props.node.id, handle.id, handle.type, event);
    };

    // 渲染端口
    const renderHandle = (handle: FlowHandle) => {
      if (handle.hidden) return null;

      const handleStyle: Record<string, any> = {
        position: 'absolute',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        border: '2px solid #2080f0',
        cursor: 'crosshair',
        zIndex: 10,
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        ...handle.style
      };

      // 根据端口类型设置不同的颜色
      if (handle.type === 'source') {
        handleStyle.borderColor = '#18a058'; // 绿色表示输出端口
      } else if (handle.type === 'target') {
        handleStyle.borderColor = '#2080f0'; // 蓝色表示输入端口
      }

      // 根据位置计算端口坐标
      const nodeWidth = props.node.size?.width || 220;
      const nodeHeight = props.node.size?.height || 72;

      switch (handle.position) {
        case 'top':
          handleStyle.left = '50%';
          handleStyle.top = '0';
          handleStyle.transform = 'translate(-50%, -50%)';
          break;
        case 'bottom':
          handleStyle.left = '50%';
          handleStyle.bottom = '0';
          handleStyle.transform = 'translate(-50%, 50%)';
          break;
        case 'left':
          handleStyle.left = '0';
          handleStyle.top = '50%';
          handleStyle.transform = 'translate(-50%, -50%)';
          break;
        case 'right':
          handleStyle.right = '0';
          handleStyle.top = '50%';
          handleStyle.transform = 'translate(50%, -50%)';
          break;
      }

      return (
        <div
          class={`flow-handle flow-handle-${handle.type} flow-handle-${handle.position}`}
          style={handleStyle}
          onMousedown={(e: MouseEvent) => handlePortMouseDown(handle, e)}
          onMouseup={(e: MouseEvent) => handlePortMouseUp(handle, e)}
          onMouseenter={(e: MouseEvent) => handlePortMouseEnter(handle, e)}
          onMouseleave={(e: MouseEvent) => handlePortMouseLeave(handle, e)}
          data-handle-id={handle.id}
          data-handle-type={handle.type}
        />
      );
    };

    return () => (
      <div
        class={nodeClass.value}
        style={nodeStyle.value}
        data-node-id={props.node.id}
        data-node-type={props.node.type}
      >
        {/* 默认插槽：节点内容 */}
        {slots.default ? slots.default() : (
          <div
            class="flow-node-content"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div
              class="flow-node-title"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#333333',
                lineHeight: '1.4',
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {props.node.data?.label || props.node.id}
            </div>
            {props.node.data?.description && (
              <div
                class="flow-node-description"
                style={{
                  fontSize: '12px',
                  color: '#666666',
                  marginTop: '4px',
                  lineHeight: '1.3',
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {props.node.data.description}
              </div>
            )}
          </div>
        )}

        {/* 渲染端口 */}
        {props.node.handles?.map(handle => renderHandle(handle))}
      </div>
    );
  }
});

