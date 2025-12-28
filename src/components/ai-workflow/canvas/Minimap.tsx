import { defineComponent, computed, ref, type PropType } from 'vue';
import { NCard, NButton, NIcon } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { NODE_TYPES } from '../nodes/NodeRegistry';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants/node-dimensions';

const MINIMAP_PADDING = 100;
const MAX_SCALE = 0.2;
const MIN_NODE_SIZE = 2;

export default defineComponent({
  name: 'Minimap',
  props: {
    nodes: {
      type: Array as PropType<Api.Workflow.WorkflowNode[]>,
      required: true
    },
    viewport: {
      type: Object as PropType<{ x: number; y: number; zoom: number }>,
      required: true
    },
    canvasWidth: {
      type: Number,
      required: true
    },
    canvasHeight: {
      type: Number,
      required: true
    },
    width: {
      type: Number,
      default: 200
    },
    height: {
      type: Number,
      default: 150
    },
    onViewportChange: {
      type: Function as PropType<(x: number, y: number) => void>,
      default: undefined
    }
  },
  setup(props) {
    const isDragging = ref(false);
    const isCollapsed = ref(false);

    const bounds = computed(() => {
      if (props.nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      props.nodes.forEach(node => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
        maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
      });

      return {
        minX: minX - MINIMAP_PADDING,
        minY: minY - MINIMAP_PADDING,
        maxX: maxX + MINIMAP_PADDING,
        maxY: maxY + MINIMAP_PADDING
      };
    });

    const scale = computed(() => {
      const boundsWidth = bounds.value.maxX - bounds.value.minX;
      const boundsHeight = bounds.value.maxY - bounds.value.minY;
      const scaleX = props.width / boundsWidth;
      const scaleY = props.height / boundsHeight;
      return Math.min(scaleX, scaleY, MAX_SCALE);
    });

    const toMinimapCoords = (x: number, y: number) => ({
        x: (x - bounds.value.minX) * scale.value,
        y: (y - bounds.value.minY) * scale.value
    });

    const viewportRect = computed(() => {
      const viewportWidth = props.canvasWidth / props.viewport.zoom;
      const viewportHeight = props.canvasHeight / props.viewport.zoom;
      const viewportX = -props.viewport.x / props.viewport.zoom;
      const viewportY = -props.viewport.y / props.viewport.zoom;

      const topLeft = toMinimapCoords(viewportX, viewportY);
      const bottomRight = toMinimapCoords(viewportX + viewportWidth, viewportY + viewportHeight);

      return {
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y
      };
    });

    const updateViewportFromMouse = (e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = Math.max(0, Math.min(props.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(props.height, e.clientY - rect.top));

      const canvasX = bounds.value.minX + x / scale.value;
      const canvasY = bounds.value.minY + y / scale.value;

      const newViewportX = -canvasX * props.viewport.zoom + props.canvasWidth / 2;
      const newViewportY = -canvasY * props.viewport.zoom + props.canvasHeight / 2;

      props.onViewportChange!(newViewportX, newViewportY);
    };

    const handleMinimapMouseDown = (e: MouseEvent) => {
      if (!props.onViewportChange) return;
      e.preventDefault();
      isDragging.value = true;
      updateViewportFromMouse(e);
    };

    const handleMinimapMouseMove = (e: MouseEvent) => {
      if (!isDragging.value) return;
      updateViewportFromMouse(e);
    };

    const handleMinimapMouseUp = () => {
      isDragging.value = false;
    };

    const minimapNodeSize = computed(() => ({
      width: NODE_WIDTH * scale.value,
      height: NODE_HEIGHT * scale.value
    }));

    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value;
    };

    return () => (
      <div
        class="minimap absolute bottom-4 right-4 z-10"
        style={{
          pointerEvents: 'auto'
        }}
      >
        {isCollapsed.value ? (
          // 折叠状态：只显示一个按钮
          <NButton
            circle
            size="small"
            type="primary"
            onClick={toggleCollapse}
            class="shadow-lg"
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(59, 130, 246, 0.95)',
              backdropFilter: 'blur(8px)'
            }}
          >
            {{
              icon: () => (
                <NIcon size={24}>
                  <Icon icon="mdi:map" />
                </NIcon>
              )
            }}
          </NButton>
        ) : (
          // 展开状态：显示完整地图
          <div
            class="relative"
            style={{
              width: `${props.width}px`,
              height: `${props.height}px`
            }}
          >
            {/* 折叠按钮 - 放在外层容器 */}
            <div class="absolute -top-2 -right-2 z-20">
              <NButton
                circle
                size="tiny"
                onClick={toggleCollapse}
                class="shadow-md"
                style={{
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  padding: '0'
                }}
              >
                {{
                  icon: () => (
                    <NIcon size={12}>
                      <Icon icon="mdi:chevron-down" />
                    </NIcon>
                  )
                }}
              </NButton>
            </div>

            <NCard
              size="small"
              class="overflow-hidden shadow-lg"
              contentStyle={{ padding: '0' }}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >

          <div
            class="relative select-none"
            style={{
              width: `${props.width}px`,
              height: `${props.height}px`,
              background: '#f8fafc',
              cursor: isDragging.value ? 'grabbing' : 'grab',
              overflow: 'hidden'
            }}
            onMousedown={handleMinimapMouseDown}
            onMousemove={handleMinimapMouseMove}
            onMouseup={handleMinimapMouseUp}
            onMouseleave={handleMinimapMouseUp}
          >
            {props.nodes.map(node => {
              const pos = toMinimapCoords(node.position.x, node.position.y);
              const nodeTypeConfig = NODE_TYPES[node.type];
              const color = nodeTypeConfig?.color || '#94a3b8';

              return (
                <div
                  key={node.id}
                  class="absolute rounded"
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${Math.max(minimapNodeSize.value.width, MIN_NODE_SIZE)}px`,
                    height: `${Math.max(minimapNodeSize.value.height, MIN_NODE_SIZE)}px`,
                    background: color,
                    opacity: 0.7,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              );
            })}

            <div
              class="absolute border-2 border-blue-500 pointer-events-none"
              style={{
                left: `${viewportRect.value.x}px`,
                top: `${viewportRect.value.y}px`,
                width: `${viewportRect.value.width}px`,
                height: `${viewportRect.value.height}px`,
                background: 'rgba(59, 130, 246, 0.15)',
                boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
                borderRadius: '2px',
                transition: isDragging.value ? 'none' : 'all 0.15s ease-out'
              }}
            />
            </div>
          </NCard>
        </div>
        )}
      </div>
    );
  }
});

