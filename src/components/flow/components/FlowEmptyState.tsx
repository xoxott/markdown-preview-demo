/**
 * Flow 空状态组件
 * 
 * 当画布为空时显示的空状态提示
 */

import { defineComponent, type PropType } from 'vue';

/**
 * FlowEmptyState 组件属性
 */
export interface FlowEmptyStateProps {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 是否显示 */
  visible?: boolean;
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
  /** 自定义内容插槽 */
}

/**
 * Flow 空状态组件
 */
export default defineComponent({
  name: 'FlowEmptyState',
  props: {
    title: {
      type: String,
      default: '画布为空'
    },
    description: {
      type: String,
      default: '开始添加节点来构建您的流程图'
    },
    icon: {
      type: String,
      default: undefined
    },
    visible: {
      type: Boolean,
      default: true
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
  setup(props, { slots }) {
    return () => {
      if (!props.visible) {
        return null;
      }

      return (
        <div
          class={`flow-empty-state ${props.class}`}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#94a3b8',
            pointerEvents: 'none',
            ...props.style
          }}
        >
          {slots.default ? (
            slots.default()
          ) : (
            <>
              {props.icon && (
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    opacity: 0.5
                  }}
                >
                  {props.icon}
                </div>
              )}
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#64748b'
                }}
              >
                {props.title}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#94a3b8'
                }}
              >
                {props.description}
              </div>
            </>
          )}
        </div>
      );
    };
  }
});

