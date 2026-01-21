/**
 * StreamingText 组件
 * 封装文本流显示和笔的位置追踪，确保位置计算准确
 */
import {
  computed,
  defineComponent,
  ref,
  type CSSProperties,
  type PropType
} from 'vue';
import StreamingPenEffect from './index';

export default defineComponent({
  name: 'StreamingText',
  props: {
    text: {
      type: String,
      default: ''
    },
    isWriting: {
      type: Boolean,
      default: true
    },
    penColor: {
      type: String,
      default: '#92400e'
    },
    size: {
      type: Number,
      default: 24
    },
    offsetX: {
      type: Number,
      default: 0.2
    },
    offsetY: {
      type: Number,
      default: -0.8
    },
    positionChangeThreshold: {
      type: Object as PropType<{ x: number; y: number }>,
      default: () => ({ x: 50, y: 20 })
    },
    transitionDuration: {
      type: Number,
      default: 0.05
    },
    class: {
      type: String,
      default: ''
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    }
  },
  setup(props) {
    const textContainerRef = ref<HTMLElement | null>(null);
    const textSpanRef = ref<HTMLElement | null>(null);

    // 确保容器有定位上下文
    const containerStyle = computed<CSSProperties>(() => ({
      position: 'relative',
      ...props.style
    }));

    return () => (
      <div
        ref={textContainerRef}
        class={props.class}
        style={containerStyle.value}
      >
        <span ref={textSpanRef} style="display: inline-block;">
          {props.text}
        </span>
        <StreamingPenEffect
          isWriting={props.isWriting}
          targetRef={textSpanRef.value}
          penColor={props.penColor}
          size={props.size}
          offsetX={props.offsetX}
          offsetY={props.offsetY}
          positionChangeThreshold={props.positionChangeThreshold}
          transitionDuration={props.transitionDuration}
        />
      </div>
    );
  }
});
