import { defineComponent, computed, type PropType } from 'vue';
import { NCard, NIcon, NTag, NButton } from 'naive-ui';
import { Icon } from '@iconify/vue';

export interface BaseNodeProps {
  id: string;
  type: Api.Workflow.NodeType;
  data: Api.Workflow.NodeData;
  selected?: boolean;
  locked?: boolean;
  executing?: boolean;
  error?: boolean;
  success?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleLock?: (id: string) => void;
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
      type: Object as PropType<Api.Workflow.NodeData>,
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
    },
    onToggleLock: {
      type: Function as PropType<(id: string) => void>,
      default: undefined
    }
  },
  setup(props, { slots }) {
    const borderColor = computed(() => {
      if (props.error) return '#d03050';
      if (props.success) return '#18a058';
      if (props.executing) return '#2080f0';
      if (props.selected) return '#2080f0';
      if (props.locked) return '#f59e0b'; // 锁定状态显示橙色边框
      return 'transparent';
    });

    const bgColor = computed(() => {
      return props.data.color || '#ffffff';
    });

    const handleDelete = (e: MouseEvent) => {
      e.stopPropagation();
      props.onDelete?.(props.id);
    };

    const handleToggleLock = (e: MouseEvent) => {
      e.stopPropagation();
      props.onToggleLock?.(props.id);
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
          minWidth: '220px',
          userSelect: 'none'
        }}
      >
        {/* 输入端口 */}
        {props.inputs && props.inputs.length > 0 && (
          <div
            class="node-ports node-inputs"
            style={{
              position: 'absolute',
              left: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 10
            }}
          >
            {props.inputs.map(port => (
              <div
                key={port.id}
                class="node-port node-port-input hover:scale-125 transition-transform"
                data-node-id={props.id}
                data-port-id={port.id}
                data-port-type="input"
                onMousedown={(e: MouseEvent) => handlePortMouseDown(port.id, 'input', e)}
                onMouseup={(e: MouseEvent) => handlePortMouseUp(port.id, 'input', e)}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: '3px solid #fff',
                  cursor: 'crosshair',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.2s',
                  pointerEvents: 'auto', // 确保端口可以接收事件
                  position: 'relative',
                  zIndex: 100 // 确保端口在最上层
                }}
                title={port.label || 'Input'}
              />
            ))}
          </div>
        )}

        {/* 输出端口 */}
        {props.outputs && props.outputs.length > 0 && (
          <div
            class="node-ports node-outputs"
            style={{
              position: 'absolute',
              right: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 10
            }}
          >
            {props.outputs.map(port => (
              <div
                key={port.id}
                class="node-port node-port-output hover:scale-125 transition-transform"
                data-node-id={props.id}
                data-port-id={port.id}
                data-port-type="output"
                onMousedown={(e: MouseEvent) => handlePortMouseDown(port.id, 'output', e)}
                onMouseup={(e: MouseEvent) => handlePortMouseUp(port.id, 'output', e)}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  border: '3px solid #fff',
                  cursor: 'crosshair',
                  boxShadow: '0 2px 8px rgba(245, 87, 108, 0.4)',
                  transition: 'all 0.2s',
                  pointerEvents: 'auto', // 确保端口可以接收事件
                  position: 'relative',
                  zIndex: 100 // 确保端口在最上层
                }}
                title={port.label || 'Output'}
              />
            ))}
          </div>
        )}

        {/* 操作按钮组 */}
        {props.selected && (
          <div
            class="absolute -top-2 -right-2 z-20 flex gap-1"
            style={{ pointerEvents: 'auto' }}
          >
            {/* 锁定/解锁按钮 */}
            {props.onToggleLock && (
              <NButton
                size="tiny"
                circle
                type={props.locked ? 'warning' : 'default'}
                onClick={handleToggleLock}
                class="shadow-lg"
                secondary
              >
                <template v-slots:icon>
                  <NIcon>
                    <Icon icon={props.locked ? 'mdi:lock' : 'mdi:lock-open-variant'} />
                  </NIcon>
                </template>
              </NButton>
            )}

            {/* 删除按钮 */}
            {props.onDelete && !props.locked && (
              <NButton
                size="tiny"
                circle
                type="error"
                onClick={handleDelete}
                class="shadow-lg"
              >
                <template v-slots:icon>
                  <NIcon>
                    <Icon icon="mdi:close" />
                  </NIcon>
                </template>
              </NButton>
            )}
          </div>
        )}

        {/* 节点主体 */}
        <NCard
          size="small"
          bordered
          class="group-hover:shadow-xl transition-all duration-200"
          style={{
            borderColor: borderColor.value,
            borderWidth: props.selected ? '3px' : '2px',
            borderRadius: '12px',
            transition: 'all 0.2s',
            boxShadow: props.selected
              ? '0 8px 24px rgba(32, 128, 240, 0.25), 0 0 0 4px rgba(32, 128, 240, 0.1)'
              : '0 4px 12px rgba(0,0,0,0.08)',
            background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
            // 性能优化：提示浏览器这些属性会变化
            willChange: props.selected ? 'border-color, box-shadow' : 'auto'
          }}
        >
          <div class="flex items-center gap-3">
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
        </NCard>
      </div>
    );
  }
});

