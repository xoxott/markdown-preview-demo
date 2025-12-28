import { defineComponent, computed, type PropType } from 'vue';
import { NIcon, NTag, NButton } from 'naive-ui';
import { Icon } from '@iconify/vue';

/** 节点显示数据 */
export interface NodeData {
  label: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface BaseNodeProps {
  id: string;
  type: Api.Workflow.NodeType;
  data: NodeData;
  selected?: boolean;
  executing?: boolean;
  error?: boolean;
  success?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPortMouseDown?: (nodeId: string, portId: string, type: 'input' | 'output', event: MouseEvent) => void;
}

export default defineComponent({
  name: 'BaseNode',
  props: {
    id: {
      type: String as PropType<string>,
      required: true
    },
    type: {
      type: String as PropType<Api.Workflow.NodeType>,
      required: true
    },
    data: {
      type: Object as PropType<NodeData>,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    },
    executing: {
      type: Boolean,
      default: false
    },
    error: {
      type: Boolean,
      default: false
    },
    success: {
      type: Boolean,
      default: false
    },
    inputs: {
      type: Array as PropType<Api.Workflow.Port[]>,
      default: () => []
    },
    outputs: {
      type: Array as PropType<Api.Workflow.Port[]>,
      default: () => []
    },
    onSelect: {
      type: Function as PropType<(id: string) => void>,
      default: undefined
    },
    onDelete: {
      type: Function as PropType<(id: string) => void>,
      default: undefined
    },
    onPortMouseDown: {
      type: Function as PropType<(nodeId: string, portId: string, type: 'input' | 'output', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseUp: {
      type: Function as PropType<(nodeId: string, portId: string, type: 'input' | 'output', event: MouseEvent) => void>,
      default: undefined
    }
  },
  setup(props, { slots }) {
    const borderColor = computed(() => {
      if (props.error) return '#d03050';
      if (props.success) return '#18a058';
      if (props.executing) return '#2080f0';
      if (props.selected) return '#2080f0';
      return 'transparent';
    });

    const bgColor = computed(() => {
      return props.data.color || '#ffffff';
    });

    const handleDelete = (e: MouseEvent) => {
      e.stopPropagation();
      props.onDelete?.(props.id);
    };

    const handlePortMouseDown = (portId: string, type: 'input' | 'output', event: MouseEvent) => {
      event.stopPropagation();
      props.onPortMouseDown?.(props.id, portId, type, event);
    };

    const handlePortMouseUp = (portId: string, type: 'input' | 'output', event: MouseEvent) => {
      event.stopPropagation();
      props.onPortMouseUp?.(props.id, portId, type, event);
    };

    return () => (
      <div
        class={`workflow-node group ${props.selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          width: '220px',
          height: '72px',
          userSelect: 'none'
        }}
      >
        {/* 输入端口 */}
        {props.inputs && props.inputs.length > 0 && (
          <>
            {props.inputs.map((port, index) => {
              // 使用与连接线完全相同的计算公式
              const portCount = props.inputs!.length;
              const nodeHeight = 72; // NODE_HEIGHT
              const spacing = nodeHeight / (portCount + 1);
              const portCenterY = spacing * (index + 1);

              return (
                <div
                  key={port.id}
                  class="node-port node-port-input hover:scale-125 transition-transform"
                  data-node-id={props.id}
                  data-port-id={port.id}
                  data-port-type="input"
                  onMousedown={(e: MouseEvent) => handlePortMouseDown(port.id, 'input', e)}
                  onMouseup={(e: MouseEvent) => handlePortMouseUp(port.id, 'input', e)}
                  style={{
                    position: 'absolute',
                    left: '0px',
                    top: `${portCenterY}px`,
                    transform: 'translate(-50%, -50%)', // 中心对齐
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: '3px solid #fff',
                    cursor: 'crosshair',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.2s',
                    pointerEvents: 'auto',
                    zIndex: 100
                  }}
                  title={port.label || 'Input'}
                />
              );
            })}
          </>
        )}

        {/* 输出端口 */}
        {props.outputs && props.outputs.length > 0 && (
          <>
            {props.outputs.map((port, index) => {
              // 使用与连接线完全相同的计算公式
              const portCount = props.outputs!.length;
              const nodeHeight = 72; // NODE_HEIGHT
              const spacing = nodeHeight / (portCount + 1);
              const portCenterY = spacing * (index + 1);

              return (
                <div
                  key={port.id}
                  class="node-port node-port-output hover:scale-125 transition-transform"
                  data-node-id={props.id}
                  data-port-id={port.id}
                  data-port-type="output"
                  onMousedown={(e: MouseEvent) => handlePortMouseDown(port.id, 'output', e)}
                  onMouseup={(e: MouseEvent) => handlePortMouseUp(port.id, 'output', e)}
                  style={{
                    position: 'absolute',
                    right: '0px',
                    top: `${portCenterY}px`,
                    transform: 'translate(50%, -50%)', // 中心对齐
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    border: '3px solid #fff',
                    cursor: 'crosshair',
                    boxShadow: '0 2px 8px rgba(245, 87, 108, 0.4)',
                    transition: 'all 0.2s',
                    pointerEvents: 'auto',
                    zIndex: 100
                  }}
                  title={port.label || 'Output'}
                />
              );
            })}
          </>
        )}

        {/* 删除按钮 - 鼠标悬停时显示 */}
        {props.onDelete && (
          <NButton
            size="tiny"
            circle
            type="error"
            onClick={handleDelete}
            class="absolute -top-2 -right-1 z-20 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{
              width: '18px',
              height: '18px',
              minWidth: '18px',
              padding: '0',
              pointerEvents: 'auto'
            }}
          >
            {{
              icon: () => (
                <NIcon size={12}>
                  <Icon icon="mdi:close" />
                </NIcon>
              )
            }}
          </NButton>
        )}

        {/* 节点主体 - 使用自定义div替代NCard以确保尺寸可控 */}
        <div
          class="group-hover:shadow-xl transition-all duration-200"
          style={{
            width: '100%',
            height: '100%',
            borderColor: borderColor.value,
            borderWidth: props.selected ? '3px' : '2px',
            borderStyle: 'solid',
            borderRadius: '12px',
            transition: 'all 0.2s',
            boxShadow: props.selected
              ? '0 8px 24px rgba(32, 128, 240, 0.25), 0 0 0 4px rgba(32, 128, 240, 0.1)'
              : '0 4px 12px rgba(0,0,0,0.08)',
            background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            willChange: props.selected ? 'border-color, box-shadow' : 'auto'
          }}
        >
          <div class="flex items-center gap-3 w-full">
            {/* 图标 */}
            {props.data.icon && (
              <div
                class="flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${bgColor.value}20, ${bgColor.value}10)`,
                  color: bgColor.value,
                  border: `2px solid ${bgColor.value}30`
                }}
              >
                <NIcon size={22}>
                  <Icon icon={props.data.icon} />
                </NIcon>
              </div>
            )}

            {/* 内容 */}
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
                {props.data.label}
              </div>
              {props.data.description && (
                <div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {props.data.description}
                </div>
              )}
            </div>

            {/* 状态指示 */}
            {props.executing && (
              <NTag type="info" size="small" round>
                <template v-slots:icon>
                  <NIcon>
                    <Icon icon="mdi:loading" class="animate-spin" />
                  </NIcon>
                </template>
              </NTag>
            )}
            {props.error && (
              <NTag type="error" size="small" round>
                <template v-slots:icon>
                  <NIcon>
                    <Icon icon="mdi:alert-circle" />
                  </NIcon>
                </template>
              </NTag>
            )}
            {props.success && (
              <NTag type="success" size="small" round>
                <template v-slots:icon>
                  <NIcon>
                    <Icon icon="mdi:check-circle" />
                  </NIcon>
                </template>
              </NTag>
            )}
          </div>

          {/* 自定义内容插槽 */}
          {slots.default?.()}
        </div>
      </div>
    );
  }
});

