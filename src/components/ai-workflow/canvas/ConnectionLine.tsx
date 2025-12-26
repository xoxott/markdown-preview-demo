import { defineComponent, computed, type PropType } from 'vue';

export default defineComponent({
  name: 'ConnectionLine',
  props: {
    connection: {
      type: Object as PropType<Api.Workflow.Connection>,
      required: false
    },
    draft: {
      type: Object as PropType<{ startX: number; startY: number; endX: number; endY: number }>,
      required: false
    },
    sourcePos: {
      type: Object as PropType<{ x: number; y: number }>,
      required: false
    },
    targetPos: {
      type: Object as PropType<{ x: number; y: number }>,
      required: false
    },
    selected: {
      type: Boolean,
      default: false
    },
    animated: {
      type: Boolean,
      default: false
    },
    onClick: {
      type: Function as PropType<(id: string) => void>,
      default: undefined
    }
  },
  setup(props) {
    const pathData = computed(() => {
      let x1, y1, x2, y2;

      if (props.draft) {
        x1 = props.draft.startX;
        y1 = props.draft.startY;
        x2 = props.draft.endX;
        y2 = props.draft.endY;
      } else if (props.sourcePos && props.targetPos) {
        x1 = props.sourcePos.x;
        y1 = props.sourcePos.y;
        x2 = props.targetPos.x;
        y2 = props.targetPos.y;
      } else {
        return '';
      }

      // 贝塞尔曲线控制点
      const dx = x2 - x1;
      const controlOffset = Math.abs(dx) * 0.5;

      const cx1 = x1 + controlOffset;
      const cy1 = y1;
      const cx2 = x2 - controlOffset;
      const cy2 = y2;

      return `M ${x1},${y1} C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
    });

    const strokeColor = computed(() => {
      if (props.draft) return 'url(#gradient-draft)';
      if (props.selected) return 'url(#gradient-selected)';
      return '#cbd5e1';
    });

    const strokeWidth = computed(() => {
      if (props.selected) return 3.5;
      if (props.draft) return 3;
      return 2.5;
    });

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      if (props.connection && props.onClick) {
        props.onClick(props.connection.id);
      }
    };

    return () => {
      if (!pathData.value) return null;

      // 正在绘制的连接线不拦截鼠标事件，让事件穿透到端口
      const pointerEvents = props.draft ? 'none' : 'auto';

      return (
        <g class="connection-line" onClick={handleClick} style={{ pointerEvents }}>
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="gradient-draft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="gradient-selected" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#f093fb', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#f5576c', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 透明的宽路径用于更容易点击 */}
          <path
            d={pathData.value}
            stroke="transparent"
            stroke-width="24"
            fill="none"
            style={{ cursor: 'pointer' }}
          />

          {/* 发光效果背景 */}
          {(props.selected || props.draft) && (
            <path
              d={pathData.value}
              stroke={props.draft ? '#667eea' : '#f5576c'}
              stroke-width={strokeWidth.value + 4}
              fill="none"
              stroke-linecap="round"
              opacity="0.3"
              filter="url(#glow)"
            />
          )}

          {/* 实际显示的路径 */}
          <path
            d={pathData.value}
            stroke={strokeColor.value}
            stroke-width={strokeWidth.value}
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={props.animated ? 'animated-line' : ''}
            style={{
              transition: 'all 0.2s',
              filter: props.selected || props.draft ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none'
            }}
          />

          {/* 箭头 */}
          {!props.draft && props.sourcePos && props.targetPos && (
            <marker
              id={`arrowhead-${props.connection?.id || 'draft'}`}
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M0,0 L0,7 L10,3.5 z"
                fill={props.selected ? '#f5576c' : '#94a3b8'}
                style={{ transition: 'fill 0.2s' }}
              />
            </marker>
          )}

          <style>
            {`
              .animated-line {
                stroke-dasharray: 8, 6;
                animation: dash 1.5s linear infinite;
              }
              @keyframes dash {
                to {
                  stroke-dashoffset: -14;
                }
              }
            `}
          </style>
        </g>
      );
    };
  }
});

