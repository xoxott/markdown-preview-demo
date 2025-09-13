import type { PropType } from 'vue';
import { defineComponent, onMounted, ref } from 'vue';
import type { ScrollConfig } from '../types/mobile';

export const MobileContent = defineComponent({
  name: 'MobileContent',
  props: {
    scrollConfig: {
      type: Object as PropType<ScrollConfig>,
      default: () => ({})
    },
    padding: {
      type: String,
      default: '0'
    },
    backgroundColor: {
      type: String,
      default: 'transparent'
    }
  },
  emits: ['scroll', 'scroll-to-bottom', 'scroll-to-top'],
  setup(props, { emit, slots }) {
    const contentRef = ref<HTMLElement>();
    const isAtTop = ref(true);
    const isAtBottom = ref(false);

    const defaultScrollConfig = {
      enabled: true,
      showScrollbar: false,
      scrollbarWidth: '3px',
      ...props.scrollConfig
    };

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement;
      const { scrollTop, scrollHeight, clientHeight } = target;

      isAtTop.value = scrollTop === 0;
      isAtBottom.value = scrollTop + clientHeight >= scrollHeight - 1;

      emit('scroll', {
        scrollTop,
        scrollHeight,
        clientHeight,
        isAtTop: isAtTop.value,
        isAtBottom: isAtBottom.value
      });

      if (isAtBottom.value) {
        emit('scroll-to-bottom');
      }
      if (isAtTop.value) {
        emit('scroll-to-top');
      }

      defaultScrollConfig.onScroll?.(event);
    };

    const scrollbarStyle = defaultScrollConfig.showScrollbar
      ? `
      .mobile-content::-webkit-scrollbar {
        width: ${defaultScrollConfig.scrollbarWidth};
      }
      .mobile-content::-webkit-scrollbar-track {
        background: transparent;
      }
      .mobile-content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      .mobile-content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    `
      : `
      .mobile-content::-webkit-scrollbar {
        display: none;
      }
    `;

    onMounted(() => {
      if (contentRef.value) {
        const style = document.createElement('style');
        style.textContent = scrollbarStyle;
        document.head.appendChild(style);
      }
    });

    return () => (
      <div
        ref={contentRef}
        class={['mobile-content flex-1', defaultScrollConfig.enabled ? 'overflow-y-auto' : 'overflow-hidden']}
        style={{
          padding: props.padding,
          backgroundColor: props.backgroundColor
        }}
        onScroll={defaultScrollConfig.enabled ? handleScroll : undefined}
      >
        {slots.default?.()}
      </div>
    );
  }
});
