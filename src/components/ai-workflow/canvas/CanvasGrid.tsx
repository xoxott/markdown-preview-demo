import { defineComponent, computed, type PropType } from 'vue';

export default defineComponent({
  name: 'CanvasGrid',
  props: {
    size: {
      type: Number as PropType<number>,
      default: 20
    },
    color: {
      type: String as PropType<string>,
      default: '#e5e7eb'
    },
    offsetX: {
      type: Number as PropType<number>,
      default: 0
    },
    offsetY: {
      type: Number as PropType<number>,
      default: 0
    },
    zoom: {
      type: Number as PropType<number>,
      default: 1
    }
  },
  setup(props) {
    const smallPatternSize = computed(() => props.size * props.zoom);
    const largePatternSize = computed(() => props.size * 5 * props.zoom);
    const patternX = computed(() => props.offsetX % smallPatternSize.value);
    const patternY = computed(() => props.offsetY % smallPatternSize.value);
    const largePatternX = computed(() => props.offsetX % largePatternSize.value);
    const largePatternY = computed(() => props.offsetY % largePatternSize.value);

    return () => (
      <svg
        class="canvas-grid"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <defs>
          {/* 小网格点 */}
          <pattern
            id="small-grid-pattern"
            x={patternX.value}
            y={patternY.value}
            width={smallPatternSize.value}
            height={smallPatternSize.value}
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.8" fill={props.color} opacity="0.4" />
          </pattern>

          {/* 大网格线 */}
          <pattern
            id="large-grid-pattern"
            x={largePatternX.value}
            y={largePatternY.value}
            width={largePatternSize.value}
            height={largePatternSize.value}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${largePatternSize.value} 0 L 0 0 0 ${largePatternSize.value}`}
              fill="none"
              stroke={props.color}
              stroke-width="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#small-grid-pattern)" />
        <rect width="100%" height="100%" fill="url(#large-grid-pattern)" />
      </svg>
    );
  }
});

