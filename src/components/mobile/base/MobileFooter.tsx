import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { FooterConfig } from '../types/mobile';

export const MobileFooter = defineComponent({
  name: 'MobileFooter',
  props: {
    config: {
      type: Object as PropType<FooterConfig>,
      default: () => ({})
    }
  },
  setup(props, { slots }) {
    const defaultConfig = {
      show: true,
      showHomeIndicator: true,
      backgroundColor: 'transparent',
      height: 'auto',
      padding: '16px',
      ...props.config
    };

    return () => {
      if (!defaultConfig.show) return null;

      return (
        <div
          class="mobile-footer"
          style={{
            backgroundColor: defaultConfig.backgroundColor,
            height: defaultConfig.height,
            padding: defaultConfig.padding
          }}
        >
          {slots.default?.()}

          {defaultConfig.showHomeIndicator && (
            <div class="mt-4 flex justify-center">
              <div class="h-1 w-32 rounded-full bg-black opacity-80" />
            </div>
          )}
        </div>
      );
    };
  }
});
