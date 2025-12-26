import { defineComponent, computed, ref, type PropType } from 'vue';
import { NCard } from 'naive-ui';
import { NODE_TYPES } from '../nodes/NodeRegistry';

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
    // 计算所有节点的边界
    const bounds = computed(() => {
      if (props.nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
      }

      const NODE_WIDTH = 220;
      const NODE_HEIGHT = 72;
      const PADDING = 100;

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
        minX: minX - PADDING,
        minY: minY - PADDING,
        maxX: maxX + PADDING,
        maxY: maxY + PADDING
      };
    });

    // 计算缩放比例
    const scale = computed(() => {
      const boundsWidth = bounds.value.maxX - bounds.value.minX;
      const boundsHeight = bounds.value.maxY - bounds.value.minY;
      const scaleX = props.width / boundsWidth;
      const scaleY = props.height / boundsHeight;
      return Math.min(scaleX, scaleY, 0.2); // 最大缩放 0.2
    });

    // 转换节点坐标到小地图坐标
    const toMinimapCoords = (x: number, y: number) => {
      return {
        x: (x - bounds.value.minX) * scale.value,
        y: (y - bounds.value.minY) * scale.value
      };
    };

    // 计算视口在小地图中的位置和大小
    const viewportRect = computed(() => {
      // 视口在画布坐标系中的实际大小（考虑缩放）
      const viewportWidth = props.canvasWidth / props.viewport.zoom;
      const viewportHeight = props.canvasHeight / props.viewport.zoom;

      // 视口左上角在画布坐标系中的位置
      const viewportX = -props.viewport.x / props.viewport.zoom;
      const viewportY = -props.viewport.y / props.viewport.zoom;

      // 转换到小地图坐标
      const topLeft = toMinimapCoords(viewportX, viewportY);
      const bottomRight = toMinimapCoords(
        viewportX + viewportWidth,
        viewportY + viewportHeight
      );

      return {
        x: Math.max(0, topLeft.x),
        y: Math.max(0, topLeft.y),
        width: Math.max(0, bottomRight.x - topLeft.x),
        height: Math.max(0, bottomRight.y - topLeft.y)
      };
    });

    // 拖拽状态
    const isDragging = ref(false);

    // 处理小地图交互
    const handleMinimapMouseDown = (e: MouseEvent) => {
      if (!props.onViewportChange) return;
      e.preventDefault();
      isDragging.value = true;
      updateViewportFromMouse(e);
    };

    const handleMinimapMouseMove = (e: MouseEvent) => {
      if (!isDragging.value || !props.onViewportChange) return;
      updateViewportFromMouse(e);
    };

    const handleMinimapMouseUp = () => {
      isDragging.value = false;
    };

    const updateViewportFromMouse = (e: MouseEvent) => {
      if (!props.onViewportChange) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 转换回画布坐标
      const canvasX = bounds.value.minX + x / scale.value;
      const canvasY = bounds.value.minY + y / scale.value;

      // 计算新的视口偏移（使点击位置居中）
      const newViewportX = -canvasX * props.viewport.zoom + props.canvasWidth / 2;
      const newViewportY = -canvasY * props.viewport.zoom + props.canvasHeight / 2;

      props.onViewportChange(newViewportX, newViewportY);
    };

    return () => (
      <div
        class="minimap absolute bottom-4 right-4 z-10"
        style={{
          width: `${props.width}px`,
          height: `${props.height}px`
        }}
      >
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
              cursor: isDragging.value ? 'grabbing' : 'grab'
            }}
            onMousedown={handleMinimapMouseDown}
            onMousemove={handleMinimapMouseMove}
            onMouseup={handleMinimapMouseUp}
            onMouseleave={handleMinimapMouseUp}
          >
            {/* 渲染节点 */}
            {props.nodes.map(node => {
              const pos = toMinimapCoords(node.position.x, node.position.y);
              const NODE_WIDTH = 220;
              const NODE_HEIGHT = 72;
              const width = NODE_WIDTH * scale.value;
              const height = NODE_HEIGHT * scale.value;

              // 从节点注册表获取颜色
              const nodeTypeConfig = NODE_TYPES[node.type];
              const color = nodeTypeConfig?.color || '#94a3b8';

              return (
                <div
                  key={node.id}
                  class="absolute rounded transition-all duration-100"
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${Math.max(width, 2)}px`,
                    height: `${Math.max(height, 2)}px`,
                    background: color,
                    opacity: 0.7,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              );
            })}

            {/* 渲染视口矩形 */}
            <div
              class="absolute border-2 border-blue-500 pointer-events-none transition-all duration-100"
              style={{
                left: `${viewportRect.value.x}px`,
                top: `${viewportRect.value.y}px`,
                width: `${viewportRect.value.width}px`,
                height: `${viewportRect.value.height}px`,
                background: 'rgba(59, 130, 246, 0.15)',
                boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
                borderRadius: '2px'
              }}
            />
          </div>
        </NCard>
      </div>
    );
  }
});

