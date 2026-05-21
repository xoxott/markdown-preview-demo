import { type PropType, computed, defineComponent, onMounted, ref, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import BScroll from '@better-scroll/core';
import type { Options } from '@better-scroll/core';

export default defineComponent({
  name: 'BetterScroll',
  props: {
    /**
     * BetterScroll options
     *
     * @link https://better-scroll.github.io/docs/zh-CN/guide/base-scroll-options.html
     */
    options: {
      type: Object as PropType<Options>,
      required: true
    }
  },
  setup(props, { slots, expose }) {
    const bsWrapper = ref<HTMLElement>();
    const bsContent = ref<HTMLElement>();
    const { width: wrapWidth } = useElementSize(bsWrapper);
    const { width, height } = useElementSize(bsContent);

    const instance = ref<BScroll>();
    const isScrollY = computed(() => Boolean(props.options.scrollY));

    function initBetterScroll() {
      if (!bsWrapper.value) return;
      instance.value = new BScroll(bsWrapper.value, props.options);
    }

    watch([() => wrapWidth.value, () => width.value, () => height.value], () => {
      instance.value?.refresh();
    });

    onMounted(() => {
      initBetterScroll();
    });

    expose({ instance });

    return () => (
      <div ref={bsWrapper} class="h-full text-left">
        <div ref={bsContent} class={['inline-block', !isScrollY.value && 'h-full']}>
          {slots.default?.()}
        </div>
      </div>
    );
  }
});
